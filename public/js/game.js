const factionImg = document.querySelector('.factionPicture');
const roleImg = document.querySelector('.rolePicture');
const gameStateContainer = document.querySelector('.gameStateContainer');

const readyForGameCard = document.querySelector('.readyCard');
const readyForGameCheckbox = document.querySelector('#ready');

var socket;

function readyForGame() {
	if (readyForGameCheckbox.value === 'on') {
		readyForGameCheckbox.disabled = 'true';
		sendEvent({ type: 'readyForGame' });
	}
}

function main(gameId) {
	const sid = getCookie('sh.connect.sid') || false;
	if (sid === false) {
		return (window.location = '/');
	}

	const socketProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
	const socketUrl = socketProtocol + '//' + window.location.hostname + ':' + window.location.port + '/' + gameId;
	socket = new WebSocket(socketUrl);

	socket.onopen = () => {
		socket.send(
			JSON.stringify({
				type: 'authenticate',
				sid
			})
		);
	};

	socket.onmessage = (msg) => {
		try {
			const obj = JSON.parse(msg.data);
			switch (obj.type) {
				case 'ingame':
					switch (obj.event.type) {
						case 'requestReadyForGame':
							readyForGameCard.style.display = 'block';
							break;

						case 'startup':
							readyForGameCard.remove();
							break;

						case 'role':
							if (!obj.event.role) return;
							const factionImage = obj.event.role.isFasho
								? 'img/faction-fasho.png'
								: 'img/faction-liberal.png';
							factionImg.src = factionImage;

							const roleImage = obj.event.role.isHitler
								? 'img/role-hitler.png'
								: obj.event.role.isFasho ? 'img/role-fasho.png' : 'img/role-liberal.png';
							roleImg.src = roleImage;
							break;

						case 'globalGameState':
							updateGlobalGameState(obj.event);
							break;

						case 'selectChancellor':
							const ignore = obj.event.ignorePlayers;
							console.log(ignore);
							const vote = ignore[0] == 1 ? 0 : 1;
							sendEvent({ type: 'selectChancellor', selection: vote });

							break;
						case 'voteChancellor':
							startVoteSession(obj.event.chancellor);
							break;
					}
					break;
				case 'error':
					alert(obj.error);
					break;
			}
		} catch (err) {
			console.log(err);
		}
	};
}

function updateGlobalGameState(event) {
	gameStateContainer.innerHTML = JSON.stringify(event);
}

// VOTING

const voteContainer = document.querySelector('.voteContainer');
const voteTitle = document.querySelector('.voteTitle');
let votePlayerId;
function startVoteSession(playerId) {
	votePlayerId = playerId;
	voteContainer.style.display = 'block';
	voteTitle.innerHTML = 'MAX';
}
function voteResult(agreed) {
	voteContainer.style.display = 'none';
	sendEvent({ type: 'voteChancellor', vote: agreed });
}

// GLOBAL

function sendEvent(event) {
	socket.send(
		JSON.stringify({
			type: 'ingame',
			event: event
		})
	);
}
