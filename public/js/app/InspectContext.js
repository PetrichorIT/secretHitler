class InspectContext {
	constructor(socket) {
		this.container = document.querySelector('#revealContainer');
		this.imageContainer = document.querySelector('#revealImageContainer');
		this.button = document.querySelector('#revealButton');

		this.button.addEventListener('click', () => {
			this.end();
		});

		this.socket = socket;
		this.event;
	}

	start(event) {
		this.container.style.display = 'block';
		this.event = event;

		if (event.type === 'inspectPlayer') {
			const { player } = event;

			const playerCard = document.createElement('div');
			playerCard.classList.add('staticCard');
			playerCard.style.transform = 'rotate(-20deg)';
			playerCard.style.border = '4px solid ' + player.color;
			playerCard.innerHTML = `<img src="img/portraits/${player.image}.png" alt="profileImage">` + player.name;
			this.imageContainer.append(playerCard);

			const factionCard = document.createElement('img');
			factionCard.src = player.faction ? 'img/faction-fasho.png' : 'img/faction-liberal.png';
			factionCard.style.transform = 'rotate(20deg)';
			this.imageContainer.append(factionCard);
		}

		if (event.type === 'inspectLaws') {
			let baseDeg = -15;
			for (const law of event.laws) {
				const element = document.createElement('img');
				element.src = law ? 'img/law-fasho.png' : 'img/law-liberal.png';
				element.style.transform = 'rotate(' + baseDeg + 'deg)';
				this.imageContainer.append(element);
				baseDeg += 15;
			}
		}
	}
	end() {
		this.container.style.display = 'none';
		this.imageContainer.innerHTML = '';
		this.socket.send(JSON.stringify({ type: 'ingame', event: { type: this.event.type + '-response' } }));
	}
}
