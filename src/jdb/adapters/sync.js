"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var fs_1 = __importDefault(require("fs"));
var SyncAdapter = /** @class */ (function () {
    function SyncAdapter(path) {
        this._path = path;
    }
    SyncAdapter.prototype.read = function () {
        var bin = fs_1.default.readFileSync(this._path);
        return JSON.parse(bin.toString());
    };
    SyncAdapter.prototype.write = function (object) {
        fs_1.default.writeFileSync(this._path, JSON.stringify(object));
    };
    return SyncAdapter;
}());
exports.SyncAdapter = SyncAdapter;
exports.default = SyncAdapter;
