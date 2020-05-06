class VoteContext {
	constructor(socket) {
		this.container = document.querySelector('#voteContainer');
		this.titleContainer = document.querySelector('#voteTitle');
		this.yesImage = document.querySelector('#yesImage');
		this.noImage = document.querySelector('#noImage');

		this.voteResultsContainer = document.querySelector('.voteResultsContainer');

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

		if (this.voteResultsContainer.childElementCount === 0) {
			for (const player of gameContext.players) {
				const element = document.createElement('div');

				const playerCard = document.createElement('div');
				playerCard.classList.add('staticCard');
				playerCard.style.border = '4px solid ' + player.color;
				playerCard.innerHTML = `<img src="img/portraits/${player.image}.png" alt="profileImage">` + player.name;
				element.append(playerCard);

				const yesCard = document.createElement('img');
				yesCard.hidden = true;
				yesCard.id = 'yes-' + player.name;
				yesCard.src = 'img/yes.png';
				yesCard.alt = 'YES';
				yesCard.style.height = '200px';
				element.append(yesCard);

				const noCard = document.createElement('img');
				noCard.hidden = true;
				noCard.id = 'no-' + player.name;
				noCard.src = 'img/no.png';
				noCard.alt = 'no';
				noCard.style.height = '200px';
				element.append(noCard);

				this.voteResultsContainer.append(element);
			}
		}
	}

	sendVote(agreed) {
		this.socket.send(JSON.stringify({ type: 'ingame', event: { type: 'votedChancellor', vote: agreed } }));
		(agreed ? this.yesImage : this.noImage).classList.add('selected');
		(agreed ? this.noImage : this.yesImage).classList.remove('selected');
	}

	end(event) {
		this.yesImage.style.display = 'none';
		this.noImage.style.display = 'none';
		this.titleContainer.innerHTML = 'Vote ' + (event.result ? 'successful' : 'failed');
		this.titleContainer.style.fontSize = '50pt';

		this.voteResultsContainer.hidden = false;
		for (const username in event.results) {
			const vote = event.results[username];
			document.querySelector(`#${vote ? 'yes' : 'no'}-${username}`).hidden = false;
			console.log(`#${vote ? 'yes' : 'no'}-${username} show`);
			document.querySelector(`#${vote ? 'no' : 'yes'}-${username}`).hidden = true;
			console.log(`#${vote ? 'no' : 'yes'}-${username} hide`);
		}

		setTimeout(() => {
			this.voteResultsContainer.hidden = true;
			this.container.style.display = 'none';
			this.yesImage.classList.remove('selected');
			this.noImage.classList.remove('selected');
			this.titleContainer.style.fontSize = '30pt';
			this.yesImage.style.display = 'block';
			this.noImage.style.display = 'block';
		}, 3000);
	}
}
