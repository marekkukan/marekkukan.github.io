import datetime
import pytz
import uuid


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
