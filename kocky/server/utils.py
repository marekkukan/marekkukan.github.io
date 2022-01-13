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
