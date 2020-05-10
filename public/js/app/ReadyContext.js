class ReadyContext {
	constructor(socket) {
		this.container = document.querySelector('#readyContainer');
		this.checkbox = document.querySelector('#readyCheckbox');
		this.list = document.querySelector('#readyList');

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

	update(event) {
		let users = event.users;
		let str = '';
		for (const user of users) {
			str += `<li class="list-group-item d-flex justify-content-between align-items-center">${user.name}<span class="badge badge-${user.localState
				? 'danger'
				: 'success'} badge-pill">${user.localState ? 'Loading' : 'Ready'}</span></li>`;
		}
		this.list.innerHTML = str;
	}

	end() {
		this.container.style.display = 'none';
	}
}
