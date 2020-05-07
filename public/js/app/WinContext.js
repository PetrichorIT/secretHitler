class WinContext {
	constructor() {
		this.container = document.querySelector('#winContainer');
		this.titleContainer = document.querySelector('#winTitle');
		this.list = document.querySelector('#winList');
	}

	start(event) {
		this.titleContainer.innerHTML = (event.fashosWon ? 'Fashos' : 'Liberals') + ' won !';

		socket.close();
	}
}
