const factionImg = document.querySelector('.factionPicture');
const roleImg = document.querySelector('.rolePicture');

var socket;
var username;

var readyContext;
var gameContext;
var selectionContext;
var voteContext;
var vetoContext;
var lawsContext;
var winContext;
var inspectContext;

let knownHitler = null;
let knownFasho = null;
let isDead = false;

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
		inspectContext = new InspectContext(socket);
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
					if (obj.event.type.startsWith('select')) {
						selectionContext.start(obj.event);
						break;
					}

					if (obj.event.type.startsWith('inspect')) {
						inspectContext.start(obj.event);
						break;
					}

					switch (obj.event.type) {
						case 'requestReadyForGame':
							readyContext.start();
							break;

						case 'waitingState':
							readyContext.update(obj.event.users);
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

							if (obj.event.hitler !== undefined) knownHitler = obj.event.hitler;
							if (obj.event.fasho !== undefined) knownFasho = obj.event.fasho;
							break;

						case 'globalGameState':
							gameContext.update(event);
							break;

						case 'localState':
							gameContext.updateLocal(obj.event.players);
							break;

						case 'voteChancellor':
							voteContext.start(obj.event.chancellor);
							break;
						case 'votingEnded':
							voteContext.end(obj.event);
							break;

						case 'presidentLaws':
							lawsContext.start(obj.event);
							break;

						case 'chancellorLaws':
							lawsContext.start(obj.event);
							break;

						case 'requestingVeto':
							vetoContext.start();
							break;

						case 'kill':
							alert('You are dead');
							isDead = true;
							break;

						case 'win':
							winContext.start(obj.event);
							break;
					}
					break;
				case 'whoami':
					username = obj.username;
					break;

				case 'error':
					if ((obj.error = '_invalid_sid')) {
						window.location = '/login';
					}
					break;
			}
		} catch (err) {
			console.error(err);
			alert(err);
		}
	};
}
