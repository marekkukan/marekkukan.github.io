#!/usr/bin/env python3

import asyncio
import websockets
import pathlib
import ssl
import sys
import json
import pickle
import signal
from player import Player
from game import Game
from bot import spawn_bot
from utils import log, generate_token, set_wp_dict

sockets = []
players = []
games = []
bots = []

class MyException(Exception):
    pass

async def enter(socket, message):
    player = None
    try:
        nickname = message[6:]
        if not nickname.isalnum(): raise MyException('nickname must be an alpha-numeric string')
        if nickname in (x.nickname for x in players): raise MyException('nickname already taken')
        token = generate_token()
        log(f'new player: {nickname} (token: {token})')
        player = Player(socket, nickname, token)
        players.append(player)
        await socket.send(f'ENTER_SUCCESS {token}')
        websockets.broadcast(sockets, 'PLAYERS ' + ' '.join(player.nickname for player in players))
        await socket.send('GAMES ' + ' '.join(game.creator.nickname for game in games))
    except MyException as e:
        await socket.send(f'ENTER_ERROR {e}')
    finally:
        return player

async def reconnect(socket, message):
    player = None
    try:
        token = message[10:]
        filtered_players = [player for player in players if player.token == token]
        if len(filtered_players) == 0: raise MyException('invalid token')
        player = filtered_players[0]
        player.socket = socket
        log(f'player {player.nickname} has reconnected (token: {token})')
        await socket.send(f'RECONNECT_SUCCESS')
        websockets.broadcast(sockets, 'PLAYERS ' + ' '.join(player.nickname for player in players))
        await socket.send('GAMES ' + ' '.join(game.creator.nickname for game in games))
    except MyException as e:
        await socket.send(f'RECONNECT_ERROR {e}')
    finally:
        return player

async def leave(player):
    log(f'player {player.nickname} is leaving')
    if player.game is not None:
        if player.game.started:
            player.move.set_result('_SURRENDER')
        else:
            await leave_game(player)
    players.remove(player)
    websockets.broadcast(sockets, 'PLAYERS ' + ' '.join(player.nickname for player in players))

async def join_game(player, message):
    try:
        parts = message.split()
        if len(parts) < 2: raise MyException('missing argument')
        creator_nickname = parts[1]
        password = parts[2] if len(parts) > 2 else ''
        if player.game is not None: raise MyException('player already in a game')
        filtered_games = [game for game in games if game.creator.nickname == creator_nickname]
        if len(filtered_games) == 0: raise MyException('game not found')
        game = filtered_games[-1]
        if game.password != password: raise MyException('incorrect password')
        if game.started or len(game.players) > 6:
            game.spectators.append(player)
            log(f'{player.nickname} joined {creator_nickname}\'s game as spectator')
            await player.socket.send(f'INDEX {player.index}')
            await player.socket.send('GAME_STATE ' + game.state())
        else:
            game.players.append(player)
            log(f'{player.nickname} joined {creator_nickname}\'s game')
            await game.broadcast_state()
        player.game = game
    except MyException as e:
        await player.socket.send(f'JOIN_GAME_ERROR {e}')

async def leave_game(player):
    if player.game is None: return
    log(f'{player.nickname} left {player.game.creator.nickname}\'s game')
    game = player.game
    player.game = None
    if player in game.spectators:
        game.spectators.remove(player)
    elif player in game.players:
        game.players.remove(player)
        player.is_ready = False
        if player == game.creator:
            await game.broadcast('GAME_ABANDONED')
            for player in game.players + game.spectators:
                player.game = None
                player.is_ready = False
            games.remove(game)
            websockets.broadcast(sockets, 'GAMES ' + ' '.join(game.creator.nickname for game in games))
        else:
            await game.broadcast_state()
    else:
        log(f'{player.nickname} not in players nor spectators')
    if game in games and all(x.is_fake or x.is_bot() for x in game.players + game.spectators):
        await game.broadcast('GAME_ABANDONED')
        games.remove(game)
        websockets.broadcast(sockets, 'GAMES ' + ' '.join(game.creator.nickname for game in games))

def start_game(game):
    game.task = asyncio.create_task(game.start())


async def handler(socket, path):
    log('new connection')
    sockets.append(socket)
    try:
        player = None
        async for message in socket:
            if player is None:
                if message.startswith('ENTER '):
                    player = await enter(socket, message)
                elif message.startswith('RECONNECT '):
                    player = await reconnect(socket, message)
                elif message.startswith('_BOT '):
                    token = message[5:]
                    bot, game = next((bot, game) for (bot, game) in bots if bot.token == token)
                    bots.remove((bot, game))
                    player = Player(socket, bot.nickname, bot.token)
                    player.game = game
                    player.game.players.append(player)
                    player.is_ready = True
                    await player.game.broadcast_state()
            else:
                if message == 'LEAVE':
                    await leave(player)
                    player = None
                    break
                if message.startswith('CREATE_GAME'):
                    if player.game is not None: continue
                    log(f'new game (created by {player.nickname})')
                    password = message[12:]
                    game = Game(player, password)
                    games.append(game)
                    player.game = game
                    await game.broadcast_state()
                    websockets.broadcast(sockets, 'GAMES ' + ' '.join(game.creator.nickname for game in games))
                elif message.startswith('JOIN_GAME '):
                    await join_game(player, message)
                elif message.startswith('LEAVE_GAME'):
                    await leave_game(player)
                elif message.startswith('READY'):
                    if player.game is None: continue
                    player.is_ready = not player.is_ready
                    await player.game.broadcast_state()
                    if len(player.game.players) > 1 and all(x.is_ready for x in player.game.players):
                        start_game(player.game)
                elif message.startswith('REMATCH'):
                    if player.game is None: continue
                    if player != player.game.creator: continue
                    if not player.game.started: continue
                    if all(x.is_fake or x.is_bot() for x in player.game.players):
                        if not player.game.task.done():
                            player.game.task.cancel()
                            player.game.finished = True
                            await player.game.broadcast_state()
                            await asyncio.sleep(1.1) # give time to process moves
                        await player.game.restart()
                        start_game(player.game)
                elif message.startswith('GAME_OPTIONS '):
                    if player.game is None: continue
                    if player != player.game.creator: continue
                    options = json.loads(message[13:])
                    player.game.set_options(options)
                    for p in player.game.players:
                        if not 'bot_' in p.nickname:
                            p.is_ready = False
                    await player.game.broadcast_state()
                elif message.startswith('ADD_BOT '):
                    if player.game is None: continue
                    if player != player.game.creator: continue
                    if len(player.game.players) > 6: continue
                    level = message[8:]
                    protocol = 'wss' if port == 443 else 'ws'
                    ssl_context = ssl.create_default_context(ssl.Purpose.CLIENT_AUTH) if port == 443 else None
                    ws = await websockets.connect(f'{protocol}://localhost:{port}', ssl=ssl_context)
                    bot = spawn_bot(ws, level, player.game)
                    bots.append((bot, player.game))
                    asyncio.create_task(bot.run())
                elif message == 'ROLL':
                    await player.revealing
                    await socket.send('ROLL ' + ' '.join(map(str, player.hidden_dice)))
                elif message == 'GAME_STATE' and player.game is not None:
                    await socket.send(f'INDEX {player.index}')
                    await socket.send('GAME_STATE ' + player.game.state())
                elif message == 'GAME_LOG' and player.game is not None and player.game.started:
                    await socket.send('GAME_LOG ' + player.game.log)
                elif message.startswith('BID ') or message.startswith('REVEAL ') or message.startswith('CHALLENGE'):
                    await player.revealing
                    player.move.set_result(message)
                    if message.startswith('REVEAL '):
                        player.revealing = asyncio.Future()
    except websockets.ConnectionClosed:
        pass
    finally:
        sockets.remove(socket)
        if player is not None:
            log(f'lost connection with player {player.nickname}')


async def main():
    global port
    if len(sys.argv) > 1 and sys.argv[1] == 'l':
        # run locally
        ip = 'localhost'
        port = 8765
        ssl_context = None
    else:
        # run on production server
        ip = '0.0.0.0'
        port = 443
        ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        cert_file = pathlib.Path(__file__).with_name('cert.pem')
        ssl_context.load_cert_chain(cert_file)
    async with websockets.serve(handler, ip, port, ssl=ssl_context):
        log(f'listening on {ip} on port {port}')
        await asyncio.Future()

def load_wp():
    log(f'loading win probabilities ..')
    with open('wp.pkl', 'rb') as f:
        set_wp_dict(pickle.load(f))
    log(f'wp loaded successfully')

def load_state():
    log(f'loading state')
    with open('state.json', 'r') as f:
        state = json.load(f)
    for p in state['players']:
        player = Player(None, p['nickname'], p['token'])
        players.append(player)

def save_state():
    log(f'saving state')
    state = {'players': [{
        'nickname': p.nickname,
        'token': p.token,
    } for p in players]}
    with open('state.json', 'w') as f:
        json.dump(state, f)

def signal_handler(signum, frame):
    log(f'received signal {signum}')
    save_state()
    log(f'server shutting down')
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)


if __name__ == "__main__":
    log(f'server starting')
    load_state()
    load_wp()
    asyncio.run(main())
