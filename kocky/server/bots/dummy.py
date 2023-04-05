import asyncio
from bot import Bot


class DummyBot(Bot):

    async def process_game_state(self, state):
        me = state['players'][self.my_index]
        n_dice = sum(x['numberOfDice'] for x in state['players'])
        q = state['currentBid']['quantity']
        n = state['currentBid']['number']
        if me['isCurrentPlayer']:
            await self.play_bid(q + 1, n)
