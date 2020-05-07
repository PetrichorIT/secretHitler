const factionImg = document.querySelector('.factionPicture');
const roleImg = document.querySelector('.rolePicture');
const gameStateContainer = document.querySelector('.gameStateContainer');

var socket;
var username;

var readyContext;
var gameContext;
var selectionContext;
var voteContext;
var vetoContext;
var lawsContext;
var winContext;

function main(gameId) {
	const sid = getStoredValue('sh.connect.sid') || false;
	if (sid === false) {
		return (window.location = '/');
	}

	const socketProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
	const socketUrl = socketProtocol + '//' + window.location.hostname + ':' + window.location.port + '/' + gameId;
	socket = new WebSocket(socketUrl);

	socket.onopen = () => {
		gameContext = new GameContext();
		readyContext = new ReadyContext(socket);
		voteContext = new VoteContext(socket);
		vetoContext = new VetoContext(socket);
		selectionContext = new SelectionContext(socket);
		lawsContext = new LawsContext(socket);
		winContext = new WinContext();

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
						// Connection Lifecycle

						case 'requestReadyForGame':
							readyContext.start();
							break;
						case 'waitingState':
							readyContext.update(obj.event.users);
							break;
						case 'startup':
							readyContext.end();
							break;

						// Main Lifecycle

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
						case 'localState':
							gameContext.updateLocal(obj.event.players);
							break;

						case 'selectChancellor':
							selectionContext.start(obj.event);
							break;

						// VOTING
						case 'voteChancellor':
							voteContext.start(obj.event.chancellor);
							break;
						case 'votingEnded':
							voteContext.end(obj.event);
							break;

						// LAWS
						case 'presidentLaws':
							lawsContext.start(obj.event);
							break;

						case 'chancellorLaws':
							lawsContext.start(obj.event);
							break;

						case 'requestingVeto':
							vetoContext.start();
							break;

						// Effects
						case 'selectKill':
							selectionContext.start(obj.event);
							break;

						case 'kill':
							alert('You are dead');
							break;

						// End
						case 'win':
							winContext.start(obj.event);
							break;
					}
					break;
				case 'whoami':
					username = obj.username;
					break;

				case 'error':
					alert(obj.error);
					break;
			}
		} catch (err) {
			console.error(err);
			alert(err);
		}
	};
}

function updateGlobalGameState(event) {
	gameContext.update(event);

	// DEBUG
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
