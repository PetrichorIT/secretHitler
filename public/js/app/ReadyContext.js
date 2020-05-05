class ReadyContext {
	constructor(socket) {
		this.container = document.querySelector('#readyContainer');
		this.checkbox = document.querySelector('#readyCheckbox');

		this.socket = socket;

		this.checkbox.addEventListener('click', (e) => {
			this.sendReady();
		});
	}

	start() {
		this.container.style.display = 'block';
	}

	sendReady() {
		if (this.checkbox.value === 'on') {
			this.checkbox.disabled = 'true';
			socket.send(
				JSON.stringify({
					type: 'ingame',
					event: {
						type: 'readyForGame'
					}
				})
			);
		}
	}

	end() {
		this.container.style.display = 'none';
	}
}
