// function setCookie(cname, cvalue, exdays) {
// 	var d = new Date();
// 	d.setTime(d.getTime() + exdays * 24 * 60 * 60 * 1000);
// 	var expires = 'expires=' + d.toUTCString();
// 	document.cookie = cname + '=' + cvalue + ';' + expires + ';path=/';
// }

// function getCookie(cname) {
// 	var name = cname + '=';
// 	var decodedCookie = decodeURIComponent(document.cookie);
// 	var ca = decodedCookie.split(';');
// 	for (var i = 0; i < ca.length; i++) {
// 		var c = ca[i];
// 		while (c.charAt(0) == ' ') {
// 			c = c.substring(1);
// 		}
// 		if (c.indexOf(name) == 0) {
// 			return c.substring(name.length, c.length);
// 		}
// 	}
// 	return '';
// }

/**
 * 
 * @param {string} itemName 
 * @param {string} itemValue 
 */
function setStoredValue(itemName, itemValue) {
	// Store as Cookie
	var d = new Date();
	d.setTime(d.getTime() + undefined * 24 * 60 * 60 * 1000);
	var expires = 'expires=' + d.toUTCString();
	document.cookie = itemName + '=' + itemValue + ';' + expires + ';path=/';

	// Store in sessionStorage
	sessionStorage.setItem(itemName, itemValue);
}

/**
 * 
 * @param {string} itemName 
 */
function getStoredValue(itemName) {
	let value = sessionStorage.getItem(itemName);
	if (value === null) {
		var name = itemName + '=';
		var decodedCookie = decodeURIComponent(document.cookie);
		var ca = decodedCookie.split(';');
		for (var i = 0; i < ca.length; i++) {
			var c = ca[i];
			while (c.charAt(0) == ' ') {
				c = c.substring(1);
			}
			if (c.indexOf(name) == 0) {
				value = c.substring(name.length, c.length);
				setStoredValue(itemName, value);
				break;
			}
		}
	}
	return value;
}
