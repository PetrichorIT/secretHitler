Secret Hitler
===
This is a web implementation of the game "Secret Hitler" using node.js, express and html5

## Installation

- node >= v8.x.x
- npm

```bash
$ git clone https://github.com/Unamed001/secretHitler.git
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

### Error Managment

If a Client loses the connection , he/she can reconnect without the waitingMenu up to 30sec after loss of connection.
If he does not what happens depends if the client was still alive. If he was alive (and thus integral to the game) the game saves itself and shuts down, severing connections to all clients. If not, nothing happens and the game goes on (Also then the client can rejoin at any time).

If the game is loaded from a saved state, it continues once all alive player are ready once again.

### Bugs

Be advised its still in very early development, expect a lot of bugs