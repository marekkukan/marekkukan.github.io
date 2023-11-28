import asyncio
from bot import AbstractBot


class Bot(AbstractBot):

    async def process_game_state(self, state):
        me = state['players'][self.my_index]
        n_dice = sum(x['numberOfDice'] for x in state['players'])
        q = state['currentBid']['quantity']
        n = state['currentBid']['number']
        if me['isCurrentPlayer']:
            if q > n_dice / 3:
                await self.play_challenge()
            else:
                await self.play_bid(q + 1, n)
