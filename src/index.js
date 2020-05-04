const fs = require('fs');

const express = require('express');
const expressWs = require('express-ws');
const uuidgen = require('uuid').v4;

const { jdb, SyncAdapter } = require('./jdb');
const { print } = require('./logger.js');
const { Game } = require('./Game');

var db = jdb(new SyncAdapter('data/auth.json'));
db.defaults({ sessions: [], users: [] }).write();

/*
Contains Game objects
- sub is a DB to the gamefile
*/
const clients = {};
const games = {};

var app = express();
app.set('view engine', 'ejs');
app.use(express.static('public'));

expressWs(app);

app.get('/', (req, res) => {
	// const resp = [];
	// for (const key in games) {
	// 	console.log(key);
	// 	resp.push({
	// 		id: game.gameid,
	// 		players: clients[game.gameid].length
	// 	});
	// }
	// res.render('pages/home.ejs', { games: resp });
	res.render('pages/home.ejs', { games: [ { id: 001, players: 4 }, { id: 002, players: 2 } ] });
});

// REGISTER

const usernameRegex = /^[a-zA-Z0-9]+([_ -]?[a-zA-Z0-9])*$/;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z]).{8,}$/;

app.get('/register', (req, res) => {
	res.render('pages/register.ejs');
	print('Get', 'root/register <' + req.connection.remoteAddress + '>');
});

app.post('/register', express.json(), (req, res) => {
	const username = req.body.username;
	if (!username) return res.status(400).json({ type: 'error', error: '_missing_username' });
	if (!usernameRegex.test(username)) return res.status(400).json({ type: 'error', error: '_regex_username' });

	const password = req.body.password;
	if (!password) return res.status(400).json({ type: 'error', error: '_missing_password' });
	if (!passwordRegex.test(password)) return res.status(400).json({ type: 'error', error: '_regex_password' });

	if (db.get('users').find({ username }).value())
		return res.status(400).json({ type: 'error', error: '_username_in_use' });

	db.get('users').push({ username, password }).write();
	print('Post', `new user <${username}> created`);
	res.json({ type: 'success' });
});

// LOGIN

app.get('/login', (req, res) => {
	res.render('pages/login.ejs');
	print('Get', 'root/login <' + req.connection.remoteAddress + '>');
});

app.post('/login', (req, res) => {
	if (!req.headers.authorization || req.headers.authorization.indexOf('Basic ') === -1) {
		return res.status(400).json({ type: 'error', error: '_no_auth_header' });
	}

	const base64Credentials = req.headers.authorization.split(' ')[1];
	const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
	const [ username, password ] = credentials.split(':');

	if (!username) return res.status(400).json({ type: 'error', error: '_missing_username' });
	if (!password) return res.status(400).json({ type: 'error', error: '_missing_password' });

	const reqRes = db.get('users').find({ username, password }).value();
	if (!reqRes) return res.status(400).json({ type: 'error', error: '_invalid_credentials' });

	const sid = uuidgen();
	db
		.get('sessions')
		.push({
			sid,
			time: new Date(),
			username
		})
		.write();
	print('Post', `login_comp(${username}) with {${sid}}`);
	res.json({ type: 'success', sid });
});

// GAME

app.get('/:gameid', (req, res) => {
	const gameid = req.params.gameid;

	if (!games[gameid]) {
		const ex = fs.existsSync(`data/${req.params.gameid}.json`);
		if (!ex) return res.status(400).json({ type: 'error', error: 'GameID does not exist' });
		games[gameid] = new Game(gameid);
	}

	res.render('pages/game.ejs', { gameid: req.params.gameid });
	print('Get', `game::${req.params.gameid} <${req.connection.remoteAddress}>`);
});

app.ws('/:gameid', (ws, req) => {
	print('Ws', `game::${req.params.gameid} <${req.connection.remoteAddress}>`);

	const gameid = req.params.gameid;
	let sessionUser;

	const game = games[gameid];
	if (!game) return;

	if (!clients[gameid]) clients[gameid] = [];
	const index = clients[gameid].push(ws) - 1;

	ws.on('message', function(msg) {
		try {
			const obj = JSON.parse(msg);
			switch (obj.type) {
				case 'authenticate':
					const sid = obj.sid;
					if (!sid) return error(ws, '_no_sid');

					sessionUser = db.get('sessions').find({ sid }).value();
					if (!sessionUser) return error(ws, '_invalid_sid');

					print('Ws', 'Player logged into game');
					game.addPlayer(sessionUser, ws);

					break;

				case 'ingame':
					game.recive(sessionUser.username, obj.event);
					break;
			}
		} catch (e) {
			error(ws, e);
		}
	});

	ws.on('close', (_) => {
		clients[gameid].splice(index, 1);
		game.clientLost(sessionUser.username);
		print('Ws', `${gameid} // closed connectionto <${sessionUser.username || 'noauth'}>`);
	});
});

app.all('*', function(req, res) {
	return res.status(404).end('404 - Not Found');
});
app.listen(80, () => console.log('Running at port 80'));

const error = (ws, error) => {
	print('Error', error);
	ws.send(
		JSON.stringify({
			type: 'error',
			error
		})
	);
};
