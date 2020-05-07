class WinContext {
	constructor() {
		this.container = document.querySelector('#winContainer');
		this.titleContainer = document.querySelector('#winTitle');
		this.list = document.querySelector('#winList');
	}

	start(event) {
		this.container.style.display = 'block';
		this.titleContainer.innerHTML = (event.fashosWon ? 'Fashos' : 'Liberals') + ' won !';

		socket.close();
	}
}
