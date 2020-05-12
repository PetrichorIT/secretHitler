const printGroups: { [key: string]: string } = {
	Ws: '\u{001b}[0;31m',
	Get: '\u{001b}[0;36m',
	Post: '\u{001b}[0;36m',
	Error: '\u{001b}[1;31m',
	Game: '\u{001b}[0;35m'
};

export function print(printGroup: string, msg: string) {
	const color = printGroups[printGroup];
	if (!color) return;
	console.log(`[ ${color}${printGroup}\u{001b}[0;39m ] ${msg}`);
}

export default print;
