import asyncio
import websockets
import random
import json
import copy
from bid import Bid, bid2dict
from utils import log, get_time

DICE_DICT = {1: '⚀', 2: '⚁', 3: '⚂', 4: '⚃', 5: '⚄', 6: '⚅'}


class Game:

    def __init__(self, creator, password):
        self.creator = creator
        self.password = password
        self.players = [creator]
        self.spectators = []
        self.started = False
        self.finished = False
        self.finished_round = False
        self.cpi = 0
        self.log = ''
        self.minutes_per_game = 10
        self.seconds_per_turn = 15
        self.starting_number_of_dice = 6
        self.snodenl = False
        self.random_order = True
        self.n_bots = 0

    def set_options(self, options):
        self.minutes_per_game = options['minutesPerGame']
        self.seconds_per_turn = options['secondsPerTurn']
        self.starting_number_of_dice = options['startingNumberOfDice']
        self.snodenl = options['startingNumberOfDiceEqualsNicknameLength']
        self.random_order = options['randomOrder']

    def get_options(self):
        return {
            'minutesPerGame': self.minutes_per_game,
            'secondsPerTurn': self.seconds_per_turn,
            'startingNumberOfDice': self.starting_number_of_dice,
            'startingNumberOfDiceEqualsNicknameLength': self.snodenl,
            'randomOrder': self.random_order
        }

    def state(self):
        state = {
            'started': self.started,
            'finished': self.finished,
            'finishedRound': self.finished_round,
            'currentBid': bid2dict(self.bid),
            'players': [{
                'nickname': player.nickname,
                'bid': bid2dict(player.bid),
                'time': player.get_current_time(),
                'delay': player.get_current_delay(),
                'numberOfDice': player.n_dice,
                'revealedDice': player.revealed_dice,
                'unrevealedDice': player.hidden_dice if self.finished_round else [],
                'isCurrentPlayer': player == self.cp() and not self.finished_round
            } for player in self.players]
        } if self.started else {
            'started': self.started,
            'players': [{
                'nickname': player.nickname,
                'isReady': player.is_ready
            } for player in self.players],
            'options': self.get_options()
        }
        return json.dumps(state)

    async def broadcast(self, msg):
        receivers = set(x for x in self.players if not x.is_fake).union(self.spectators)
        websockets.broadcast((x.socket for x in receivers), msg)

    async def broadcast_state(self):
        await self.broadcast('GAME_STATE ' + self.state())

    async def record(self, message, dice_table = ''):
        record = dice_table + get_time() + ' ' + self.cp().nickname + ' ' + message + '<br>'
        self.log = record + self.log
        await self.broadcast('GAME_LOG_RECORD ' + record)

    async def start(self):
        self.started = True
        self.n_players = len(self.players)
        log(f'{self.creator}\'s game has started with {self.n_players} players')
        await self.broadcast('GAME_STARTED')
        if self.random_order:
            random.shuffle(self.players)
        self.time = 60 * self.minutes_per_game
        self.delay = self.seconds_per_turn
        for player in self.players:
            player.n_dice = len(player.nickname) if self.snodenl else self.starting_number_of_dice
            player.revealed_dice = []
            player.time = self.time
            player.is_ready = False
        while not self.finished:
            await self.play_round()
        await self.broadcast_state()
        await self.broadcast('GAME_ENDED')
        log(f'{self.creator}\'s game has ended')

    def cp(self):
        return self.players[self.cpi]

    def shift_cpi(self):
        self.ppi = self.cpi
        self.cpi = (self.cpi + 1) % len(self.players)
        while self.cp().n_dice <= 0:
            self.cpi = (self.cpi + 1) % len(self.players)

    async def play_round(self):
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
            await self.broadcast('PLAYER_BIDS')
            await self.record('bids ' + str(bid.quantity) + DICE_DICT[bid.number])
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
            await self.broadcast('PLAYER_REVEALS')
            await self.record('reveals ' + ' '.join(DICE_DICT[x] for x in dice))
            await self.eval_move(await self.cp().play(), False, False)
        elif parts[0] == 'CHALLENGE':
            if not challenge_possible:
                await self.eval_move(await self.invalid_move(move), challenge_possible, reveal_possible)
                return
            self.finished_round = True
            await self.broadcast_state()
            dice_table = '<br><pre>'
            for i in range(self.n_players):
                dice_table += f'{self.cp().nickname.ljust(12)}{" ".join(DICE_DICT[x] for x in self.cp().revealed_dice + self.cp().hidden_dice)}<br>'
                self.shift_cpi()
            dice_table += '</pre><br>'
            await self.broadcast('PLAYER_CHALLENGES')
            await self.record('challenges', dice_table)
            await asyncio.sleep(max(5, 0.7 * self.n_dice))
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
                await self.broadcast('PLAYER_BIDS')
                await self.record('bids ' + str(bid.quantity) + DICE_DICT[bid.number])
        elif parts[0] == '_SURRENDER':
            self.finished_round = True
            self.cp().n_dice = 0
            await self.record('surrenders')
            await self.check_if_loses()
            await asyncio.sleep(4)
        else:
            await self.eval_move(await self.invalid_move(move), challenge_possible, reveal_possible)

    async def check_if_loses(self):
        if self.cp().n_dice <= 0:
            self.cp().n_dice = 0
            self.cp().hidden_dice = []
            self.n_players -= 1
            await self.record('lost')
            self.deactivate_player()
            self.shift_cpi()
            if self.n_players < 2:
                self.finished = True
                await self.record('won')
                self.deactivate_player()

    async def invalid_move(self, move):
        log('invalid move by player ' + self.cp().nickname + ' (' + move + ')')
        try:
            await self.cp().socket.send('INVALID_MOVE')
        except websockets.ConnectionClosed:
            pass
        new_move = await self.cp().play(previous_move_invalid=True)
        return new_move

    def deactivate_player(self):
        """
            Replace current player (who just lost) with a fake player, so that one can see
            that this player was in the game, but the player no longer receives game states.
        """
        self.spectators.append(self.cp())
        fake_player = copy.copy(self.cp())
        fake_player.hidden_dice = []
        fake_player.revealed_dice = []
        fake_player.is_fake = True
        self.players[self.cpi] = fake_player
