class GameContext {
	constructor() {
		this.playersContainer = document.querySelector('#playersContainer');
		this.fashoLawsBg = document.querySelector('#fashoLawsBg');
		this.fashoLawsContainer = document.querySelector('.overlayContainerFasho');
		this.liberalLawsContainer = document.querySelector('.overlayContainerLiberal');
		this.drawPileContainer = document.querySelector('#drawPile');
		this.discardPileContainer = document.querySelector('#discardPile');
		this.stateLabel = document.querySelector('.stateLabel');

		this.startedUp = false;
	}

	start() {
		this.startedUp = true;
		const width = Math.min(this.playersContainer.offsetWidth / this.players.length, 150);

		for (const player of this.players) {
			const element = document.createElement('div');
			element.classList.add('playerBox');
			element.id = 'box-' + player.id;
			element.style.width = width + 'px';
			element.style.backgroundColor = player.color;

			const profileImage = document.createElement('img');
			profileImage.classList.add('profile');
			profileImage.src = `img/portraits/${player.image}.png`;
			profileImage.alt = `img/portraits/${player.image}.png`;
			element.append(profileImage);

			const titleSpan = document.createElement('span');
			titleSpan.style.backgroundColor = player.color;
			titleSpan.innerHTML = player.name === username ? 'You' : player.name;

			element.append(titleSpan);

			const silverStarCrossed = document.createElement('img');
			silverStarCrossed.classList.add('star-crossed');
			silverStarCrossed.id = 'star-silver-crossed-' + player.id;
			silverStarCrossed.src = 'img/star-silver-crossed.png';
			silverStarCrossed.alt = 'Is president';
			element.append(silverStarCrossed);

			const goldStarCrossed = document.createElement('img');
			goldStarCrossed.classList.add('star-crossed');
			goldStarCrossed.id = 'star-gold-crossed-' + player.id;
			goldStarCrossed.src = 'img/star-gold-crossed.png';
			goldStarCrossed.alt = 'Is chancellor';
			element.append(goldStarCrossed);

			const silverStar = document.createElement('img');
			silverStar.classList.add('star');
			silverStar.id = 'star-silver-' + player.id;
			silverStar.src = 'img/star-silver.png';
			silverStar.alt = 'Is president';
			element.append(silverStar);

			const goldStar = document.createElement('img');
			goldStar.classList.add('star');
			goldStar.id = 'star-gold-' + player.id;
			goldStar.src = 'img/star-gold.png';
			goldStar.alt = 'Is chancellor';
			element.append(goldStar);

			const spinner = document.createElement('div');
			spinner.classList.add('spinner');
			spinner.id = 'spinner-' + player.id;
			spinner.hidden = true;
			spinner.style.position = 'absolute';
			spinner.style.left = '5px';
			spinner.style.top = '5px';
			element.append(spinner);

			if (knownHitler !== null && knownHitler === player.id) {
				const hitlerSign = document.createElement('img');
				hitlerSign.src = 'img/role-hitler.png';
				hitlerSign.alt = 'isHitler';
				hitlerSign.classList.add('symbolImage');
				hitlerSign.classList.add('boxShadow');
				element.append(hitlerSign);
			}

			if (knownFasho !== null && knownFasho === player.id) {
				const fashoSign = document.createElement('img');
				fashoSign.src = 'img/role-fasho.png';
				fashoSign.alt = 'isFasho';
				fashoSign.classList.add('symbolImage');
				fashoSign.classList.add('boxShadow');
				element.append(fashoSign);
			}

			this.playersContainer.append(element);
		}
	}

	update(event) {
		// Model Updates
		for (const key in event) {
			if (event.hasOwnProperty(key)) {
				this[key] = event[key];
			}
		}

		if (!this.startedUp) {
			this.start();
		}

		// Set Fasho Laws Background
		let nPlayers = this.players.length;
		if (nPlayers % 2 === 1) {
			nPlayers += 1;
		}
		const imgSrc = 'img/laws-fasho-' + nPlayers + '.png';
		if (this.fashoLawsBg.src !== imgSrc && nPlayers >= 5) {
			this.fashoLawsBg.src = imgSrc;
		}

		// Update Piles / States
		this.drawPileContainer.innerHTML = this.drawPile;
		this.discardPileContainer.innerHTML = this.discardPile;

		// Update noGov
		for (let i = 0; i < 4; i++) {
			if (i === this.noGovermentCounter) {
				document.querySelector('#noGov' + i).hidden = false;
			} else {
				document.querySelector('#noGov' + i).hidden = true;
			}
		}

		// Update Players
		if (!this.startedUp) this.start();
		for (const player of this.players) {
			if (player.id === this.currentPresident) {
				document.querySelector('#star-silver-' + player.id).hidden = false;
			} else {
				document.querySelector('#star-silver-' + player.id).hidden = true;
			}

			if (player.id === this.previousPresident) {
				document.querySelector('#star-silver-crossed-' + player.id).hidden = false;
			} else {
				document.querySelector('#star-silver-crossed-' + player.id).hidden = true;
			}

			if (player.id === this.currentChancellor) {
				document.querySelector('#star-gold-' + player.id).hidden = false;
			} else {
				document.querySelector('#star-gold-' + player.id).hidden = true;
			}

			if (player.id === this.previousChancellor) {
				document.querySelector('#star-gold-crossed-' + player.id).hidden = false;
			} else {
				document.querySelector('#star-gold-crossed-' + player.id).hidden = true;
			}

			document.querySelector('#box-' + player.id).classList[player.alive ? 'remove' : 'add']('disabled');
		}

		for (let i = 1; i <= 6; i++) {
			document.querySelector('#tableLawFasho-' + i).hidden = i > this.fashoLaws;
		}
		for (let i = 1; i <= 5; i++) {
			document.querySelector('#tableLawLiberal-' + i).hidden = i > this.liberalLaws;
		}
	}

	updateLocal(event) {
		for (let i = 0; i < event.players.length; i++) {
			if (gameContext.players[i].alive === false) continue;
			document.querySelector('#spinner-' + i).hidden = !event.players[i];
		}

		this.stateLabel.innerHTML = gameStateTranslate[event.gameState];
	}
}

const gameStateTranslate = {
	1: 'Invalid',
	2: 'Starting Game',
	3: 'Selecting next president',
	4: 'Selecting chancellor',
	5: 'Vote for chancellor',
	6: 'President make laws',
	7: 'Chancellor makes laws',
	8: 'Veto',
	9: '#internal pSelectKill',
	10: 'Selecting player to kill',
	11: '#interal pSelectPresident',
	12: 'Selecting player as next president',
	13: '#internal pSelectInspectPlayer',
	14: 'Selecting Player to reveal',
	15: '#internal pSelectInspectLaw',
	16: 'Revealing next laws'
};
