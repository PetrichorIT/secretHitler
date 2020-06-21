import print from './logger';
import { jdb, SyncAdapter, Wrapper } from './jdb';
import ws from 'ws';

enum GameState {
	invalid = 1,
	startup = 2,
	nextPresident = 3,
	selectChancellor = 4,
	voteChancellor = 5,
	presidentLaws = 6,
	chancellorLaws = 7,
	veto = 8,

	prepareSelectKill = 9,
	selectKill = 10,

	prepareSelectPresident = 11,
	selectPresident = 12,

	prepareInspectPlayer = 13,
	inspectPlayer = 14,

	prepareInspectLaws = 15,
	inspectLaws = 16
}

type EventType = { type: string; [key: string]: any };
type PlayerLike = { username: string; [key: string]: any };
type Player = {
	name: string;
	role?: {
		isFasho: boolean;
		isHitler: boolean;
	};
	image?: string;
	color?: string;
	client: ws | null;
	localState: boolean;
	alive?: boolean;
	lastEvent?: EventType;
};

type Config = {
	creator: string;
	private: boolean;
};

/**
 * A class to act as a game master
 */
export class Game {
	id: string;
	dismissGameHandler: (won: boolean) => void;
	blocked: boolean;
	paused: boolean;

	players: Player[];
	spectators: { client: ws; name: string }[] = [];

	gameState: GameState;
	effects: number[] = [];

	drawPile: boolean[] = [];
	discardPile: boolean[] = [];
	fashoLaws: number = 0;
	liberalLaws: number = 0;

	noGovermentCounter: number = 0;

	previousPresident: number | null = null;
	previousChancellor: number | null = null;
	fallbackPresident: number | null = null;

	currentPresident: number = 0;
	currentChancellor: number | null = null;

	candiateChancellor: number | null = null;

	currentSelection: any | null = null;
	currentSelectorName: string | null = null;

	db: Wrapper | null = null;
	config: Config;

	constructor(id: string, dismissGameHandler: (won: boolean) => void) {
		this.dismissGameHandler = dismissGameHandler;
		this.paused = true;
		this.blocked = false;
		this.id = id;
		this.players = [];
		this.gameState = GameState.invalid;
		this.config = { creator: 'root', private: true };

		this.load();
	}

	/**
	 * Ending the current game session by closing all connnections
	 * and calling a dismiss handler
	 */
	private win(fashosWon: boolean) {
		this.paused = true;
		const exportPlayers = [];
		for (let i = 0; i < this.players.length; i++) {
			exportPlayers.push({
				id: i,
				name: this.players[i].name,
				color: this.players[i].color,
				alive: this.players[i].alive,
				role: this.players[i].role
			});
		}
		this.broadcast({
			type: 'win',
			players: exportPlayers,
			fashosWon
		});

		this.dismissGameHandler(true);
	}

	/**
	 * Aborting the current game session by closing all connections
	 * and calling a dismiss handler
	 */
	private abort() {
		try {
			this.broadcast({ type: 'abort' });
			this.dismissGameHandler(false);
		} catch(e) {
			print("Error", e)
		}
	}

	/**
	 * Saves gameState to a file in the data/games folder
	 * called <id>.json where id := this.id 
	 */
	private save() {
		if (this.db === null) {
			try {
				this.db = jdb(new SyncAdapter('data/games/' + this.id + '.json'));
			} catch (e) {
				print('Error', '#' + this.id + ' Error: ' + e);
				this.abort();
				return;
			}
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
					localState: true,
					color: p.color,
					image: p.image,
					alive: p.alive,
					lastEvent: p.lastEvent
				};
			})
		};

		print('Game', '#' + this.id + ' Saving Game');

		this.db.set('timestamp', new Date()).write();
		this.db.set('gamedata', gameData).write();
		this.db.set('config', this.config).write();
	}

	/**
	 * Loads the gameState from a stored state in the corresponding <id>.json file
	 * 
	 * If file does not exists (or does not contain valid gameData) the function
	 * does not affect the gameState, nor does it throw an exception
	 */
	private load() {
		if (this.db === null) {
			this.db = jdb(new SyncAdapter('data/games/' + this.id + '.json'));
		}

		print('Game', '#' + this.id + ' Loading Game');

		const gameData = this.db.get('gamedata').value();
		const config = this.db.get('config').value();
		if (!gameData) return;
		if (!config) return;

		this.config = config;
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
				alive: p.alive,
				client: null
			};
		});

		this.paused = true;
		this.tryUpdateState();
	}

	/**
	 * Helper function that executes the action if all players a
	 * ready to unpause the game
	 */
	private tryUnpause(action: () => void) {
		if (this.players.length < 2) return;
		for (const player of this.players) {
			if (player.localState) return;
		}

		this.paused = false;
		action();
	}

	/**
	 * Initalizing a new Game from Game State .invalid
	 */
	private startNewGame() {
		this.gameState = GameState.startup;

		const numberOfPlayers = Object.keys(this.players).length;

		let configEffects = baseConfig.effects[numberOfPlayers];
		if (configEffects === undefined) {
			configEffects = baseConfig.effects[numberOfPlayers - 1];
		}
		this.effects = configEffects;

		let roles = baseConfig.roles[numberOfPlayers];
		if (roles === undefined) {
			roles = baseConfig.roles[numberOfPlayers - 1];
		}

		roles.sort(() => Math.random() - 0.5);
		baseConfig.colors.sort(() => Math.random() - 0.5);
		baseConfig.images.sort(() => Math.random() - 0.5);

		for (let i = 0; i < roles.length; i++) {
			this.players[i].role = roles[i];
			this.players[i].color = baseConfig.colors[i];
			this.players[i].image = baseConfig.images[i];
			this.players[i].alive = true;
		}
		for (const player of this.players) {
			this.sendPlayerData(player);
		}

		this.drawPile = baseConfig.lawCards;
		this.drawPile.sort(() => Math.random() - 0.5);

		this.discardPile = [];

		this.fashoLaws = 0;
		this.liberalLaws = 0;
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

	/**
	 * Main Game Loop
	 */
	private tryUpdateState() {
		if (this.paused) {
			if (this.gameState === GameState.invalid) {
				this.tryUnpause(() => this.startNewGame());
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
			case GameState.startup:
				this.handleState_startup();
				break;

			case GameState.nextPresident:
				this.handleState_nextPresident();
				break;

			case GameState.selectChancellor:
				this.handleState_selectChancellor();
				break;

			case GameState.voteChancellor:
				this.handleState_voteChancellor();
				break;
			case GameState.presidentLaws:
				this.handleState_presidentLaws();
				break;

			case GameState.chancellorLaws:
				this, this.handleState_chancellorLaws();
				break;

			case GameState.prepareSelectKill:
				this.handleState_prepareSelectKill();
				break;
			case GameState.selectKill:
				this.handleState_selectKill();
				break;

			case GameState.prepareSelectPresident:
				this.handleState_prepareSelectPresident();
				break;
			case GameState.selectPresident:
				this.handleState_selectPresident();
				break;

			case GameState.prepareInspectPlayer:
				this.handleState_prepareInspectPlayer();
				break;
			case GameState.inspectPlayer:
				this.handleState_inspectPlayer();
				break;

			case GameState.prepareInspectLaws:
				this.handleState_prepareInspectLaws();
				break;
			case GameState.inspectLaws:
				this.handleState_inspectLaws();
				break;
		}
	}

	/*
	 All those state handlers handle a different gameState
	 They are called exclusivly by the mainGameLoop function
	 */

	private handleState_startup() {
		print(
			'Game',
			'#' +
				this.id +
				' Started Game with players: ' +
				this.players.map((v) => {
					return v.name;
				})
		);
		this.currentPresident = Math.floor(Math.random() * this.players.length) - 1;
		this.gameState = GameState.nextPresident;
		this.tryUpdateState();
	}

	private handleState_nextPresident() {
		if (this.fallbackPresident !== null) {
			this.currentPresident = this.fallbackPresident;
			this.fallbackPresident = null;
		}

		this.currentChancellor = null;
		this.currentPresident = this.currentPresident + 1;
		if (this.currentPresident === this.players.length) this.currentPresident = 0;
		print('Game', '#' + this.id + ' selectingNewPresident: ' + this.currentPresident);

		// Check if alive
		if (this.players[this.currentPresident].alive === false) {
			this.tryUpdateState(); // Move to next president
			return;
		}

		const ignorePlayers = [ this.previousPresident, this.previousChancellor, this.currentPresident ].filter(
			(v) => v !== null
		);
		for (let index = 0; index < this.players.length; index++) {
			if (ignorePlayers.findIndex((p) => p === index) === -1) {
				if (this.players[index].alive === false) {
					ignorePlayers.push(index);
				}
			}
		}

		print('Game', '#' + this.id + ' selectingNewChancellor: not(' + ignorePlayers + ')');

		this.players[this.currentPresident].localState = true;
		this.gameState = GameState.selectChancellor;
		this.currentSelectorName = this.players[this.currentPresident].name;

		this.boradcastGameState();
		this.send(this.players[this.currentPresident], { type: 'selectChancellor', ignorePlayers });
	}

	private handleState_selectChancellor() {
		if (this.currentSelection === null) return;
		print('Game', '#' + this.id + ' selectedNewChancellor: ' + this.currentSelection);

		this.candiateChancellor = this.currentSelection;
		this.gameState = GameState.voteChancellor;
		this.currentSelection = {};
		for (let i = 0; i < this.players.length; i++) {
			this.players[i].localState = true;
		}

		this.broadcastLocalState();
		// Do Not use broadcast , cause dead players dont vote
		for (const player of this.players) {
			if (player.alive === false) continue;
			this.send(player, { type: 'voteChancellor', chancellor: this.candiateChancellor });
		}
	}

	private handleState_voteChancellor() {
		const playersAlive = this.players.filter((v) => v.alive === true);

		if (Object.keys(this.currentSelection).length < playersAlive.length) return;

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
			this.noGovermentCounter = 0;

			this.blocked = true;
			this.broadcast({ type: 'votingEnded', result: true, results: this.currentSelection });
			this.currentSelection = null;
			this.boradcastGameState();

			setTimeout(() => {
				this.blocked = false;
				if (this.players[this.currentChancellor!].role!.isHitler && this.fashoLaws >= 3) {
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
				this.gameState = GameState.presidentLaws;
				this.players[this.currentPresident].localState = true;
				this.boradcastGameState();
				this.send(this.players[this.currentPresident], { type: 'presidentLaws', cards });
			}, 3500);
		} else {
			print('Game', '#' + this.id + " Vote for '" + this.candiateChancellor + ' failed');
			this.noGovermentCounter += 1;
			this.gameState = GameState.nextPresident;
			this.currentSelection = null;
			this.currentChancellor = null;
			this.blocked = true;

			this.broadcast({ type: 'votingEnded', result: false, results: this.currentSelection });
			setTimeout(() => {
				this.blocked = false;
				if (this.noGovermentCounter === 3) {
					this.noGovermentCounter = 0;
					if (this.drawPile.length === 0) {
						this.discardPile.sort(() => Math.random() - 0.5);
						for (const card of this.discardPile) {
							this.drawPile.push(card);
						}
						this.discardPile = [];
					}

					const card = this.drawPile.shift();
					if (card) {
						this.fashoLaws += 1;

						if (this.fashoLaws === 6) {
							return this.win(true);
						}

						this.gameState = GameState.nextPresident;
						this.currentChancellor = null;
						this.boradcastGameState();
						setTimeout(() => {
							this.tryUpdateState();
						}, 1000);
						return;
					} else {
						this.liberalLaws += 1;

						if (this.liberalLaws === 5) {
							return this.win(true);
						}

						this.gameState = GameState.nextPresident;
						this.currentChancellor = null;
						this.boradcastGameState();
						setTimeout(() => {
							this.tryUpdateState();
						}, 1000);
						return;
					}
				}
				this.tryUpdateState();
			}, 3500);
		}
	}

	private handleState_presidentLaws() {
		if (this.currentSelection === null) return;
		if (this.currentChancellor === null) return;
		this.discardPile.push(this.currentSelection.revoked[0]);

		this.gameState = GameState.chancellorLaws;
		this.players[this.currentChancellor!].localState = true;

		this.broadcastLocalState();
		this.send(this.players[this.currentChancellor!], {
			type: 'chancellorLaws',
			cards: this.currentSelection.selected
		});
		this.currentSelection = null;
	}

	private handleState_chancellorLaws() {
		if (this.currentSelection === null) return;
		if (this.currentChancellor === null) return;
		this.discardPile.push(this.currentSelection.revoked[0]);

		this.players[this.currentChancellor!].localState = false;
		this.previousChancellor = this.currentChancellor;
		this.previousPresident = this.currentPresident;

		if (this.currentSelection.selected[0]) {
			this.fashoLaws += 1;

			if (this.fashoLaws === 6) {
				return this.win(true);
			}

			const effectState = this.effects[this.fashoLaws - 1];

			if (effectState) {
				print('Game', '#' + this.id + ' EffectStatePrep: ' + effectState);
				this.gameState = effectState;
				this.tryUpdateState();
				return;
				// Remmeber to unset currenPreident / Chancellor
				// Effect
			} else {
				this.gameState = GameState.nextPresident;
				this.currentChancellor = null;
				this.boradcastGameState();
				setTimeout(() => {
					this.tryUpdateState();
				}, 3000);
			}
		} else {
			this.liberalLaws += 1;
			if (this.liberalLaws === 5) {
				return this.win(false);
			}
			this.gameState = GameState.nextPresident;
			this.currentChancellor = null;
			this.boradcastGameState();
			setTimeout(() => {
				this.tryUpdateState();
			}, 3000);
		}
	}

	private handleState_prepareSelectKill() {
		this.players[this.currentPresident].localState = true;
		this.gameState = GameState.selectKill;
		this.currentSelection = null;
		this.boradcastGameState();
		const ignorePlayers = [];
		for (let index = 0; index < this.players.length; index++) {
			if (this.players[index].alive === false) {
				ignorePlayers.push(index);
			}
		}

		this.send(this.players[this.currentPresident], {
			type: 'selectKill',
			ignorePlayers
		});
	}

	private handleState_selectKill() {
		if (!this.currentSelection === null) return;

		this.players[this.currentSelection].alive = false;
		this.players[this.currentSelection].localState = false;
		this.send(this.players[this.currentSelection], { type: 'kill' });
		this.boradcastGameState();
		if (this.players[this.currentSelection].role!.isHitler) {
			this.win(false);
			return;
		}

		this.gameState = GameState.nextPresident;
		setTimeout(() => {
			this.tryUpdateState();
		}, 2000);
	}

	private handleState_prepareSelectPresident() {
		this.players[this.currentPresident].localState = true;
		this.gameState = GameState.selectPresident;
		this.currentSelection = null;
		this.boradcastGameState();

		const ignorePlayers: number[] = [];
		for (let index = 0; index < this.players.length; index++) {
			if (!this.players[index].alive || index === this.currentPresident) {
				ignorePlayers.push(index);
			}
		}

		this.send(this.players[this.currentPresident], {
			type: 'selectPresident',
			ignorePlayers
		});
	}

	private handleState_selectPresident() {
		if (this.currentSelection === null) return;

		this.currentChancellor = null;
		this.fallbackPresident = this.currentPresident;
		this.currentPresident = this.currentSelection;

		if (this.players[this.currentPresident].alive === false) {
			this.tryUpdateState(); // Move to next president
			return;
		}

		const ignoredPlayers = [ this.previousPresident, this.previousChancellor, this.currentPresident ].filter(
			(v) => v !== null
		);
		for (let index = 0; index < this.players.length; index++) {
			if (ignoredPlayers.findIndex((p) => p === index) === -1) {
				if (this.players[index].alive === false) {
					ignoredPlayers.push(index);
				}
			}
		}

		print('Game', '#' + this.id + ' selectingNewChancellor: not(' + ignoredPlayers + ')');

		this.players[this.currentPresident].localState = true;
		this.gameState = GameState.selectChancellor;
		this.currentSelectorName = this.players[this.currentPresident].name;

		this.boradcastGameState();
		this.send(this.players[this.currentPresident], {
			type: 'selectChancellor',
			ignorePlayers: ignoredPlayers
		});
	}

	private handleState_prepareInspectPlayer() {
		this.players[this.currentPresident].localState = true;
		this.gameState = GameState.inspectPlayer;
		this.currentSelection = null;
		this.boradcastGameState();

		const ignorePlayers: number[] = [];
		for (let index = 0; index < this.players.length; index++) {
			if (!this.players[index].alive || index === this.currentPresident) {
				ignorePlayers.push(index);
			}
		}

		this.send(this.players[this.currentPresident], {
			type: 'selectPlayer_to_inspect',
			ignorePlayers
		});
	}

	private handleState_inspectPlayer() {
		if (this.currentSelection === null) return;
		this.currentChancellor = null;

		const player: any = {};
		player.name = this.players[this.currentSelection].name;
		player.faction = this.players[this.currentSelection].role!.isFasho;
		player.color = this.players[this.currentSelection].color;
		player.image = this.players[this.currentSelection].image;

		this.boradcastGameState();
		this.send(this.players[this.currentPresident], {
			type: 'inspectPlayer',
			player
		});
	}

	private handleState_prepareInspectLaws() {
		this.players[this.currentPresident].localState = true;
		this.gameState = GameState.inspectLaws;
		this.currentSelection = null;
		this.boradcastGameState();
		this.send(this.players[this.currentPresident], { type: 'inspectLaws', laws: this.drawPile.slice(0, 3) });
	}

	private handleState_inspectLaws() {
		this.currentChancellor = null;
		this.gameState = GameState.nextPresident;
		this.boradcastGameState();
		this.tryUpdateState();
	}

	/**
	 * Sends the secret role information to a player at init or reconnect
	 * This includes (if nessesary) revealed roles of other players
	 */
	private sendPlayerData(player: Player) {
		const event: EventType = { type: 'role', role: player.role };
		if (player.role) {
			if (this.players.length >= 7 && player.role!.isFasho && !player.role!.isHitler) {
				event.hitler = this.players.findIndex((p) => p.role!.isHitler);
			}

			if (this.players.length < 7 && player.role!.isHitler) {
				event.fasho = this.players.findIndex((p) => p.role!.isFasho && !p.role!.isHitler);
			}
		}
		this.send(player, event);
	}

	/**
	 * Sends information about the currently connected clients
	 * and their ready states to all connected client (including spectators)
	 */
	private broadcastPausedState() {
		this.broadcast({
			type: 'waitingState',
			users: this.players.map((p) => {
				return { name: p.name, localState: p.localState };
			}),
			spectators: this.spectators.length
		});
	}

	/**
	 * Sends the gameState ID and the current actionStates of all
	 * players to all players (including spectators)
	 */
	private broadcastLocalState() {
		this.broadcast({
			type: 'localState',
			players: this.players.map((v) => v.localState),
			gameState: this.gameState
		});
	}

	/**
	 * Sends the totality of the current game State managed by the
	 * GameContext to all players (including spectators)
	 */
	private boradcastGameState() {
		const exportPlayers = [];
		for (let i = 0; i < this.players.length; i++) {
			exportPlayers.push({
				id: i,
				name: this.players[i].name,
				color: this.players[i].color,
				image: this.players[i].image,
				alive: this.players[i].alive
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

	/**
	 * Sends a message to all clients and spectators
	 * Does not store this message as last message
	 */
	private broadcast(event: EventType) {
		for (const player of this.players) {
			if (player.client === null) continue;
			if (player.client.readyState !== 1) continue;
			player.client.send(JSON.stringify({ type: 'ingame', event }));
		}

		for (const spectator of this.spectators) {
			if (spectator.client === null) continue;
			if (spectator.client.readyState !== 1) continue;
			spectator.client.send(JSON.stringify({ type: 'ingame', event }));
		}
	}

	/**
	 * Sends Message to one client at a time
	 * Does store this message in as last message
	 */
	private send(player: Player, event: EventType) {
		if (player.client === null) return;
		if (player.client.readyState !== 1) return;
		player.client.send(JSON.stringify({ type: 'ingame', event }));
		player.lastEvent = event;
	}

	/**
	 * Handles a new authenticated ws-connection
	 * and adds it to the game
	 */
	addPlayer(player: PlayerLike, client: ws) {
		let index = this.players.findIndex((p) => p.name === player.username);
		if (index >= 0) {
			// Recoonect a player to his current gameState
			print('Game', '#' + this.id + " Reconnected player '" + player.username);
			this.reconnectClient(index, client);
		} else {
			if (this.gameState !== GameState.invalid) {
				// Catch private game
				if (this.config.private) {
					client.send(JSON.stringify({ type: 'error', msg: 'The game is private and cannot be spectated' }));
					return;
				}

				print('Game', '#' + this.id + " Added spectator '" + player.username);
				this.spectators.push({ client, name: player.username });
				client.send(JSON.stringify({ type: 'ingame', event: { type: 'spectate' } }));
				if (this.paused) {
					this.broadcastPausedState();
				} else {
					this.boradcastGameState();
				}
				return;
			} else {
				print('Game', '#' + this.id + " Added player '" + player.username);
				this.players.push({ name: player.username, client, localState: true });
				index = this.players.length - 1;
			}
		}
		// Prepare for readystate
		if (this.paused) {
			let index = this.players.findIndex((p) => p.name === player.username);
			this.broadcastPausedState();
			this.send(this.players[index], { type: 'requestReadyForGame' });
		}
	}

	/**
	 * Reconnects a player to his last gameState 
	 * if he was part of the game once (even if he is dead now)
	 * 
	 * Does work in paused and active gameState
	 */
	private reconnectClient(index: number, client: any) {
		this.players[index].client = client;

		if (this.players[index].alive === false) return;
		if (this.paused) {
			this.players[index].localState = true;
		}

		const lastEvent = this.players[index].lastEvent;
		this.sendPlayerData(this.players[index]);
		this.boradcastGameState();

		if (lastEvent) {
			if (reconnectStates[lastEvent.type] === this.gameState) {
				this.send(this.players[index], lastEvent);
			}
		}
	}

	/**
	 * Handle a closed ws-connection in game
	 */
	clientLost(username: string) {
		let index = this.players.findIndex((p) => p.name === username);
		if (index === -1) {
			let sindex = this.spectators.findIndex((p) => p.name === username);
			this.spectators.splice(sindex, 1);
			return;
		}

		this.players[index].client = null;
		if (this.players[index].alive === true && this.paused === false) {
			this.save();
			print('Game', '#' + this.id + ' LostRelevantClient');
			setTimeout(() => {
				if (!this.players[index]) return;
				if (this.players[index].client === null) {
					this.players.splice(index, 1);
					this.abort();
				}
			}, baseConfig.timeout);
		}
	}

	/**
	 * Handles incoming client side messages
	 * identified by a username of the authenticated ws-connection
	 */
	recive(username: string, event: EventType) {
		if (this.blocked === true) return;
		if (this.paused) {
			if (event.type === 'readyForGame') {
				let index = this.players.findIndex((p) => p.name === username);
				this.players[index].localState = false;
				this.broadcastPausedState();
				this.tryUpdateState();
			}
			return;
		}
		if (this.players.find((p) => p.name === username)!.alive === false) return;
		switch (event.type) {
			case 'selectChancellor-response':
				this.currentSelection = event.selection;
				this.players[this.currentPresident].localState = false;
				this.broadcastLocalState();
				this.tryUpdateState();
				break;
			case 'voteChancellor-response':
				print('Game', '#' + this.id + ' Vote: ' + event.vote + ' by ' + username);
				this.currentSelection[username] = event.vote;
				this.players.find((p) => p.name == username)!.localState = false;
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

			case 'chancellorVeto':
				print('Game', '#' + this.id + ' chancellorVeto');
				this.currentSelection = this.players[this.currentChancellor!].lastEvent;
				this.players[this.currentPresident].localState = true;
				this.players[this.currentChancellor!].localState = false;
				this.gameState = GameState.veto;
				this.boradcastGameState();
				this.send(this.players[this.currentPresident], { type: 'requestingVeto' });
				break;

			case 'presidentVeto':
				print('Game', '#' + this.id + ' presidentVeto' + event.veto);
				this.players[this.currentPresident].localState = false;
				if (event.veto) {
					this.gameState = GameState.nextPresident;
					for (const card of this.currentSelection.cards) {
						this.discardPile.push(card);
					}

					this.currentChancellor = null;
					this.tryUpdateState();
				} else {
					this.gameState = GameState.chancellorLaws;
					this.players[this.currentChancellor!].localState = true;
					this.send(this.players[this.currentChancellor!], {
						type: 'chancellorLaws',
						cards: this.currentSelection.cards,
						vetoFailed: true
					});

					this.currentSelection = null;
				}
				break;

			// Effects
			case 'selectKill-response':
				print('Game', '#' + this.id + ' SelectedKill ' + event.selection);
				this.currentSelection = event.selection;
				this.players[this.currentPresident].localState = false;
				this.broadcastLocalState();
				this.tryUpdateState();
				break;

			case 'selectPresident-response':
				print('Game', '#' + this.id + ' SelectedPresident ' + event.selection);
				this.currentSelection = event.selection;
				this.players[this.currentPresident].localState = false;
				this.broadcastLocalState();
				this.tryUpdateState();
				break;

			case 'selectPlayer_to_inspect-response':
				print('Game', '#' + this.id + ' Selectedinspect ' + event.selection);
				this.currentSelection = event.selection;
				this.broadcastLocalState();
				this.tryUpdateState();
				break;

			case 'inspectPlayer-response':
				this.gameState = GameState.nextPresident;
				this.players[this.currentPresident].localState = false;
				this.boradcastGameState();
				this.tryUpdateState();
				break;

			case 'inspectLaws-response':
				this.gameState = GameState.nextPresident;
				this.players[this.currentPresident].localState = false;
				this.boradcastGameState();
				this.tryUpdateState();
				break;

			default:
				print('Error', 'Cannot find Event of type: ' + event.type);
				break;
		}
	}
}

export default Game;

const baseConfig = jdb(new SyncAdapter('data/config.json')).value();
const reconnectStates: { [key: string]: number } = {
	voteChancellor: GameState.voteChancellor,
	selectChancellor: GameState.selectChancellor,
	selectPresident: GameState.selectPresident,
	presidentLaws: GameState.presidentLaws,
	chancellorLaws: GameState.chancellorLaws,
	requestingVeto: GameState.veto,
	selectKill: GameState.selectKill,
	selectPlayer_to_inspect: GameState.inspectPlayer,
	inspectPlayer: GameState.inspectPlayer,
	inspectLaws: GameState.inspectLaws
};
