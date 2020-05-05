class VoteContext {
	constructor(socket) {
		this.container = document.querySelector('#voteContainer');
		this.titleContainer = document.querySelector('#voteTitle');
		this.yesImage = document.querySelector('#yesImage');
		this.noImage = document.querySelector('#noImage');

		this.socket = socket;
		this.canidateId;

		this.yesImage.addEventListener('click', (e) => {
			this.sendVote(true);
		});

		this.noImage.addEventListener('click', (e) => {
			this.sendVote(false);
		});
	}

	start(playerId) {
		this.canidateId = playerId;
		this.container.style.display = 'block';

		let index = gameContext.players.findIndex((p) => p.id === playerId);
		let name = gameContext.players[index].name;

		this.titleContainer.innerHTML = 'Vote for ' + name;
	}

	sendVote(agreed) {
		this.socket.send(JSON.stringify({ type: 'ingame', event: { type: 'votedChancellor', vote: agreed } }));
		(agreed ? this.yesImage : this.noImage).classList.add('selected');
		(agreed ? this.noImage : this.yesImage).classList.remove('selected');
	}

	end(result) {
		this.yesImage.style.display = 'none';
		this.noImage.style.display = 'none';
		this.titleContainer.innerHTML = 'Vote ' + (result ? 'successful' : 'failed');
		this.titleContainer.style.fontSize = '50pt';

		setTimeout(() => {
			this.container.style.display = 'none';
			this.yesImage.classList.remove('selected');
			this.noImage.classList.remove('selected');
			this.titleContainer.style.fontSize = '30pt';
			this.yesImage.style.display = 'block';
			this.noImage.style.display = 'block';
		}, 1000);
	}
}
