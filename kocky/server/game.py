import asyncio
import websockets
import random
import json
from bid import Bid, bid2dict
from utils import log


class Game:

    def __init__(self, creator, password):
        self.creator = creator
        self.password = password
        self.players = [creator]
        self.observers = [] #TODO
        self.started = False
        self.finished = False
        self.finished_round = False
        self.cpi = 0

    def state(self):
        state = {
            'finished': self.finished,
            'finishedRound': self.finished_round,
            'currentBid': bid2dict(self.bid),
            'players': [{
                'nickname': player.nickname,
                'bid': bid2dict(player.bid),
                'time': player.time,
                'numberOfDice': player.n_dice,
                'revealedDice': player.revealed_dice,
                'unrevealedDice': player.hidden_dice if self.finished_round else [],
                'isCurrentPlayer': player == self.cp() and not self.finished_round
            } for player in self.players]}
        return json.dumps(state)

    async def broadcast(self, msg):
        websockets.broadcast((x.socket for x in self.players), msg)

    async def broadcast_state(self):
        await self.broadcast('GAME_STATE ' + self.state())

    async def start(self):
        self.started = True
        self.n_players = len(self.players)
        log(f'{self.creator}\'s game has started with {self.n_players} players')
        await self.broadcast('GAME_STARTED')
        random.shuffle(self.players)
        for player in self.players:
            player.n_dice = 6
            # player.hidden_dice = []
            player.revealed_dice = []
            player.time = 600
        while not self.finished:
            await self.play_round()
        await self.broadcast_state()
        for player in self.players:
            player.game = None
        log(f'{self.creator}\'s game has ended')

    def cp(self):
        return self.players[self.cpi]

    def shift_cpi(self):
        self.ppi = self.cpi
        self.cpi = (self.cpi + 1) % len(self.players)
        while self.cp().n_dice <= 0:
            self.cpi = (self.cpi + 1) % len(self.players)

    async def play_round(self):
        await self.broadcast('NEW_ROUND')
        self.finished_round = False
        self.bid = Bid(0, 6)
        for i, p in enumerate(self.players):
            p.revealed_dice = []
            p.roll()
            p.bid = None
        self.n_dice = sum(p.n_dice for p in self.players)
        await self.broadcast_state()
        await self.eval_move(await self.cp().play(), challenge_possible=False)
        while not self.finished and not self.finished_round:
            self.shift_cpi()
            await self.broadcast_state()
            await self.eval_move(await self.cp().play())

    async def eval_move(self, move, challenge_possible=True, reveal_possible=True):
        parts = move.split(' ')
        if parts[0] == 'BID':
            try:
                bid = Bid(int(parts[1]), int(parts[2]))
                assert 1 <= bid.number <= 6
                assert bid > self.bid
                assert bid.quantity <= self.n_dice + 1
            except:
                await self.eval_move(await self.invalid_move(move), challenge_possible, reveal_possible)
                return
            self.bid = bid
            self.cp().bid = bid
            await self.broadcast('PLAYER_BIDS ' + self.cp().nickname + ' ' + str(bid))
        elif parts[0] == 'REVEAL':
            try:
                assert reveal_possible
                assert len(parts) > 1
                dice = [int(x) for x in parts[1:]]
                hidden_dice = self.cp().hidden_dice.copy()
                for die in dice:
                    hidden_dice.remove(die)
            except:
                await self.eval_move(await self.invalid_move(move), challenge_possible, reveal_possible)
                return
            for die in dice:
                self.cp().hidden_dice.remove(die)
                self.cp().revealed_dice.append(die)
            self.cp().roll()
            await self.broadcast_state()
            await self.broadcast('PLAYER_REVEALS ' + self.cp().nickname + ' ' + ' '.join(parts[1:]))
            await self.eval_move(await self.cp().play(), False, False)
        elif parts[0] == 'CHALLENGE':
            if not challenge_possible:
                await self.eval_move(await self.invalid_move(move), challenge_possible, reveal_possible)
                return
            self.finished_round = True
            await self.broadcast('PLAYER_CHALLENGES ' + self.cp().nickname)
            await self.broadcast_state()
            await asyncio.sleep(4 * (self.n_players - 1))
            for i in range(self.n_players):
                await self.broadcast('PLAYER_HAD ' + self.cp().nickname + ' ' + ' '.join(str(x) for x in self.cp().hidden_dice))
                self.shift_cpi()
            all_dice = []
            for p in self.players:
                all_dice.extend(p.revealed_dice)
                all_dice.extend(p.hidden_dice)
            diff = self.bid.quantity - sum([1 for die in all_dice if die == self.bid.number or die == 1])
            if diff < 0:
                self.cp().n_dice += diff
            elif diff > 0:
                self.players[self.ppi].n_dice -= diff
                self.cpi = self.ppi
            else:
                self.cp().n_dice -= 1
                self.players[self.ppi].n_dice += 1
            await self.check_if_loses()
        elif parts[0] == '_BID+1':
            if self.bid.quantity > self.n_dice:
                await self.eval_move('_SURRENDER')
            else:
                bid = Bid(self.bid.quantity + 1, self.bid.number)
                self.bid = bid
                self.cp().bid = bid
                await self.broadcast('PLAYER_BIDS ' + self.cp().nickname + ' ' + str(bid))
        elif parts[0] == '_SURRENDER':
            self.finished_round = True
            self.cp().n_dice = 0
            await self.check_if_loses()
            await asyncio.sleep(4)
        else:
            await self.eval_move(await self.invalid_move(move), challenge_possible, reveal_possible)

    async def check_if_loses(self):
        if self.cp().n_dice <= 0:
            self.cp().n_dice = 0
            self.cp().hidden_dice = []
            self.n_players -= 1
            # await self.cp().socket.send('YOU_LOSE')
            self.shift_cpi()
            if self.n_players < 2:
                self.finished = True
                self.winner = self.cp()
                # await self.cp().socket.send('YOU_WIN')

    async def invalid_move(self, move):
        log('invalid move by player ' + self.cp().nickname + ' (' + move + ')')
        try:
            await self.cp().socket.send('INVALID_MOVE')
        except websockets.ConnectionClosed:
            pass
        new_move = await self.cp().play()
        return new_move
