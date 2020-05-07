class VetoContext {
	constructor(socket) {
		this.container = document.querySelector('#vetoContainer');
		this.yesImage = document.querySelector('#vetoYesImage');
		this.noImage = document.querySelector('#vetoNoImage');

		this.socket = socket;

		this.yesImage.addEventListener('click', (e) => {
			this.sendVote(true);
		});

		this.noImage.addEventListener('click', (e) => {
			this.sendVote(false);
		});
	}

	start() {
		this.container.style.display = 'block';
	}

	sendVote(agreed) {
		this.socket.send(JSON.stringify({ type: 'ingame', event: { type: 'presidentVeto', veto: agreed } }));
		this.end();
	}

	end() {
		this.container.style.display = 'none';
	}
}
