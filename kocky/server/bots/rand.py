import asyncio
import random
from bot import Bot

class RandBot(Bot):

    async def process_game_state(self, state, my_hidden_dice):
        me = next(x for x in state['players'] if x['nickname'] == self.nickname)
        n_dice = sum(x['numberOfDice'] for x in state['players'])
        q = state['currentBid']['quantity']
        n = state['currentBid']['number']
        if me['isCurrentPlayer']:
            if q == 0 or random.random() < 0.5:
                await self.play_bid(q + 1, n)
            else:
                await self.play_challenge()
