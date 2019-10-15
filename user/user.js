const promisify = require('../utils/promisify.js');
const fs = require('fs');
const crypto = require('crypto');
const vaild = require('../utils/vaild.js');
const SESSION_TOKEN_EXPIRE_TIME = 60 * 1000;
class User {
	constructor() {
		this.tokens = new Map();
		this.sessions = new Map();
		this.ops = 0;
	}
	async init() {
		this.salt = await promisify(fs.readFile)('./user/salt.dat', { encoding: 'utf-8' });
		this.users = new Map(
			(await promisify(fs.readFile)('./user/users.dat', { encoding: 'utf-8' }))
				.split('\n')
				.filter(s => s.length !== 0)
				.map(s => s
					.split(' ', 2)
					.filter(t => t.length !== 0)
				)
				.filter(a => a.length === 2)
		);
	}
	checkUsername(input) {
		return vaild.string(input, { length: { min: 3, max: 20 }, hint: 'username' });
	}
	checkPassword(input) {
		return vaild.string(input, { length: { min: 6, max: 64 }, hint: 'password' });
	}
	encode(username, password) {
		if (username.includes('\n')) {
			throw new Error('Why?');
		}
		let hash = crypto.createHmac('sha256', this.salt);
		hash.update(username);
		if (password !== undefined) {
			hash.update('\n');
			hash.update(password);
		}
		return hash.digest('base64');
	}
	register(username, password) {
		username = this.checkUsername(username);
		password = this.checkPassword(password);
		let key = this.encode(username);
		if (this.users.has(key)) {
			throw new Error('user name exists');
		}
		this.users.set(key, this.encode(username, password));
	}
	clean() {
		this.ops += 2;
		if (this.ops >= this.tokens.size) {
			this.ops = 0;
			let now = Date.now();
			let deletes = [];
			this.tokens.forEach(({ expire }, token) => {
				if (now >= expire) {
					deletes.push(token);
				}
			});
			deletes.forEach(token => {
				this.tokens.delete(token);
			});
		}
	}
	getSession(token) {
		this.clean();
		let session = this.tokens.get(token);
		if (session === undefined) {
			return undefined;
		}
		if (Date.now() >= session.expire) {
			this.removeSession(session.username);
			return undefined;
		}
		return session;
	}
	addSession(username) {
		let tkAr = [];
		crypto.randomBytes(32).forEach(x => tkAr.push((x >> 4).toString(16), (x & 0xf).toString(16)));
		let token = tkAr.join('');
		let session = {
			username,
			token,
			expire: Date.now() + SESSION_TOKEN_EXPIRE_TIME,
		}
		if (this.sessions.has(username)) {
			this.removeSession(username);
		}
		this.tokens.set(token, session);
		this.sessions.set(username, session);
		return token;
	}
	removeSession(username) {
		let session = this.sessions.get(username);
		if (session !== undefined) {
			this.sessions.delete(username);
			this.tokens.delete(session.token);
		}
	}
	login(username, password) {
		username = this.checkUsername(username);
		password = this.checkPassword(password);
		let key = this.encode(username);
		let x = this.users.get(key);
		if (x !== this.encode(username, password)) {
			throw new Error('username or password is wrong');
		}
		let token = this.addSession(username);
		this.clean();
		return token;
	}
	startExpire(token) {
		let session = this.getSession(token);
		if (session !== undefined) {
			session.expire = Date.now() + SESSION_TOKEN_EXPIRE_TIME;
		}
	}
	stopExpire(token) {
		let session = this.getSession(token);
		if (session !== undefined) {
			session.expire = Infinity;
		}
	}
	getUsername(token) {
		let session = this.getSession(token);
		if (session !== undefined) {
			return session.username;
		}
		else {
			throw new Error('Why?');
		}
	}
};
module.exports = User;