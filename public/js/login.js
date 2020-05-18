const usernameField = document.querySelector('#username');
const passwordField = document.querySelector('#password');
const submitButton = document.querySelector('#loginSubmit');

const pwRegExp = new RegExp(/^(?=.*[a-z])(?=.*[A-Z]).{8,}$/);
const usRegExp = new RegExp(/^[a-zA-Z0-9]+([_ -]?[a-zA-Z0-9])*$/);

usernameField.addEventListener('keyup', (e) => {
	checkUsername();
	if (e.keyCode === 13) passwordField.focus();
});
passwordField.addEventListener('keyup', (e) => {
	checkPasswordField();
	if (e.keyCode === 13) checkCreateData();
});
submitButton.addEventListener('click', checkCreateData);

function checkUsername() {
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

function checkCreateData() {
	const u = checkUsername();
	const p = checkPasswordField();

	if (u && p) {
		var xhr = new XMLHttpRequest();
		xhr.open('POST', '/login', true);
		xhr.setRequestHeader('Authorization', 'Basic ' + btoa(`${usernameField.value}:${passwordField.value}`));
		xhr.onreadystatechange = function(e) {
			if (this.readyState === XMLHttpRequest.DONE) {
				if (this.status === 200) {
					const obj = JSON.parse(this.responseText);
					if (obj.type !== 'success') return alert('An unexpected error has occured');
					setStoredValue('sh.connect.sid', obj.sid, 1);
					window.location = '/' + REDIRECT;
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
}
