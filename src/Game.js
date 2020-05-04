const TIMEOUT = 30 * 1000;
const GameStates = {
	/*interrupted: 0,*/ waiting: 1,
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

class Game {
	constructor(id) {
		this.id = id;
		this.players = [];
		this.gameState = GameStates.waiting;
	}

	// Main Game Loop

	tryStart() {
		if (this.gameState !== GameStates.waiting) return;
		if (this.players.length < 2) return;

		for (const player of this.players) {
			if (player.localState) return;
		}

		// Start the game already

		this.gameState = GameStates.startup;

		const roles = roleDistributions[Object.keys(this.players).length];
		roles.sort(() => Math.random() - 0.5);

		for (let i = 0; i < roles.length; i++) {
			this.players[i].role = roles[i];
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

	tryUpdateState() {
		switch (this.gameState) {
			case GameStates.startup:
				console.log('game // startup');
				console.log(
					'game // ' +
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

				console.log('game // selectingNewPresident : ' + this.currentPresident);

				const ignorePlayers = [ this.previousPresident, this.previousChancellor, this.currentPresident ].filter(
					(v) => v !== null
				);

				console.log('game // selectingNewChancellor : not ' + ignorePlayers);

				this.boradcastGameState();
				this.send(this.players[this.currentPresident], { type: 'selectChancellor', ignorePlayers });
				this.players[this.currentPresident].localState = true;
				this.gameState = GameStates.selectChancellor;
				this.currentSelectorName = this.players[this.currentPresident].name;
				break;

			case GameStates.selectChancellor:
				console.log('game // selectedNewChancellor : ' + this.currentSelection);

				this.currentChancellor = this.currentSelection;
				this.gameState = GameStates.voteChancellor;
				this.currentSelection = {};
				this.broadcast({ type: 'voteChancellor', chancellor: this.currentChancellor });
				break;

			case GameStates.voteChancellor:
				console.log('check // voteChancellor');
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
					console.log('game // Vote succesfull');
					this.previousChancellor = this.currentChancellor;
					this.previousPresident = this.currentPresident;
					this.boradcastGameState();

					// DRAW CARDS
				} else {
					console.log('game // vote failed');
					this.gameState = GameStates.nextPresident;
					this.tryUpdateState();
				}

				break;
		}
	}

	boradcastGameState() {
		if (this.gameState === GameStates.waiting) return;

		const exportPlayers = [];
		for (let i = 0; i < this.players.length; i++) {
			exportPlayers.push({ id: i, name: this.players[i].name });
		}

		this.broadcast({
			type: 'globalGameState',
			players: exportPlayers,
			fashoLaws: this.fashoLaws,
			liberalLaws: this.liberalLaws,
			drawPile: this.drawPile.length,
			discardPile: this.discardPile.length,
			noGovermentCounter: this.noGovermentCounter
		});
	}

	broadcast(event) {
		for (const player of this.players) {
			this.send(player, event);
		}
	}

	send(player, event) {
		if (player.client === null) return;
		player.client.send(JSON.stringify({ type: 'ingame', event }));
	}

	// Helpers

	addPlayer(player, client) {
		let index = this.players.findIndex((p) => p.name === player.username);
		if (index >= 0) {
			// Rejoin
			this.players[index].client = client;
			this.players[index].localState = true;

			this.send(this.players[index], { type: 'role', role: this.players[index].role });
			this.boradcastGameState();
		} else {
			// New Join
			this.players.push({ name: player.username, client, localState: true });
			index = this.players.length - 1;
		}

		// Prepare for readystate
		if (this.gameState === GameStates.waiting) {
			let index = this.players.findIndex((p) => p.name === player.username);
			this.send(this.players[index], { type: 'requestReadyForGame' });
		}
	}

	clientLost(username) {
		let index = this.players.findIndex((p) => p.name === username);

		this.players[index].client = null;

		setTimeout(() => {
			if (this.players[index].client === null) {
				this.players.splice(index, 1);
				this.abort();
			}
		}, TIMEOUT);
	}

	abort() {
		throw new Error('ABORT');
	}

	recive(username, event) {
		switch (event.type) {
			case 'readyForGame':
				let index = this.players.findIndex((p) => p.name === username);
				this.players[index].localState = false;
				this.tryStart();
				break;
			case 'selectChancellor':
				if (username !== this.currentSelectorName)
					return console.log('game // selectChancellor person missmatch');
				this.currentSelection = event.selection;
				this.tryUpdateState();
				break;
			case 'voteChancellor':
				console.log('game // vote ' + event.vote + ' by ' + username);
				this.currentSelection[username] = event.vote;
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
const roleDistributions = {
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

module.exports.Game = Game;
