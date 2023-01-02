import datetime
import pytz
import uuid
import functools


def get_time():
    return datetime.datetime.now(tz=pytz.timezone('Europe/Bratislava')).strftime('[%H:%M:%S]')

def log(s):
    t = datetime.datetime.now(tz=pytz.timezone('Europe/Bratislava')).strftime('%Y-%m-%d %H:%M:%S')
    print(f'[{t}] {s}')

def generate_token():
    return str(uuid.uuid4())


WP_DICT = dict()
def set_wp_dict(d):
    global WP_DICT
    WP_DICT = d

def get_wp(dice_tuple, cpi):
    dice_tuple = _rotate(dice_tuple, cpi)
    t = tuple(x for x in dice_tuple if x != 0)
    if t not in WP_DICT:
        return ['%' for _ in dice_tuple]
    v = [_wp2str(x) for x in eval(WP_DICT[t])]
    for i, x in enumerate(dice_tuple):
        if x == 0:
            v.insert(i, '0%')
    return _rotate(v, -cpi)

def _wp2str(wp):
    if wp < 0.1: return '<0.1%'
    if wp > 99.9: return '>99.9%'
    return f'{wp}%'

def _rotate(v, i):
    return v[i:] + v[:i]


@functools.lru_cache(maxsize=None)
def f(n):
    if n <= 1:
        return 1
    return n * f(n-1)

@functools.lru_cache(maxsize=None)
def c(n, k):
    if k > n:
        return 0
    if k == n:
        return 1
    return f(n) // f(k) // f(n-k)

@functools.lru_cache(maxsize=None)
def _p(n, k, ones=False):
    if k < 0:
        return 0
    if k > n:
        return 0
    if ones:
        return c(n, k) * 5**(n-k) / 6**n
    else:
        return c(n, k) * 2**k * 4**(n-k) / 6**n

@functools.lru_cache(maxsize=None)
def prob(n, k, ones=False):
    if k <= 0:
        return 1
    if k > n:
        return 0
    return sum(_p(n, x, ones) for x in range(k, n+1))


def calc_dl(a, b, c, m1, m2, ones=False):
    """Calculates dice loss (EDL - ADL)

    Parameters
    ----------
    a : int
        number of non-hinted dice
    b : int
        how many dice were needed for the bid to be spot on
    c : int
        how many dice actually rolled the bid number
    m1 : int
        challenger's number of dice
    m2 : int
        challengee's number of dice
    ones : bool, optional
        flag indicating whether bid number is 1 (default is False)

    Returns
    -------
    tuple
        dice loss for the challenger and the challengee
    """
    dl_challenger = min(m1, c - b) if c > b else 1 if b == c else 0
    dl_challengee = min(m2, b - c) if b > c else -1 if b == c else 0
    for i in range(a + 1):
        p = _p(a, i, ones)
        dl_challenger -= p * (min(m1, i - b) if i > b else 1 if b == i else 0)
        dl_challengee -= p * (min(m2, b - i) if b > i else -1 if b == i else 0)
    log(f'calc_dl({a}, {b}, {c}, {m1}, {m2}, {ones}) = {-dl_challenger}, {-dl_challengee}')
    return -dl_challenger, -dl_challengee
