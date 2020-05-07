class LawsContext {
	constructor(socket) {
		this.container = document.querySelector('#lawsContainer');
		this.titleContainer = document.querySelector('#lawsTitle');
		this.imageContainer = document.querySelector('#lawsImageContainer');
		this.confirmButton = document.querySelector('#lawsConfirm');
		this.vetoButton = document.querySelector('#vetoButton');

		this.confirmButton.addEventListener('click', () => this.send());
		this.vetoButton.addEventListener('click', () => this.veto());

		this.socket = socket;
		this.event;
	}

	start(event) {
		this.event = event;
		this.selected = [];
		const totalPlayers = event.cards.length;
		let baseDeg = Math.floor(totalPlayers / 2) * -15;
		if (totalPlayers % 2 == 0) baseDeg += 7.5;

		this.container.style.display = 'block';
		this.titleContainer.innerHTML = 'Select ' + (this.event.cards.length - 1);
		const allowVeto = !event.vetoFailed;

		if (allowVeto && this.event.cards.length === 2 && gameContext.fashoLaws.length === 5) {
			this.vetoButton.hidden = false;
		} else {
			this.vetoButton.hidden = true;
		}

		for (let i = 0; i < event.cards.length; i++) {
			const card = event.cards[i];

			const element = document.createElement('img');
			element.src = card ? 'img/law-fasho.png' : 'img/law-liberal.png';
			element.id = 'laws-' + i;
			element.style.transform = 'rotate(' + baseDeg + 'deg)';
			element.addEventListener('click', () => this.select(i));

			this.imageContainer.append(element);
			baseDeg += 15;
		}
	}

	select(id) {
		const index = this.selected.findIndex((v) => v === id);
		if (index === -1) {
			this.selected.push(id);
			document.querySelector('#laws-' + id).classList.add('selected');
		} else {
			this.selected.splice(index, 1);
			document.querySelector('#laws-' + id).classList.remove('selected');
		}

		if (this.selected.length === this.event.cards.length - 1) {
			this.confirmButton.classList.remove('disabled');
		} else {
			this.confirmButton.classList.add('disabled');
		}
	}

	veto() {
		if (this.event.cards.length === 2 && gameContext.fashoLaws.length === 5) {
			this.socket.send(JSON.stringify({ type: 'ingame', event: { type: 'chancellorVeto' } }));
			this.end();
		}
	}

	send() {
		if (this.selected.length === this.event.cards.length - 1) {
			const selected = [];
			const revoked = [];
			for (let i = 0; i < this.event.cards.length; i++) {
				if (this.selected.findIndex((v) => v === i) === -1) {
					revoked.push(this.event.cards[i]);
				} else {
					selected.push(this.event.cards[i]);
				}
			}

			this.socket.send(
				JSON.stringify({
					type: 'ingame',
					event: {
						type: this.event.type === 'presidentLaws' ? 'presidentLawsSelected' : 'chancellorLawsSelected',
						revoked: revoked,
						selected: selected
					}
				})
			);
			this.end();
		} else {
			if (this.selected.length > this.event.cards.length - 1) {
				alert('Select Less Cards');
			} else {
				alert('Select More Cards');
			}
		}
	}

	end() {
		this.container.style.display = 'none';
		this.imageContainer.innerHTML = '';
	}
}
