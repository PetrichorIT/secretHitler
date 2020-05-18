// Setup
const sid = getStoredValue('sh.connect.sid');
if (!sid || sid === '') window.location = '/login';
