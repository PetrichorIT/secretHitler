Secret Hitler
===
This is a web implementation of the game "Secret Hitler" using node.js, express and html5

## Installation

- node >= v8.x.x
- npm

```bash
$ git clone https://github.com/PetrichorIT/secretHitler.git
$ npm install
$ npm run build
$ npm start
```

## The Game
Secret Hitler is a dramatic game of political intrigue and betrayal set in 1930's Germany. Players are secretly divided into two teams - liberals and fascists. Known only to each other, the fascists coordinate to sow distrust and install their cold-blooded leader. The liberals must find and stop the Secret Hitler before it is too late.

## Mechanics
This application must be hosted on a server, which will function as the game master. The game master has all the information about the players, regarding secret role (and so on). 

If a player wants to player a game, he/she must first log into an existing accout or create a new one. There is no email validation or so on, ist just for identification purposes.
Users and sessions are stored in data / auth.json.

Then a player joins a lobby. Lobby come in two types. Either its a blank lobby where anyone can join, or ist a lobby from a saved Gamestate, where only players previously joined can join the lobby. 
> Currently if you try to do this you will be rerouted to login

Upon joining a lobby the client will create a Websocket connection to the Gamemaster and authenticate themself. Then you will see a waiting View waiting until all players (min 5) are ready. If this happens the game will start / continue.

### Main Game Loop

There are three types of events
- Broadcasts
- Semi-Broadcasts
- Direct Messages

Broadcasts are passiv Gamestate updates. They trigger an update at the GameContext, but do not request any reaction by the player. Also they do not initial any client response. They are send to all clients in the current session.

Semi-Broadcasts are requests for actions to all players. There is currently only on occurence, that is "voteChancellor". They require a client response from all active players. They are send to all clients in the current session, except the ones that are dead (and thus only spectating).

Direct Messages are active requests as well as passive updates. The requests contain all gameActions to be performed by one player at a time. The updates include secret data (like roles) that only this one player should know. They are send to one specific client at a time.

## Specs

### Server Side

| Type          | Classification  | Paramters | Description |
|---------------|-----------------|-----------|-------------|
| selectChancellor | Direct Message | ignorePlayers | Send to president, to select from alive (not blocked) players |
| voteChancellor | Direct Message | chancellor | Send to all alive players. to vote for chancellor |
| presidentLaws | Direct Message | cards | Send to president to select laws |
| chancellorLaws | Direct Message | cards | Send to chancellor to select laws |
| selectKill | Direct Message | ignorePlayers | Send to president, select any alive player to be killed |
| kill | Direct Message | | Send to killed player, setting him to spectator mode |
| selectPresident | Direct Message | ignorePlayers | Send to president, to select out of order president |
| selectPlayer_to_inspect | Direct Message | ignorePlayers | Send to president, select any alive player |
| inspectPlayer | Direct Message | player | Send to president, contains partill secret role of other player |
| inspectLaws | Direct Message | laws | Send to president, contains 3 Laws (next one on the pile) |
| role | Direct Message | role, fasho?, hitler? | Send to any player individually, contains full secret role |
| requestReadyForGame | Direct Message |  | Send to any client, if game is paused |
| requestingVeto | Direct Message | | Send to President if Chancellor requested valid veto |
| win | Broadcast | players, fashosWon | Send to all clients, final message of a game |
| abort | Broadcast | | Send to all clients, closes all connections |
| startup | Broadcast |  | Send to prepare client of end of paused state |
| votingEnded | Broadcast | result, results | Send to all clients, ending VotingContext |
| waitingState | Broadcast | users, spectators | Send to all clients, while in paused state |
| localState | Broadcast | players, gameState | Send to all clients, high frequency |
| globalGameState | Broadcast | many... | Send to all clients, low frequency |

### Client side

| Type          | Classification  | Paramters | Description |
|---------------|-----------------|-----------|-------------|
| voteChancellor-response | Direct Message | vote | Sends a players response to voteChancellor, can be changed |
| presidentVeto | Direct Message | veto | Presidents confirms or denies veto request by Chancellor |
| chancellorVeto | Direct Message | | Chancellor requests Veto |
| *select*-response | Direct Message | selection | Sends reponse to a *select* request |

### Error Managment

If a Client loses the connection , he/she can reconnect without the waitingMenu up to 30sec after loss of connection.
If he does not what happens depends if the client was still alive. If he was alive (and thus integral to the game) the game saves itself and shuts down, severing connections to all clients. If not, nothing happens and the game goes on (Also then the client can rejoin at any time).

If the game is loaded from a saved state, it continues once all alive player are ready once again.

### Bugs

Be advised its still in very early development, expect a lot of bugs
