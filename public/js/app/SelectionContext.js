class SelectionContext {
	constructor(socket) {
		this.container = document.querySelector('#selectionContainer');
		this.titleContainer = document.querySelector('#selectionTitle');
		this.cardContainer = document.querySelector('#selectionCardContainer');

		this.socket = socket;
		this.event;
	}

	start(event) {
		const titles = {
			selectChancellor: 'a Chancellor',
			selectPresident: 'a President',
			selectKill: 'a Kill'
		};

		this.event = event;
		this.container.style.display = 'block';
		this.titleContainer.innerHTML = 'Select ' + titles[event.type];

		if (this.cardContainer.childElementCount === 0) {
			const totalPlayers = gameContext.players.length;
			let baseDeg = Math.floor(totalPlayers / 2) * -15;
			if (totalPlayers % 2 == 0) baseDeg += 7.5;
			for (const player of gameContext.players) {
				const element = document.createElement('div');
				element.classList.add('boxShadow');
				element.id = 'select' + player.id;
				element.style.border = '4px solid ' + player.color;
				element.style.transform = 'rotate(' + baseDeg + 'deg)';
				element.innerHTML = `<img src="img/portraits/${player.image}.png" alt="profileImage">` + player.name;
				element.addEventListener('click', () => this.sendSelection(player));

				this.cardContainer.append(element);
				baseDeg += 15;
			}
		}

		for (const player of gameContext.players) {
			if (event.ignorePlayers.findIndex((v) => v === player.id) !== -1) {
				document.querySelector('#select' + player.id).classList.add('disabled');
			} else {
				document.querySelector('#select' + player.id).classList.remove('disabled');
			}
		}
	}
	sendSelection(player) {
		if (this.event.ignorePlayers.findIndex((v) => v === player.id) !== -1) {
			alert('Invalid Selection');
			return;
		}

		const reponseMethod = {
			selectChancellor: 'selectedChancellor',
			selectPresident: 'selectedPresident',
			selectKill: 'selectedKill'
		};

		const type = reponseMethod[this.event.type];
		this.socket.send(
			JSON.stringify({
				type: 'ingame',
				event: {
					type: type,
					selection: player.id
				}
			})
		);
		this.end();
	}
	end() {
		this.container.style.display = 'none';
	}
}
