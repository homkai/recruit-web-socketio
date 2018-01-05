const path = require('path');
const SQLiteStore = require('koa-sqlite3-session');

exports.store = new SQLiteStore(path.resolve(__dirname, '../../temp/session.db'));

exports.ssKey = '8skdf345opg';
exports.ssPrefix = 'my-recruit-';

exports.getSid = cookieString => {
    const matches = new RegExp(exports.ssKey + '=([^;]+);', 'gmi').exec(cookieString);
    return matches[1] ? exports.ssPrefix + matches[1] : null;
};

exports.getSS = async sid => {
    return await exports.store.get(sid);
};