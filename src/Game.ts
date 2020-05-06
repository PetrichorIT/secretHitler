import print from './logger';
import { jdb, SyncAdapter, Wrapper } from './jdb';

const TIMEOUT = 30 * 1000;
const GameStates = {
	/*interrupted: 0,*/ invalid: 1,
	startup: 2,
	nextPresident: 3,
	selectChancellor: 4,
	voteChancellor: 5,
	presidentLaws: 6,
	chancellorLaws: 7,
	veto: 8,
	applyLaws: 9,
	selectKill: 10,
	selectPresident: 11,
	inspectPlayer: 12,
	inspectLaws: 13
};
Object.freeze(GameStates);

type EventType = { type: string; [key: string]: any };

export class Game {
	id: string;
	abortHandler: () => void;

	blocked: boolean;
	paused: boolean;
	players: any[];

	// State Management
	gameState: number;

	drawPile: boolean[] = [];
	discardPile: boolean[] = [];
	fashoLaws: any[] = [];
	liberalLaws: any[] = [];

	noGovermentCounter: number = 0;

	previousPresident: number | null = null;
	previousChancellor: number | null = null;

	currentPresident: number = 0;
	currentChancellor: number | null = null;

	candiateChancellor: number | null = null;

	currentSelection: any | null = null;
	currentSelectorName: string | null = null;

	db: Wrapper | null = null;

	constructor(id: string, abortHandler: () => void) {
		this.abortHandler = abortHandler;
		this.paused = true;
		this.blocked = false;
		this.id = id;
		this.players = [];
		this.gameState = GameStates.invalid;

		// DEBUG - not included
		// this.load();
	}

	// IO

	private save() {
		if (this.db === null) {
			this.db = jdb(new SyncAdapter('data/games/' + this.id + '.json'));
		}

		const gameData: any = {
			gameState: this.gameState,
			drawPile: this.drawPile,
			discardPile: this.discardPile,
			fashoLaws: this.fashoLaws,
			liberalLaws: this.liberalLaws,
			noGovermentCounter: this.noGovermentCounter,
			previousPresident: this.previousChancellor,
			previousChancellor: this.previousChancellor,
			currentPresident: this.currentPresident,
			currentChancellor: this.currentChancellor,
			currentSelection: this.currentSelection,
			currentSelectorName: this.currentSelectorName,
			id: this.id,
			players: this.players.map((p) => {
				return {
					name: p.name,
					role: p.role,
					localState: p.localState,
					color: p.color,
					image: p.image,
					lastEvent: p.lastEvent
				};
			})
		};

		this.db.set('timestamp', new Date()).write();
		this.db.set('gamedata', gameData).write();
	}

	private load() {
		if (this.db === null) {
			this.db = jdb(new SyncAdapter('data/games/' + this.id + '.json'));
		}

		const gameData = this.db.get('gamedata').value();
		if (!gameData) return;

		this.gameState = gameData.gameState;
		this.drawPile = gameData.drawPile;
		this.discardPile = gameData.discardPile;
		this.fashoLaws = gameData.fashoLaws;
		this.liberalLaws = gameData.liberalLaws;
		this.noGovermentCounter = gameData.noGovermentCounter;
		this.previousPresident = gameData.previousChancellor;
		this.previousChancellor = gameData.previousChancellor;
		this.currentPresident = gameData.currentPresident;
		this.currentChancellor = gameData.currentChancellor;
		this.currentSelection = gameData.currentSelection;
		this.currentSelectorName = gameData.currentSelectorName;
		this.players = gameData.players.map((p: any) => {
			return {
				name: p.name,
				role: p.role,
				localState: p.localState,
				image: p.image,
				color: p.color,
				lastEvent: p.lastEvent,
				client: null
			};
		});

		this.paused = true;

		this.tryUpdateState();
	}

	// Main Game Loop

	private tryUnpause(action: () => any) {
		if (this.players.length < 2) return;
		for (const player of this.players) {
			if (player.localState) return;
		}

		this.paused = false;
		action();
	}

	private tryStart() {
		this.gameState = GameStates.startup;

		const roles = roleDistributions[Object.keys(this.players).length];
		roles.sort(() => Math.random() - 0.5);
		colors.sort(() => Math.random() - 0.5);
		images.sort(() => Math.random() - 0.5);

		for (let i = 0; i < roles.length; i++) {
			this.players[i].role = roles[i];
			this.players[i].color = colors[i];
			this.players[i].image = images[i];
			this.send(this.players[i], { type: 'role', role: roles[i] });
		}

		this.drawPile = lawCards;
		this.drawPile.sort(() => Math.random() - 0.5);

		this.discardPile = [];

		this.fashoLaws = [];
		this.liberalLaws = [];
		this.noGovermentCounter = 0;

		this.previousPresident = null;
		this.previousChancellor = null;

		this.currentSelection = null;
		this.currentSelectorName = null;

		this.currentPresident = 0;
		this.currentChancellor;
		this.broadcast({ type: 'startup' });
		this.boradcastGameState();
		this.tryUpdateState();
	}

	private tryUpdateState() {
		if (this.paused) {
			if (this.gameState === GameStates.invalid) {
				this.tryUnpause(() => this.tryStart());
			} else {
				this.tryUnpause(() => {
					this.broadcast({ type: 'startup' });
					this.boradcastGameState();
					this.tryUpdateState();
				});
			}
			return;
		}

		switch (this.gameState) {
			case GameStates.startup:
				print('Game', '#' + this.id + ' Startup');
				print(
					'Game',
					'#' +
						this.id +
						' Players: ' +
						this.players.map((v) => {
							return v.name;
						})
				);
				this.currentPresident = Math.floor(Math.random() * this.players.length) - 1;
				this.gameState = GameStates.nextPresident;
				this.tryUpdateState();
				break;

			case GameStates.nextPresident:
				this.currentPresident = this.currentPresident + 1;
				if (this.currentPresident === this.players.length) this.currentPresident = 0;
				print('Game', '#' + this.id + ' selectingNewPresident: ' + this.currentPresident);

				const ignorePlayers = [ this.previousPresident, this.previousChancellor, this.currentPresident ].filter(
					(v) => v !== null
				);

				print('Game', '#' + this.id + ' selectingNewChancellor: not(' + ignorePlayers + ')');

				this.players[this.currentPresident].localState = true;
				this.gameState = GameStates.selectChancellor;
				this.currentSelectorName = this.players[this.currentPresident].name;

				this.boradcastGameState();
				this.send(this.players[this.currentPresident], { type: 'selectChancellor', ignorePlayers });
				break;

			case GameStates.selectChancellor:
				print('Game', '#' + this.id + ' selectedNewChancellor: ' + this.currentSelection);

				this.candiateChancellor = this.currentSelection;
				this.gameState = GameStates.voteChancellor;
				this.currentSelection = {};
				for (let i = 0; i < this.players.length; i++) {
					this.players[i].localState = true;
				}

				this.broadcastLocalState();
				this.broadcast({ type: 'voteChancellor', chancellor: this.candiateChancellor });
				break;

			case GameStates.voteChancellor:
				if (Object.keys(this.currentSelection).length < this.players.length) return;

				let pro = 0;
				let con = 0;
				let presidentsVote = true;

				for (const name in this.currentSelection) {
					if (this.currentSelection.hasOwnProperty(name)) {
						const vote = this.currentSelection[name];
						if (vote) {
							pro += 1;
						} else {
							con += 1;
						}
						if (name === this.players[this.currentPresident].name) {
							presidentsVote = vote;
						}
					}
				}

				if (pro > con || (pro == con && presidentsVote)) {
					print('Game', '#' + this.id + " Vote for '" + this.candiateChancellor + ' successfull');

					this.currentChancellor = this.candiateChancellor;

					this.blocked = true;
					this.broadcast({ type: 'votingEnded', result: true, results: this.currentSelection });
					this.boradcastGameState();

					setTimeout(() => {
						this.blocked = false;
						if (this.players[this.currentChancellor!].role.isHitler && this.fashoLaws.length >= 3) {
							return this.win(true);
						}

						// Check if 3 Cards are avaliabe
						if (this.drawPile.length < 3) {
							this.discardPile.sort(() => Math.random() - 0.5);
							for (const card of this.discardPile) {
								this.drawPile.push(card);
							}
							this.discardPile = [];
						}

						// REAL
						const cards = [];
						cards.push(this.drawPile.shift());
						cards.push(this.drawPile.shift());
						cards.push(this.drawPile.shift());

						this.currentSelection = null;
						this.gameState = GameStates.presidentLaws;
						this.players[this.currentPresident].localState = true;
						this.broadcastLocalState();
						this.send(this.players[this.currentPresident], { type: 'presidentLaws', cards });
					}, 3500);
				} else {
					print('Game', '#' + this.id + " Vote for '" + this.currentChancellor + ' failed');
					this.gameState = GameStates.nextPresident;
					this.currentChancellor = null;
					this.blocked = true;

					this.broadcast({ type: 'votingEnded', result: false, results: this.currentSelection });
					setTimeout(() => {
						this.blocked = false;
						this.tryUpdateState();
					}, 3500);
				}
				break;
			case GameStates.presidentLaws:
				if (this.currentSelection === null) return;
				if (this.currentChancellor === null) return;
				this.discardPile.push(this.currentSelection.revoked[0]);

				this.gameState = GameStates.chancellorLaws;
				this.players[this.currentChancellor!].localState = true;

				this.broadcastLocalState();
				this.send(this.players[this.currentChancellor!], {
					type: 'chancellorLaws',
					cards: this.currentSelection.selected
				});
				this.currentSelection = null;

				break;

			case GameStates.presidentLaws:
				if (this.currentSelection === null) return;
				if (this.currentChancellor === null) return;
				this.discardPile.push(this.currentSelection.revoked[0]);

				if (this.currentSelection.selected[0]) {
					this.fashoLaws.push(true);
				} else {
					this.liberalLaws.push(true);
				}

				// EFFECTS

				break;
		}
	}

	private win(fashosWon: boolean) {
		this.paused = true;
		const exportPlayers = [];
		for (let i = 0; i < this.players.length; i++) {
			exportPlayers.push({
				id: i,
				name: this.players[i].name,
				color: this.players[i].color,
				role: this.players[i].role
			});
		}
		this.broadcast({
			type: 'win',
			players: exportPlayers,
			fashosWon
		});
	}

	private broadcastLocalState() {
		this.broadcast({ type: 'localState', players: this.players.map((v) => v.localState) });
	}

	private boradcastGameState() {
		if (this.paused) return;

		const exportPlayers = [];
		for (let i = 0; i < this.players.length; i++) {
			exportPlayers.push({
				id: i,
				name: this.players[i].name,
				color: this.players[i].color,
				image: this.players[i].image
			});
		}

		this.broadcast({
			type: 'globalGameState',
			players: exportPlayers,
			currentChancellor: this.currentChancellor,
			currentPresident: this.currentPresident,
			previousChancellor: this.previousChancellor,
			previousPresident: this.previousPresident,
			fashoLaws: this.fashoLaws,
			liberalLaws: this.liberalLaws,
			drawPile: this.drawPile.length,
			discardPile: this.discardPile.length,
			noGovermentCounter: this.noGovermentCounter
		});
		this.broadcastLocalState();
	}

	private broadcast(event: EventType) {
		for (const player of this.players) {
			this.send(player, event);
		}
	}

	private send(player: any, event: EventType) {
		if (player.client === null) return;
		player.client.send(JSON.stringify({ type: 'ingame', event }));
		if (event.type !== 'globalGameState' && event.type !== 'localState' && event.type !== 'waitingState') {
			player.lastEvent = event;
		}
	}

	// Helpers

	addPlayer(player: any, client: any) {
		let index = this.players.findIndex((p) => p.name === player.username);
		if (index >= 0) {
			this.reconnectClient(index, client);
		} else {
			// New Join
			if (this.gameState !== GameStates.invalid) throw new Error('Canno Join');
			this.players.push({ name: player.username, client, localState: true });
			index = this.players.length - 1;
		}
		// Prepare for readystate
		if (this.paused) {
			let index = this.players.findIndex((p) => p.name === player.username);
			this.sendWaitingState();
			this.send(this.players[index], { type: 'requestReadyForGame' });
		}
	}

	private reconnectClient(index: number, client: any) {
		this.players[index].client = client;
		if (this.paused) {
			this.players[index].localState = true;
		}

		const lastEvent = this.players[index].lastEvent;
		this.send(this.players[index], { type: 'role', role: this.players[index].role });
		this.boradcastGameState();

		if (lastEvent) {
			if (this.gameState === GameStates.voteChancellor && lastEvent.type === 'voteChancellor') {
				this.send(this.players[index], lastEvent);
			}
			if (this.gameState === GameStates.selectChancellor && lastEvent.type === 'selectChancellor') {
				this.send(this.players[index], lastEvent);
			}
			if (this.gameState === GameStates.selectPresident && lastEvent.type === 'selectPresident') {
				this.send(this.players[index], lastEvent);
			}
			if (this.gameState === GameStates.presidentLaws && lastEvent.type === 'presidentLaws') {
				this.send(this.players[index], lastEvent);
			}

			if (this.gameState === GameStates.chancellorLaws && lastEvent.type === 'chancellorLaws') {
				this.send(this.players[index], lastEvent);
			}
		}
	}

	private sendWaitingState() {
		const users = [];
		for (const player of this.players) {
			users.push({ name: player.name, localState: player.localState });
		}
		this.broadcast({ type: 'waitingState', users });
	}

	clientLost(username: string) {
		let index = this.players.findIndex((p) => p.name === username);
		if (index === -1) return;

		this.save();
		this.players[index].client = null;
		setTimeout(() => {
			if (!this.players[index]) return;
			if (this.players[index].client === null) {
				this.players.splice(index, 1);
				this.abort();
			}
		}, TIMEOUT);
	}

	private abort() {
		this.broadcast({ type: 'abort' });
		this.abortHandler();
	}

	recive(username: string, event: any) {
		if (this.blocked === true) return;
		if (this.paused) {
			if (event.type === 'readyForGame') {
				let index = this.players.findIndex((p) => p.name === username);
				this.players[index].localState = false;
				this.sendWaitingState();
				this.tryUpdateState();
			}
			return;
		}
		switch (event.type) {
			case 'selectedChancellor':
				if (username !== this.currentSelectorName)
					return print('Game', '#' + this.id + ' selectedChancellor: personMissmatch');
				this.currentSelection = event.selection;
				this.players[this.currentPresident].localState = false;
				this.broadcastLocalState();
				this.tryUpdateState();
				break;
			case 'votedChancellor':
				print('Game', '#' + this.id + ' Vote: ' + event.vote + ' by ' + username);
				this.currentSelection[username] = event.vote;
				this.players.find((p) => p.name == username).localState = false;
				this.broadcastLocalState();
				this.tryUpdateState();
				break;
			case 'presidentLawsSelected':
				print('Game', '#' + this.id + ' presidentLaws:' + event.selected + ' - ' + event.revoked);
				this.currentSelection = { revoked: event.revoked, selected: event.selected };
				this.players[this.currentPresident].localState = false;
				this.broadcastLocalState();
				this.tryUpdateState();
				break;
			case 'chancellorLawsSelected':
				print('Game', '#' + this.id + ' chancellorLaws:' + event.selected + ' - ' + event.revoked);
				this.currentSelection = { revoked: event.revoked, selected: event.selected };
				this.players[this.currentChancellor!].localState = false;
				this.broadcastLocalState();
				this.tryUpdateState();
				break;
		}
	}
}

/*

players: [Player]

{
    localState: working | waiting = true | false
    client: WebSocket
    color: Color
    role?: {
        isFasho: Bool
        isHitler: Bool
    }
}

*/

// Bool is Fasho
const lawCards = [ true, true, true, true, true, true, true, true, true, false, false, false, false, false, false ];
const colors = [
	'#1abc9c',
	'#3498db',
	'#8e44ad',
	'#34495e',
	'#f39c12',
	'#e74c3c',
	'#7f8c8d',
	'#2ecc71',
	'#f1c40f',
	'black'
];
const images = [ 'p0', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9' ];
const roleDistributions: { [key: number]: any } = {
	2: [
		{
			isFasho: true,
			isHitler: true
		},
		{
			isFasho: false,
			isHitler: false
		}
	],
	5: [
		{
			isFasho: true,
			isHitler: true
		},
		{
			isFasho: true,
			isHitler: false
		},
		{
			isFasho: false,
			isHitler: false
		},
		{
			isFasho: false,
			isHitler: false
		},
		{
			isFasho: false,
			isHitler: false
		}
	]
};

export default Game;
