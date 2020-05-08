class WinContext {
	constructor() {
		this.container = document.querySelector('#winContainer');
		this.titleContainer = document.querySelector('#winTitle');
		this.list = document.querySelector('#winList');
	}

	start(event) {
		if (event.type === 'win') {
			this.container.style.display = 'block';
			this.titleContainer.innerHTML = (event.fashosWon ? 'Fashos' : 'Liberals') + ' won !';
			socket.close();
		}

		if (event.type === 'abort') {
			this.container.style.display = 'block';
			this.titleContainer.innerHTML = 'Game paused';
			socket.close();
		}
	}
}
