import asyncio
import websockets
import json
import random
from abc import ABC, abstractmethod
from utils import log, generate_token

class AbstractBot(ABC):

    def __init__(self, socket, nickname, token):
        self.socket = socket
        self.nickname = nickname
        self.token = token
        self.my_hidden_dice = None
        self.my_index = -1
        self.incognito = False
        self.time_left = 0

    def __str__(self):
        return self.nickname

    @abstractmethod
    async def process_game_state(self, state):
        pass

    def get_sleep_time(self):
        return 1 if not self.incognito else min(self.time_left - 1, random.paretovariate(1) * 5 if random.random() < .1 else random.gammavariate(2.5, 4))

    async def play_bid(self, q, n):
        await asyncio.sleep(self.get_sleep_time())
        await self.socket.send(f'BID {q} {n}')

    async def play_reveal(self, dice):
        await asyncio.sleep(max(1, self.get_sleep_time()))
        await self.socket.send('REVEAL ' + ' '.join(map(str, dice)))
        self.my_hidden_dice = None

    async def play_challenge(self):
        await asyncio.sleep(self.get_sleep_time())
        await self.socket.send('CHALLENGE')

    async def run(self):
        try:
            log(f'bot {self} started running')
            await self.socket.send(f'_BOT {self.token}')
            log(f'bot {self} sent connection request')
            async for message in self.socket:
                if message == 'GAME_ABANDONED':
                    break
                elif message == 'GAME_STARTED':
                    self.my_hidden_dice = None
                elif message.startswith('INDEX '):
                    self.my_index = int(message[6:])
                elif message.startswith('ROLL '):
                    self.my_hidden_dice = [int(x) for x in message.split()[1:]]
                    await self.socket.send('GAME_STATE')
                elif message.startswith('GAME_STATE '):
                    state = json.loads(message[11:])
                    if state['started'] and self.my_index != -1:
                        if state['players'][self.my_index]['nickname'].startswith('player_'):
                            self.incognito = True
                        self.time_left = state['players'][self.my_index]['time'] + state['players'][self.my_index]['delay']
                        if self.my_hidden_dice is None:
                            await self.socket.send('ROLL')
                        else:
                            await self.process_game_state(state)
                            if state['finishedRound']:
                                self.my_hidden_dice = None
            log(f'bot {self} is done')
            await self.socket.close()
        except Exception as e:
            print(e)
        finally:
            log(f'bot {self} stopped running')



import bots
from bots import *

def spawn_bot(socket, level, game):
    game.n_bots += 1
    nickname = f'{level}bot_{game.n_bots}'
    token = generate_token()
    if level in bots.__all__:
        return eval(f'bots.{level}.Bot(socket, nickname, token)')
    return bots.dummy.Bot(socket, nickname, token)
