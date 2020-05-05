const usernameField = document.querySelector('#username');
const passwordField = document.querySelector('#password');
const password2Field = document.querySelector('#password2');
const submitButton = document.querySelector('#registerSubmit');

const pwRegExp = new RegExp(/^(?=.*[a-z])(?=.*[A-Z]).{8,}$/);
const usRegExp = new RegExp(/^[a-zA-Z0-9]+([_ -]?[a-zA-Z0-9])*$/);

usernameField.addEventListener('keyup', (e) => {
	checkUsernameField();
	if (e.keyCode === 13) passwordField.focus();
});

passwordField.addEventListener('keyup', (e) => {
	checkPasswordField();
	if (e.keyCode === 13) password2Field.focus();
});

password2Field.addEventListener('keyup', (e) => {
	checkPassword2Field();
	if (e.keyCode === 13) checkRegisterData();
});

submitButton.addEventListener('click', checkRegisterData);

function checkUsernameField() {
	if (!usernameField.value.match(usRegExp)) {
		usernameField.classList.remove('is-valid');
		usernameField.classList.add('is-invalid');
		return false;
	} else {
		usernameField.classList.add('is-valid');
		usernameField.classList.remove('is-invalid');
		return true;
	}
}

function checkPasswordField() {
	if (!passwordField.value.match(pwRegExp)) {
		passwordField.classList.remove('is-valid');
		passwordField.classList.add('is-invalid');
		return false;
	} else {
		passwordField.classList.add('is-valid');
		passwordField.classList.remove('is-invalid');
		return true;
	}
}

function checkPassword2Field() {
	if (password2Field.value !== passwordField.value || passwordField.value === '') {
		password2Field.classList.remove('is-valid');
		password2Field.classList.add('is-invalid');
		return false;
	} else {
		password2Field.classList.add('is-valid');
		password2Field.classList.remove('is-invalid');
		return true;
	}
}

function checkRegisterData() {
	const username = usernameField.value;
	const u = checkUsernameField();

	const password = passwordField.value;
	const p = checkPasswordField();
	const p2 = checkPassword2Field();

	console.log(username, password);

	if (u && p && p2) {
		var xhr = new XMLHttpRequest();
		xhr.open('POST', '/register', true);
		xhr.setRequestHeader('Content-Type', 'application/json');
		xhr.onreadystatechange = function(e) {
			if (this.readyState === XMLHttpRequest.DONE) {
				if (this.status === 200) {
					login(username, password);
				}
				if (this.status === 400) {
					const obj = JSON.parse(this.responseText);
					if (obj.type !== 'error') return alert('An unkown error has occured');
					alert(obj.error);
				}
			}
		};
		xhr.send(JSON.stringify({ username, password }));
	}
}

function login(username, password) {
	var xhr = new XMLHttpRequest();
	xhr.open('POST', '/login', true);
	xhr.setRequestHeader('Authorization', 'Basic ' + btoa(`${username}:${password}`));
	xhr.onreadystatechange = function(e) {
		if (this.readyState === XMLHttpRequest.DONE) {
			if (this.status === 200) {
				const obj = JSON.parse(this.responseText);
				if (obj.type !== 'success') return alert('An unexpected error has occured');
				setStoredValue('sh.connect.sid', obj.sid, 1);
				window.location = '/';
			}

			if (this.status === 400) {
				const obj = JSON.parse(this.responseText);
				if (obj.type !== 'error') return alert('An unexpected error has occured');
				alert(obj.error);
			}
		}
	};
	xhr.send(null);
}
