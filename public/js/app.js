const factionImg = document.querySelector('.factionPicture');
const roleImg = document.querySelector('.rolePicture');
const gameStateContainer = document.querySelector('.gameStateContainer');

var socket;

var readyContext;
var gameContext;
var selectionContext;
var voteContext;

function main(gameId) {
	const sid = getStoredValue('sh.connect.sid') || false;
	if (sid === false) {
		return (window.location = '/');
	}

	const socketProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
	const socketUrl = socketProtocol + '//' + window.location.hostname + ':' + window.location.port + '/' + gameId;
	socket = new WebSocket(socketUrl);

	socket.onopen = () => {
		readyContext = new ReadyContext(socket);
		voteContext = new VoteContext(socket);
		selectionContext = new SelectionContext(socket);

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
							readyContext.start();
							break;

						case 'startup':
							readyContext.end();
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
							selectionContext.start(obj.event);
							break;

						// VOTING
						case 'voteChancellor':
							voteContext.start(obj.event.chancellor);
							break;
						case 'votingEnded':
							voteContext.end(obj.event.result);
					}
					break;
				case 'error':
					alert(obj.error);
					break;
			}
		} catch (err) {
			print('Err', err);
		}
	};
}

function updateGlobalGameState(event) {
	gameContext = event;
	gameStateContainer.innerHTML = JSON.stringify(event);
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
