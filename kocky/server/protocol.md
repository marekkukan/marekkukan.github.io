## client -> server

 | message | meaning |
 | --- | --- |
 | `ENTER nickname` | enter lobby as `nickname` |
 | `RECONNECT token` | reconnect using my `token` |
 | `LEAVE` | leave lobby |
 | `CREATE_GAME [password]` | create a game with password `password` |
 | `JOIN_GAME nickname [password]` | join game created by `nickname` with password `password` |
 | `LEAVE_GAME` | leave the game |
 | `START_GAME` | start the game |
 | `ROLL` | roll my dice |
 | `BID 8 6` | bid eight sixes |
 | `CHALLENGE` | challenge |
 | `REVEAL 1 1 6` | reveal two ones and one six |

## server -> client

| message | recipient(s) | meaning |
| --- | --- | --- |
| `ENTER_SUCCESS token` | specific player | successfully entered the lobby, your token is `token` |
| `ENTER_ERROR error` | specific player | couldn't enter the lobby because of `error` |
| `RECONNECT_SUCCESS` | specific player | successfully reconnected |
| `RECONNECT_ERROR error` | specific player | couldn't reconnect because of `error` |
| `PLAYERS a b c` | everyone | players `a`, `b` and `c` are currently online |
| `GAMES a b c` | everyone | games created by `a`, `b` and `c` are currently open |
| `PLAYERS_IN_GAME a b c` | everyone in this game | players `a`, `b` and `c` are in this game |
| `JOIN_GAME_SUCCESS` | specific player | successfully joined the game |
| `JOIN_GAME_ERROR error` | specific player | couldn't join the game because of `error` |
| `GAME_ABANDONED` | everyone in this game | game is canceled (creator has left) |
| `GAME_STARTED` | everyone in this game | game has started |
| `GAME_STATE <json>` | everyone in this game | current state of the game |
| `ROLL 5 2 1 2` | specific player | you rolled `5 2 1 2` |
| `INVALID_MOVE` | specific player | you played an invalid move |

### game state yaml example

```yaml
finished: false
finishedRound: false
currentBid:
    quantity: 8
    number: 6
players:
  - nickname: alice
    bid:
        quantity: 8
        number: 6
    time: 120
    delay: 15
    numberOfDice: 6
    revealedDice: [1, 1, 6]
    unrevealedDice: []
    isCurrentPlayer: false
  - nickname: bob
    bid:
        quantity: 4
        number: 1
    time: 88
    delay: 4
    numberOfDice: 5
    revealedDice: []
    unrevealedDice: []
    isCurrentPlayer: true
```
