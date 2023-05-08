import asyncio
import random
from bot import Bot
from bid import Bid
from utils import prob


def nextq(bid, nextv):
    if bid.number == 1:
        return bid.quantity + 1 if nextv == 1 else bid.quantity * 2
    elif nextv > bid.number:
        return bid.quantity
    else:
        return bid.quantity // 2 + 1 if nextv == 1 else bid.quantity + 1

class Hand:
    def __init__(self, dice = None):
        self.dice = [random.randint(1, 6) for _ in range(6)] if dice is None else dice

    def q(self, value):
        return sum(1 for x in self.dice if x==value) + sum(1 for x in self.dice if x==1)

    def normal_value(self):
        return sorted([(self.q(v),v) for v in range(1,7)], key=lambda x: (x[0], random.random()), reverse=True)[0][1]

    def bluff_value(self):
        return sorted([(self.q(v),v) for v in range(1,7)], key=lambda x: (x[0], random.random()))[0][1]

    def size(self):
        return len(self.dice)

class MediumBot(Bot):

    async def play_b(self, q, v):
        self.i_revealed = False
        await self.play_bid(q, v)

    async def play_c(self):
        self.i_challenged = True
        await self.play_challenge()

    async def play_r(self, dice):
        self.i_revealed = True
        await self.play_reveal(dice)

    async def process_game_state(self, state):
        my_hidden_dice = self.my_hidden_dice
        me = state['players'][self.my_index]
        n_dice = sum(x['numberOfDice'] for x in state['players'])
        revealed_dice = []
        for p in state['players']:
            revealed_dice.extend(p['revealedDice'])
        q = state['currentBid']['quantity']
        n = state['currentBid']['number']
        bid = Bid(q, n)
        new_round = q == 0
        if new_round:
            self.i_revealed = False
            self.i_challenged = False
        if me['isCurrentPlayer']:
            my_hand = Hand(my_hidden_dice)
            if new_round or (bid < Bid(max(1, round(n_dice / 6)), 1) and bid < Bid(max(1, round(n_dice / 3)), 2)):
                r = random.random()
                if r < 0.7:
                    value = my_hand.normal_value()
                elif r < 0.8:
                    value = my_hand.bluff_value()
                else:
                    value = random.randint(1, 6)
                if value == 1:
                    await self.play_b(max(1, round(n_dice / 6)), value)
                else:
                    await self.play_b(max(1, round(n_dice / 3)), value)
            else:
                my_sums = [0] * 7
                my_sums2 = [0] * 7
                my_sums3 = [0] * 7
                my_sums4 = [0] * 7
                p2 = [0] * 7
                p3 = [0] * 7
                p4 = [0] * 7
                for i in range(1,7):
                    my_sums[i] = sum(1 for x in my_hidden_dice + revealed_dice if x == i or x == 1)
                    my_sums2[i] = sum(1 for x in my_hidden_dice if x == i or x == 1)
                    my_sums3[i] = sum(1 for x in my_hidden_dice if not (x == i or x == 1))
                    my_sums4[i] = sum(1 for x in revealed_dice if x == i or x == 1) + round(0.88 * len(my_hidden_dice))
                n = n_dice - len(my_hidden_dice) - len(revealed_dice)
                p1 = prob(n, bid.quantity - my_sums[bid.number], bid.number==1)
                for i in range(1,7):
                    p2[i] = prob(n, nextq(bid, i) - my_sums[i], i==1) + random.random() * 1e-06
                    p4[i] = prob(n, nextq(bid, i) - my_sums4[i], i==1) + random.random() * 1e-06
                for i in range(1,7):
                    if my_sums3[i] == 0:
                        continue
                    nn = my_sums3[i]
                    if my_sums2[i] == 0:
                        nn -= 1
                    if nn > 0:
                        p3[i] = prob(n + nn, nextq(bid, i) - my_sums[i], i==1) + random.random() * 1e-06
                if self.i_revealed:
                    r = random.random()
                    i = p2.index(max(p2)) if (min(p2[1:]) < 1e-06 or r < 0.7) else p2.index(min(p2[1:])) if r < 0.8 else random.randint(1, 6)
                    if p4[i] < 0.5:
                        i = p2.index(max(p2))
                    q = nextq(bid, i)
                    if q > n_dice + 1:
                        q = bid.quantity + 1
                        i = bid.number
                    await self.play_b(q, i)
                elif p1 == 0:
                    await self.play_c()
                elif max(p2) > 0.9:
                    r = random.random()
                    i = p2.index(max(p2)) if (min(p2[1:]) < 1e-06 or r < 0.7) else p2.index(min(p2[1:])) if r < 0.8 else random.randint(1, 6)
                    if p4[i] < 0.5:
                        i = p2.index(max(p2))
                    await self.play_b(nextq(bid, i), i)
                elif p1 < 0.1:
                    await self.play_c()
                elif max(p2) > 0.5:
                    r = random.random()
                    i = p2.index(max(p2)) if (min(p2[1:]) < 1e-06 or r < 0.7) else p2.index(min(p2[1:])) if r < 0.8 else random.randint(1, 6)
                    if p4[i] < 0.5:
                        i = p2.index(max(p2))
                    await self.play_b(nextq(bid, i), i)
                elif max(p3) > 0.5:
                    i = p3.index(max(p3))
                    dice = [x for x in my_hidden_dice if x==i or x==1]
                    if not dice:
                        dice = my_hidden_dice[:1]
                    revealed_dice.extend(dice)
                    await self.play_r(dice)
                elif p1 < 0.33:
                    await self.play_c()
                elif max(p3) > 0.4:
                    i = p3.index(max(p3))
                    dice = [x for x in my_hidden_dice if x==i or x==1]
                    if not dice:
                        dice = my_hidden_dice[:1]
                    revealed_dice.extend(dice)
                    await self.play_r(dice)
                elif p1 > 0.99: # avoid feeding dice
                    await self.play_b(bid.quantity + 1, bid.number)
                else:
                    await self.play_c()
