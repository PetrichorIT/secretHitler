const CustomError = (msg: string, code?: number): Error => {
	const e = Error(msg);
	if (code) {
		Object.assign(e, { code: code });
	}
	return e;
};

/**
 * Error Codes:
 *  401: Wrong Input Paramter Type
 *  402: Wrong Input Paramter Content
 *  404: Wrong Iternal State
 */

type SelectorFunction = (element: any) => boolean;

export * from './adapters/sync';

interface m_object {
	[key: string]: any;
}

export interface FileIOAdapter {
	write(object: m_object): void;
	read(): m_object;
}

export interface WrapperActionObject {
	type: string;
	[key: string]: any;
}

export class Wrapper {
	private _parent: Wrapper | null;
	private _key: string | number | null;
	private _actions: Array<WrapperActionObject> = [];
	_adapter: FileIOAdapter | null = null;
	private _value: any = null;

	constructor(parent: Wrapper | null, name: string | number | null) {
		this._parent = parent;
		this._key = name;
	}

	//
	private _transformVal(): void {
		if (!this._value) this.value();
		this._actions.forEach((action) => {
			switch (action.type) {
				case 'set':
					if (action.key === '') {
						this._value = action.value;
						break;
					}
					this._value[action.key] = action.value;
					break;
				case 'push':
					this._value.push(action.value);
					break;
				case 'delete':
					this._value.splice(action.i, 1);
					break;
				case 'splice':
					this._value.splice(action.i, action.j);
					break;
				case 'filter':
					this._value.filter(action.fn);
					break;
				default:
					break;
			}
		});
	}

	/**
	 * @param {object} object
	 */
	defaults(object: object): Wrapper {
		if (this._parent) throw CustomError('this.defaults(...) is only allowed if this is the root node', 404);
		try {
			this._adapter!.read();
		} catch (e) {
			if (e.name === 'SyntaxError') {
				this._value = object;
			}
		}

		return this;
	}

	write(subval?: any, key?: string | number | null): Wrapper {
		this._transformVal();
		if (this._parent) {
			this._parent.write(this._value, this._key);
		} else {
			if (key && subval) {
				this._value[key] = subval;
			}
			this._adapter!.write(this._value);
		}
		return this;
	}

	value(): any {
		if (this._key && this._key === '___undefined') return null;
		if (this._value) return this._value;
		if (this._parent) {
			const pv = this._parent.value();
			if (!pv) return null;
			this._value = pv[this._key!];
		} else {
			this._value = this._adapter!.read();
		}
		return this._value;
	}

	get(key: string | number): Wrapper {
		return new Wrapper(this, key);
	}

	set(key: string | number, value: any): Wrapper {
		this._actions.push({ type: 'set', key, value: value || undefined });
		return this;
	}

	// Array Methods

	private _selector(selector: m_object | SelectorFunction): SelectorFunction {
		if (typeof selector === 'object') {
			const propNames = Object.getOwnPropertyNames(selector);
			return (element: any): boolean => {
				let valid = true;
				for (let i = 0; i < propNames.length; i++) {
					const value = element[propNames[i]];
					valid = value && valid;
					valid = value === selector[propNames[i]] && valid;
					if (!valid) {
						break;
					}
				}

				return valid;
			};
		} else {
			return selector;
		}
	}

	find(selector: m_object | SelectorFunction): Wrapper {
		if (!(this.value() instanceof Array))
			throw CustomError('this.find(...) is only allowd if this.value() is of type Array', 404);
		const fn = this._selector(selector);
		for (let j = 0; j < this._value.length; j++) {
			if (fn(this._value[j])) {
				return this.get(j);
			}
		}
		return this.get('___undefined');
	}

	findall(selector: m_object | SelectorFunction): Wrapper[] {
		if (!(this.value() instanceof Array))
			throw CustomError('this.find(...) is only allowd if this.value() is of type Array', 404);
		const wp: Wrapper[] = [];
		const fn = this._selector(selector);
		for (let j = 0; j < this._value.length; j++) {
			if (fn(this._value[j])) {
				wp.push(this.get(j));
			}
		}
		return wp;
	}

	push(value: any): Wrapper {
		if (!(this.value() instanceof Array))
			throw CustomError('this.push(...) is only allowd if this.value() is of type Array', 404);
		this._actions.push({ type: 'push', value });
		return this;
	}

	remove(selector: m_object | SelectorFunction): Wrapper {
		if (!(this.value() instanceof Array))
			throw CustomError('this.remove(...) is only allowd if this.value() is of type Array', 404);
		const fn = this._selector(selector);
		for (let j = 0; j < this._value.length; j++) {
			if (fn(this._value[j])) {
				this._actions.push({ type: 'delete', i: j });
				break;
			}
		}
		return this;
	}

	removeall(selector: m_object | SelectorFunction): Wrapper {
		if (!(this.value() instanceof Array))
			throw CustomError('this.remove(...) is only allowd if this.value() is of type Array', 404);
		this._actions.push({ type: 'filter', fn: this._selector(selector) });
		return this;
	}

	splice(i: number, j: number): Wrapper {
		if (!(this.value() instanceof Array)) throw Error('splice only works on Array');
		if (i < 0) throw Error('Index mut be >= 0');
		if (j <= 0) throw Error('Range mut be > 0');
		if (i + j >= this.value().length) throw Error('Indexoutofrange');
		this._actions.push({ type: 'splice', i, j });
		return this;
	}
}

export const jdb = (adapter: FileIOAdapter): Wrapper => {
	const wp = new Wrapper(null, null);
	wp._adapter = adapter;
	return wp;
};

export default jdb;
