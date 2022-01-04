import datetime
import pytz
import uuid


def log(s):
    t = datetime.datetime.now(tz=pytz.timezone('Europe/Bratislava')).strftime('%Y-%m-%d %H:%M:%S')
    print(f'[{t}] {s}')

def generate_token():
    return str(uuid.uuid4())
