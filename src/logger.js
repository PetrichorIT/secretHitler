const printGroups = {
	Ws: '\u{001b}[0;31m',
	Exp: '\u{001b}[0;35m',
	Get: '\u{001b}[0;36m',
	Post: '\u{001b}[0;36m',
	Error: '\u{001b}[1;31m'
};

const print = (printGroup, msg) => {
	const color = printGroups[printGroup];
	if (!color) return;
	console.log(`[ ${color}${printGroup}\u{001b}[0;39m ] ${msg}`);
};

module.exports.print = print;
