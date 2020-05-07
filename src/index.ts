import fs from 'fs';
import { v4 } from 'uuid';
import express from 'express';
import expressWs from 'express-ws';
import ws from 'ws';
import bcrypt from 'bcrypt';
import cookieParser from 'cookie-parser';

import { jdb, SyncAdapter } from './jdb';
import print from './logger';
import Game from './Game';

const db = jdb(new SyncAdapter('data/auth.json'));
db.defaults({ sessions: [], users: [] }).write();
// const validSessions = db.get('sessions').value();
// db
// 	.set(
// 		'sessions',
// 		validSessions.filter((v: any) => {
// 			return new Date().getTime() - new Date(v.time).getTime() < 60 * 24 * 1000;
// 		})
// 	)
// 	.write();

// console.log(validSessions);
const clients: { [key: string]: ws[] } = {};
const games: { [key: string]: Game } = {};
// const gameBlueprints = fs.readdirSync('data/games');

const app = expressWs(express()).app;
app.set('view engine', 'ejs');
app.use(express.static('public'));

app.get('/', cookieParser(), (req, res) => {
	fs.readdir('data/games', (err, gameBlueprints) => {
		const gameOverviews: { id: string; isOn: boolean; data: any | undefined }[] = [];
		gameBlueprints.forEach((gameBp) => {
			gameOverviews.push({ id: gameBp.substring(0, gameBp.length - 5), isOn: false, data: undefined });
		});
		for (const key in games) {
			if (games.hasOwnProperty(key)) {
				const game = games[key];

				const index = gameOverviews.findIndex((v) => v.id === game.id);
				if (index === -1) {
					gameOverviews.push({ id: game.id, isOn: true, data: { players: game.players.length } });
				} else {
					gameOverviews[index].isOn = true;
					gameOverviews[index].data = { players: game.players.length };
				}
			}
		}
		const session = db.get('sessions').find({ sid: req.cookies['sh.connect.sid'] }).value();
		if (!session) {
			return res.redirect('/login');
		}
		res.render('pages/home.ejs', { games: gameOverviews, username: session.username });
	});
});

app.get('/new', cookieParser(), (req, res) => {
	const session = db.get('sessions').find({ sid: req.cookies['sh.connect.sid'] }).value();
	if (!session) {
		return res.redirect('/login');
	}
	res.render('pages/new.ejs');
});

app.post('/new', cookieParser(), express.json(), express.urlencoded({ extended: true }), (req, res) => {
	const session = db.get('sessions').find({ sid: req.cookies['sh.connect.sid'] }).value();
	if (!session) {
		return res.redirect('/login');
	}

	console.log(req.headers);

	const gameTitle = req.body.gameTitle;
	fs.writeFile('data/games/' + gameTitle + '.json', '{}', (err) => {
		if (err) return res.end(err);
		res.redirect('/' + gameTitle);
	});
});

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

	bcrypt.hash(password, 10, (err, hash) => {
		if (err) throw err;

		db.get('users').push({ username, password: hash }).write();
		print('Post', `new user <${username}> created`);
		res.json({ type: 'success' });
	});
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

	const reqRes = db
		.get('users')
		.find((u) => {
			return bcrypt.compareSync(password, u.password) && u.username === username;
		})
		.value();

	// const reqRes = db.get('users').find({ username, password }).value();
	if (!reqRes) return res.status(400).json({ type: 'error', error: '_invalid_credentials' });

	const sid = v4();
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
		const ex = fs.existsSync(`data/games/${req.params.gameid}.json`);
		if (!ex) return res.status(400).json({ type: 'error', error: 'GameID does not exist' });
		games[gameid] = new Game(gameid, (won) => {
			delete games[gameid];
			if (clients[gameid]) {
				clients[gameid].forEach((c) => {
					c.close();
				});
				clients[gameid] = [];
				if (won) {
					fs.unlinkSync('data/games/' + gameid + '.json');
				}
			}
		});
	}

	res.render('pages/game.ejs', { gameid: req.params.gameid });
	print('Get', `game::${req.params.gameid} <${req.connection.remoteAddress}>`);
});

app.ws('/:gameid', (ws, req) => {
	print('Ws', `game::${req.params.gameid} <${req.connection.remoteAddress}>`);

	const gameid = req.params.gameid;
	let sessionUser: { sid: string; time: Date; username: string };

	const game: Game = games[gameid];
	if (!game) return;

	if (!clients[gameid]) clients[gameid] = [];
	const index = clients[gameid].push(ws) - 1;

	ws.on('message', function(msg: any) {
		try {
			const obj = JSON.parse(msg);
			switch (obj.type) {
				case 'authenticate':
					const sid = obj.sid;
					if (!sid) return error(ws, '_no_sid');

					sessionUser = db.get('sessions').find({ sid }).value();
					if (!sessionUser) return error(ws, '_invalid_sid');

					print('Ws', 'Player logged into game');
					ws.send(JSON.stringify({ type: 'whoami', username: sessionUser.username }));
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
		if (!sessionUser) return;
		if (!sessionUser.username) return;
		game.clientLost(sessionUser.username);
		print('Ws', `${gameid} // closed connectionto <${sessionUser.username || 'noauth'}>`);
	});
});

app.all('*', function(req, res) {
	return res.status(404).end('404 - Not Found');
});

let PORT = process.env.PORT || 80;
app.listen(PORT, () => console.log('Running at port 80'));

const error = (ws: ws, error: string) => {
	print('Error', error);
	ws.send(
		JSON.stringify({
			type: 'error',
			error
		})
	);
};
