const gameTitleField = document.querySelector('#gameTitle');
const createButton = document.querySelector('#loginSubmit');

const usRegExp = new RegExp(/^[a-zA-Z0-9]+([_ -]?[a-zA-Z0-9])*$/);

gameTitleField.addEventListener('keyup', (e) => {
	checkGameTitle();
	if (e.keyCode === 13) passwordField.focus();
});
createButton.addEventListener('click', checkCreateData);

function checkGameTitle() {
	if (!gameTitleField.value.match(usRegExp)) {
		gameTitleField.classList.remove('is-valid');
		gameTitleField.classList.add('is-invalid');
		return false;
	} else {
		gameTitleField.classList.add('is-valid');
		gameTitleField.classList.remove('is-invalid');
		return true;
	}
}

function checkCreateData() {
	const u = checkGameTitle();

	if (u) {
		var xhr = new XMLHttpRequest();
		xhr.open('POST', '/new', true);
		xhr.setRequestHeader('Content-Type', 'application/json');
		xhr.onreadystatechange = function(e) {
			if (this.readyState === XMLHttpRequest.DONE) {
				window.location = '/' + gameTitleField.value;
			}
		};
		xhr.send(JSON.stringify({ gameTitle: gameTitleField.value }));
	}
}
