// Setup

const sid = getCookie('sh.connect.sid');
if (!sid || sid === '') window.location = '/login';
