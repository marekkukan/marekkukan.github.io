import asyncio
import random
import copy
import math
from bot import AbstractBot
from bid import Bid
from utils import prob

Q_mindde = [0,0.17,0.33,0.5,0.67,0.85,1.06,1.28,1.52,1.77,2.03,2.28,2.54,2.8,3.07,3.34,3.61,3.89,4.16,4.44,4.71,4.99,5.27,5.56,5.84]
Q_maxdde = [0,1,1.44,1.89,2.36,2.83,3.27,3.69,4.11,4.52,4.94,5.35,5.75,6.15,6.55,6.94,7.34,7.73,8.12,8.51,8.9,9.29,9.67,10.05,10.44]
Q_nondde = [0,0.17,0.39,0.68,0.99,1.3,1.6,1.91,2.22,2.53,2.85,3.17,3.48,3.79,4.11,4.42,4.74,5.06,5.38,5.7,6.02,6.34,6.66,6.99,7.3]

def epsilon():
    return random.random() * 1e-06

def rb(c):
    return random.random() < c

def sigmoid(x, c1=1, c2=0):
    return 1 / (1 + math.e ** (-c1 * (x - c2)))

def nextq(bid, nextn):
    if bid.number == 1:
        return bid.quantity + 1 if nextn == 1 else bid.quantity * 2
    elif nextn > bid.number:
        return bid.quantity
    else:
        return bid.quantity // 2 + 1 if nextn == 1 else bid.quantity + 1

def dd(dice, number):
    return sum(1 for x in dice if x==number) + sum(1 for x in dice if x==1)

class Hand:
    def __init__(self, dice = None):
        self.dice = [random.randint(1, 6) for _ in range(6)] if dice is None else dice
        self.size = len(self.dice)
        self.n_minddr = sorted([(dd(self.dice,n),n) for n in range(1,7)], key=lambda x: (x[0], random.random()))[0][1]
        self.n_maxddr = sorted([(dd(self.dice,n),n) for n in range(1,7)], key=lambda x: (x[0], random.random()), reverse=True)[0][1]
        self.q_mindd = min(dd(self.dice,n) for n in range(1,7))
        self.q_maxdd = max(dd(self.dice,n) for n in range(1,7))
        self.q_mindde = Q_mindde[self.size]
        self.q_maxdde = Q_maxdde[self.size]

class Bot(AbstractBot):

    async def play_b(self, q, n):
        self.n_bids += 1
        self.i_revealed = False
        if not n == self.n_bluffed:
            self.n_bluffed = 0
        await self.play_bid(q, n)

    async def play_c(self):
        await self.play_challenge()

    async def play_r(self, dice):
        self.n_bids = 0
        self.i_revealed = True
        await self.play_reveal(dice)

    async def process_game_state(self, state):
        my_hidden_dice = self.my_hidden_dice
        me = state['players'][self.my_index]
        players = [p for p in state['players'] if p['numberOfDice'] > 0]
        if me not in players or len(players) <= 1: return
        i = players.index(me)
        players = players[i:] + players[:i]
        dices = [p['numberOfDice'] for p in players]
        next_player = players[1]
        n_dice = sum(x['numberOfDice'] for x in state['players'])
        revealed_dice = []
        for p in state['players']:
            revealed_dice.extend(p['revealedDice'])
        q = state['currentBid']['quantity']
        n = state['currentBid']['number']
        bid = Bid(q, n)
        new_round = q == 0
        self.current_player = next((p for p in players if p['isCurrentPlayer']), None)
        if self.current_player is None: return
        if state['finished']: return
        if new_round:
            self.n_bids = 0
            self.n_bluffed = 0
            self.i_revealed = False
            self.previous_player = None
            self.my_players = copy.deepcopy(players)
            for p in self.my_players:
                n = p['numberOfDice'] - len(p['revealedDice'])
                p['ev'] = [0, n/6, n/3, n/3, n/3, n/3, n/3]
                p['revealed'] = 0
                p['uncertainty'] = 1
        elif not state['finishedRound']:
            cp = next(p for p in self.my_players if p['nickname'] == self.current_player['nickname'])
            pp = next(p for p in self.my_players if p['nickname'] == self.previous_player['nickname'])
            if pp['nickname'] == next_player['nickname']:
                pp['bidNumber'] = bid.number
            if cp['nickname'] == pp['nickname']:
                # evaluate REVEAL
                n = len(cp['revealedDice'])
                new_revealed_dice = self.current_player['revealedDice'][n:]
                cp['revealedDice'] += new_revealed_dice
                cp['revealed'] = max(new_revealed_dice) if len(new_revealed_dice) > 1 else 1
                self.previous_bid = bid
                n = cp['numberOfDice'] - len(cp['revealedDice'])
                cp['ev'] = [0, n/6, n/3, n/3, n/3, n/3, n/3]
            else:
                # evaluate previous player bid
                pp['uncertainty'] = 1
                if pp['revealed'] not in [1, bid.number] or bid.quantity > nextq(self.previous_bid, bid.number):
                    eq = sum(p['ev'][bid.number] for p in self.my_players if p['nickname'] != cp['nickname'] and p['nickname'] != pp['nickname'])
                    n = cp['numberOfDice'] - len(cp['revealedDice'])
                    cpev = cp['ev'][bid.number]
                    if cpev <= n / (6 if bid.number == 1 else 3):
                        cpev = Q_mindde[n] / (2 if bid.number == 1 else 1)
                    cpev = (2 * (Q_mindde[n] / (2 if bid.number == 1 else 1)) + 1 * (cp['ev'][bid.number])) / 3
                    eq += cpev
                    eq += sum(1 for x in revealed_dice if x == bid.number or x == 1)
                    rq = bid.quantity - eq
                    if rq > pp['ev'][bid.number]:
                        n = pp['numberOfDice'] - len(pp['revealedDice'])
                        pp['ev'] = [0, n/6] + [n/3 if bid.number == 1 else Q_nondde[n]] * 5
                        pp['ev'][bid.number] = min(n, (Q_maxdde[n] / (2 if bid.number == 1 else 1) + rq) / 2)
                elif bid.number == self.previous_bid.number:
                    pp['uncertainty'] = 0
                pp['revealed'] = 0
        if me['isCurrentPlayer']:
            self.my_hand = Hand(my_hidden_dice)
            if new_round:
                bid = max(Bid(0, 6), Bid(min((self.my_hand.size - 1) * (len(players) - 1), round(n_dice / 3) - 1), 6))
            my_sums = [0] * 7
            my_sums2 = [0] * 7
            my_sums3 = [0] * 7
            my_sums4 = [0] * 7
            p2 = [0] * 7
            p3 = [0] * 7
            p4 = [0] * 7
            ev = [0] * 7
            d2 = [0] * 7
            d3 = [0] * 7
            n = self.my_hand.size
            d0 = [0, n/6, n/3, n/3, n/3, n/3, n/3]
            for i in range(1,7):
                my_sums[i] = sum(1 for x in my_hidden_dice + revealed_dice if x == i or x == 1)
                my_sums2[i] = sum(1 for x in my_hidden_dice if x == i or x == 1)
                my_sums3[i] = sum(1 for x in my_hidden_dice if not (x == i or x == 1))
                my_sums4[i] = sum(1 for x in revealed_dice if x == i or x == 1) + round(0.88 * len(my_hidden_dice))
                ev[i] = my_sums[i] + sum(p['ev'][i] for p in self.my_players if p['nickname'] != me['nickname'])
                d0[i] = my_sums2[i] - d0[i]
            d1 = bid.quantity - ev[bid.number]
            n = n_dice - len(my_hidden_dice) - len(revealed_dice)
            p1 = prob(n, bid.quantity - my_sums[bid.number], bid.number==1)
            p0 = prob(self.my_hand.size, my_sums2[bid.number], bid.number==1)
            for i in range(1,7):
                p2[i] = prob(n, nextq(bid, i) - my_sums[i], i==1) + random.random() * 1e-06
                p4[i] = prob(n, nextq(bid, i) - my_sums4[i], i==1) + random.random() * 1e-06
                d2[i] = nextq(bid, i) - ev[i]
                d3[i] = nextq(bid, i) - ev[i]
            for i in range(1,7):
                if my_sums3[i] == 0:
                    continue
                nn = my_sums3[i]
                if my_sums2[i] == 0:
                    nn -= 1
                if nn > 0:
                    p3[i] = prob(n + nn, nextq(bid, i) - my_sums[i], i==1) + random.random() * 1e-06
                    d3[i] -= nn / (6 if i == 1 else 3)
            mc = sigmoid(d1, 2, 0.5)
            mb1 = [sigmoid(-x, 4, -0.3) for x in d2[1:]]
            mb2 = [sigmoid(-x, 4, 1) for x in d2[1:]]
            # lower the willingness to bid the same number as the next player bid, unless d0 is high
            if 'bidNumber' in self.my_players[1]:
                n = self.my_players[1]['bidNumber']
                if d0[n] < 0.5:
                    mb1[n - 1] /= 3
                    mb2[n - 1] /= 8
            if self.n_bids > 0 and self.n_bluffed > 0 and rb(0.5):
                n = self.n_bluffed
                if nextq(bid, n) <= ev[n] - self.my_players[1]['ev'][n] + self.my_hand.size:
                    mb1[n - 1] = 0.9
                    mb2[n - 1] = 0.1
                    self.n_bluffed = n
            elif self.n_bids == 0 and min(my_sums2[1:]) == 0 and rb(0.1 if self.i_revealed else 0.5):
                n = random.choice([x for x in range(1,7) if my_sums2[x] == 0])
                if nextq(bid, n) <= ev[n] - self.my_players[1]['ev'][n] + self.my_hand.size:
                    mb1[n - 1] = 0.9
                    mb2[n - 1] = 0.1
                    self.n_bluffed = n
            cr = sigmoid(-max(mb1), 10, -0.5)
            mr = [cr * sigmoid(-x, 3) for x in d3[1:]]
            # lower the willingness to reveal before I bid
            if self.n_bids == 0:
                mr = [x / 2 for x in mr]

            if me['numberOfDice'] == 1:
                mr = [0] * 6
                mb2 = [0] * 6
                mb1n = mb1[bid.number-1]
                mb1 = [0] * 6
                if my_hidden_dice[0] in [1, bid.number]:
                    mc, mb1[bid.number-1] = 0.01, 1
                else:
                    mc, mb1[bid.number-1] = (2*mc + mb1n) / 3, (mc + 2*mb1n) / 3
                if bid.quantity >= n_dice:
                    mb1 = [0] * 6
                if bid < Bid(1, 6):
                    mc, mb1 = 0, [0] * 5 + [1]

            if new_round:
                mc = 0
                mr = [0] * 6
            if self.i_revealed:
                mc = 0
                mr = [0] * 6
                if self.my_hand.size < 3:
                    mb2 = [0] * 6
                if self.n_revealed in [bid.number, 1] or self.q_revealed > 1:
                    mb1[self.n_revealed - 1] = 1
            elif p1 == 1:
                mc = 0
            elif p1 == 0:
                mb1 = [0] * 6
                mb2 = [0] * 6
                mr = [0] * 6
            # forbid REVEAL if I'd be left with no dice to re-roll
            for i in range(6):
                if my_sums3[i+1] == 0:
                    mr[i] = 0
            if self.my_hand.size == 1:
                mr = [0] * 6

            s = mc + sum(mb1) + sum(mb2) + sum(mr)
            if s == 0:
                await self.play_b(bid.quantity + 1, bid.number)
            else:
                uncertainty = sum(p['uncertainty'] for p in self.my_players if p['nickname'] != me['nickname'])
                v = [x + epsilon() for x in mb1 + mb2 + mr] + [mc]
                mi = random.choices(range(19), v)[0] if uncertainty > 0 else v.index(max(v))
                n = mi % 6 + 1
                if mi // 6 == 0:
                    await self.play_b(nextq(bid, n), n)
                elif mi // 6 == 1:
                    await self.play_b(nextq(bid, n) + 1, n)
                elif mi // 6 == 2:
                    dice = [x for x in my_hidden_dice if x == n or x == 1]
                    if not dice:
                        dice = my_hidden_dice[:1]
                    self.n_revealed = n
                    self.q_revealed = len(dice)
                    await self.play_r(dice)
                else:
                    await self.play_c()
        self.previous_player = self.current_player
