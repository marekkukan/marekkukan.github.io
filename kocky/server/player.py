import asyncio
import websockets
import random
import time
from utils import log


class Player:

    def __init__(self, socket, nickname, token):
        self.socket = socket
        self.nickname = nickname
        self.token = token
        self.game = None
        self.n_dice = 6
        self.hidden_dice = []
        self.revealed_dice = []
        self.hinted_dice = [False] * 7
        self.move = asyncio.Future()
        self.bid = None
        self.time = 0
        self.delay = 0
        self.is_my_turn = False
        self.is_ready = False
        self.is_fake = False
        self.wp = '%'
        self.luck = 0
        self.luck_diff = 0
        self.index = -1
        self.revealing = asyncio.Future()
        self.revealing.set_result(None)

    def __str__(self):
        return self.nickname

    def roll(self):
        self.hidden_dice = [random.randint(1, 6) for _ in
                            range(self.n_dice - len(self.revealed_dice))]
        self.hinted_dice = [False] * 7

    async def play(self, previous_move_invalid = False):
        # await self.socket.send('PLAY ' + ' '.join(str(x) for x in self.hidden_dice))
        self.is_my_turn = True
        self.turn_start_time = time.time()
        if not previous_move_invalid:
            self.delay = self.game.delay
        try:
            move = await asyncio.wait_for(self.move, timeout=self.time + self.delay)
        except asyncio.TimeoutError:
            move = '_BID+1'
        finally:
            self.move = asyncio.Future()
        t = time.time() - self.turn_start_time
        self.delay -= t
        if self.delay < 0:
            self.time += self.delay
            self.delay = 0
        if self.time < 0:
            self.time = 0
        log(f'player {self} took {round(t, 1)}s to make move {move}')
        self.is_my_turn = False
        return move

    def get_current_time(self):
        if not self.is_my_turn:
            return int(self.time)
        else:
            t = time.time() - self.turn_start_time
            return int(self.time - max(0, t - self.delay))

    def get_current_delay(self):
        if not self.is_my_turn:
            return self.game.delay
        else:
            t = time.time() - self.turn_start_time
            return int(max(0, self.delay - t))

    def is_bot(self):
        return '_' in self.nickname
