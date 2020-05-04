'use strict';
function __export(m) {
	for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, '__esModule', { value: true });
var CustomError = function(msg, code) {
	var e = Error(msg);
	if (code) {
		Object.assign(e, { code: code });
	}
	return e;
};
__export(require('./adapters/sync'));
var Wrapper /** @class */ = (function() {
	function Wrapper(parent, name) {
		this._actions = [];
		this._adapter = null;
		this._value = null;
		this._parent = parent;
		this._key = name;
	}
	//
	Wrapper.prototype._transformVal = function() {
		var _this = this;
		if (!this._value) this.value();
		this._actions.forEach(function(action) {
			switch (action.type) {
				case 'set':
					if (action.key === '') {
						_this._value = action.value;
						break;
					}
					_this._value[action.key] = action.value;
					break;
				case 'push':
					_this._value.push(action.value);
					break;
				case 'delete':
					_this._value.splice(action.i, 1);
					break;
				case 'splice':
					_this._value.splice(action.i, action.j);
					break;
				case 'filter':
					_this._value.filter(action.fn);
					break;
				default:
					break;
			}
		});
	};
	/**
     * @param {object} object
     */
	Wrapper.prototype.defaults = function(object) {
		if (this._parent) throw CustomError('this.defaults(...) is only allowed if this is the root node', 404);
		try {
			this._adapter.read();
		} catch (e) {
			if (e.name === 'SyntaxError') {
				this._value = object;
			}
		}
		return this;
	};
	Wrapper.prototype.write = function(subval, key) {
		this._transformVal();
		if (this._parent) {
			this._parent.write(this._value, this._key);
		} else {
			if (key && subval) {
				this._value[key] = subval;
			}
			this._adapter.write(this._value);
		}
		return this;
	};
	Wrapper.prototype.value = function() {
		if (this._key && this._key === '___undefined') return null;
		if (this._value) return this._value;
		if (this._parent) {
			var pv = this._parent.value();
			if (!pv) return null;
			this._value = pv[this._key];
		} else {
			this._value = this._adapter.read();
		}
		return this._value;
	};
	Wrapper.prototype.get = function(key) {
		return new Wrapper(this, key);
	};
	Wrapper.prototype.set = function(key, value) {
		this._actions.push({ type: 'set', key: key, value: value || undefined });
		return this;
	};
	// Array Methods
	Wrapper.prototype._selector = function(selector) {
		if (typeof selector === 'object') {
			var propNames_1 = Object.getOwnPropertyNames(selector);
			return function(element) {
				var valid = true;
				for (var i = 0; i < propNames_1.length; i++) {
					var value = element[propNames_1[i]];
					valid = value && valid;
					valid = value === selector[propNames_1[i]] && valid;
					if (!valid) {
						break;
					}
				}
				return valid;
			};
		} else {
			return selector;
		}
	};
	Wrapper.prototype.find = function(selector) {
		if (!(this.value() instanceof Array))
			throw CustomError('this.find(...) is only allowd if this.value() is of type Array', 404);
		var fn = this._selector(selector);
		for (var j = 0; j < this._value.length; j++) {
			if (fn(this._value[j])) {
				return this.get(j);
			}
		}
		return this.get('___undefined');
	};
	Wrapper.prototype.findall = function(selector) {
		if (!(this.value() instanceof Array))
			throw CustomError('this.find(...) is only allowd if this.value() is of type Array', 404);
		var wp = [];
		var fn = this._selector(selector);
		for (var j = 0; j < this._value.length; j++) {
			if (fn(this._value[j])) {
				wp.push(this.get(j));
			}
		}
		return wp;
	};
	Wrapper.prototype.push = function(value) {
		if (!(this.value() instanceof Array))
			throw CustomError('this.push(...) is only allowd if this.value() is of type Array', 404);
		this._actions.push({ type: 'push', value: value });
		return this;
	};
	Wrapper.prototype.remove = function(selector) {
		if (!(this.value() instanceof Array))
			throw CustomError('this.remove(...) is only allowd if this.value() is of type Array', 404);
		var fn = this._selector(selector);
		for (var j = 0; j < this._value.length; j++) {
			if (fn(this._value[j])) {
				this._actions.push({ type: 'delete', i: j });
				break;
			}
		}
		return this;
	};
	Wrapper.prototype.removeall = function(selector) {
		if (!(this.value() instanceof Array))
			throw CustomError('this.remove(...) is only allowd if this.value() is of type Array', 404);
		this._actions.push({ type: 'filter', fn: this._selector(selector) });
		return this;
	};
	Wrapper.prototype.splice = function(i, j) {
		if (!(this.value() instanceof Array)) throw Error('splice only works on Array');
		if (i < 0) throw Error('Index mut be >= 0');
		if (j <= 0) throw Error('Range mut be > 0');
		if (i + j >= this.value().length) throw Error('Indexoutofrange');
		this._actions.push({ type: 'splice', i: i, j: j });
		return this;
	};
	return Wrapper;
})();
exports.Wrapper = Wrapper;
exports.jdb = function(adapter) {
	var wp = new Wrapper(null, null);
	wp._adapter = adapter;
	return wp;
};
exports.default = exports.jdb;
