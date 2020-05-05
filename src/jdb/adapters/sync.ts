import fs, { PathLike } from 'fs';

export class SyncAdapter {
	private _path: string | PathLike;
	constructor(path: string | PathLike) {
		this._path = path;
	}

	read(): object {
		const bin = fs.readFileSync(this._path);
		return JSON.parse(bin.toString());
	}

	write(object: object): void {
		fs.writeFileSync(this._path, JSON.stringify(object));
	}
}

export default SyncAdapter;
