class GameContext {
	constructor() {
		this.playersContainer = document.querySelector('#playersContainer');
		this.startedUp = false;
	}

	start() {
		this.startedUp = true;
		const width = Math.min(this.playersContainer.offsetWidth / this.players.length, 150);
		console.log(width);
		for (const player of this.players) {
			const element = document.createElement('div');
			element.classList.add('playerBox');
			element.id = 'box' + player.id;
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

		console.log(this);

		// UI Updates
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
		}
	}

	updateLocal(players) {
		for (let i = 0; i < players.length; i++) {
			console.log('set to ' + !players[i]);
			document.querySelector('#spinner-' + i).hidden = !players[i];
		}
	}
}
