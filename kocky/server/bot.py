import asyncio
import websockets
import json
from abc import ABC, abstractmethod
from utils import log, generate_token

class Bot(ABC):

    def __init__(self, socket, nickname, token):
        self.socket = socket
        self.nickname = nickname
        self.token = token
        self.my_hidden_dice = None

    def __str__(self):
        return self.nickname

    @abstractmethod
    async def process_game_state(self, state, my_hidden_dice):
        pass

    async def play_bid(self, q, n):
        await asyncio.sleep(1)
        await self.socket.send(f'BID {q} {n}')

    async def play_reveal(self, dice):
        await asyncio.sleep(1)
        await self.socket.send('REVEAL ' + ' '.join(map(str, dice)))
        self.my_hidden_dice = None

    async def play_challenge(self):
        await asyncio.sleep(1)
        await self.socket.send('CHALLENGE')

    async def run(self):
        try:
            log(f'bot {self} started running')
            await self.socket.send(f'_BOT {self.token}')
            log(f'bot {self} sent connection request')
            async for message in self.socket:
                if message == 'GAME_ENDED' or message == 'GAME_ABANDONED':
                    break
                elif message.startswith('ROLL '):
                    self.my_hidden_dice = [int(x) for x in message.split()[1:]]
                    await self.socket.send('GAME_STATE')
                elif message.startswith('GAME_STATE '):
                    state = json.loads(message[11:])
                    if state['started']:
                        if self.my_hidden_dice is None:
                            await self.socket.send('ROLL')
                        else:
                            await self.process_game_state(state, self.my_hidden_dice)
                            if state['finishedRound']:
                                self.my_hidden_dice = None
            log(f'bot {self} is done')
            await self.socket.close()
        except Exception as e:
            print(e)
        finally:
            log(f'bot {self} stopped running')



import bots.dummy
import bots.easy
import bots.rand
import bots.medium

def spawn_bot(socket, level, game):
    game.n_bots += 1
    nickname = f'{level}bot_{game.n_bots}'
    token = generate_token()
    if level == 'dummy':
        return bots.dummy.DummyBot(socket, nickname, token)
    if level == 'easy':
        return bots.easy.EasyBot(socket, nickname, token)
    if level == 'rand':
        return bots.rand.RandBot(socket, nickname, token)
    if level == 'medium':
        return bots.medium.MediumBot(socket, nickname, token)
    return bots.dummy.DummyBot(socket, nickname, token)
