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
        self.move = asyncio.Future()
        self.bid = None
        self.time = 600

    def __str__(self):
        return self.nickname

    def roll(self):
        self.hidden_dice = [random.randint(1, 6) for _ in
                            range(self.n_dice - len(self.revealed_dice))]

    async def play(self):
        # await self.socket.send('PLAY ' + ' '.join(str(x) for x in self.hidden_dice))
        t = time.time()
        try:
            move = await asyncio.wait_for(self.move, timeout=self.time + 15)
        except asyncio.TimeoutError:
            move = '_BID+1'
        self.move = asyncio.Future()
        dt = int(time.time() - t)
        self.time -= max(0, dt - 15)
        if self.time < 0: self.time = 0
        log(f'player {self} took {dt}s to make move {move}')
        return move
