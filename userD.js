const promisify = require('./utils/promisify.js');
const fs = require('fs');
const crypto = require('crypto');
const vaild = require('./utils/vaild.js');
const SESSION_TOKEN_EXPIRE_TIME = 60 * 1000;
class UserD {
	constructor(users = new Map(), salt = this.genToken()) {
		this.tokens = new Map();
		this.sessions = new Map();
		this.users = users;
		this.salt = vaild.string(salt, { hint: 'salt' });
		this.ops = 0;
	}
	async init() {
		this.salt = await promisify(fs.readFile)('./user/salt.dat', { encoding: 'utf-8' });
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
	genToken() {
		let tkAr = [];
		crypto.randomBytes(32).forEach(x => tkAr.push((x >> 4).toString(16), (x & 0xf).toString(16)));
		return tkAr.join('');
	}
	addSession(username) {
		this.clean();
		let token = this.genToken();
		let session = {
			username,
			token,
			expire: Date.now() + SESSION_TOKEN_EXPIRE_TIME,
			callbacks: {
				remove: [],
			},
			on(event, callback) {
				this.callbacks[event].push(callback);
			},
			emit(event) {
				this.callbacks[event].forEach(c => c.call(this));
			},
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
			session.emit('remove');
		}
	}
	verify(username, password) {
		let key = this.encode(username);
		let x = this.users.get(key);
		return x === this.encode(username, password);
	}
	login(username, password) {
		username = this.checkUsername(username);
		password = this.checkPassword(password);
		if (!this.verify(username, password)) {
			throw new Error('username or password is wrong');
		}
		let token = this.addSession(username);
		this.clean();
		return token;
	}
	changePassword(username, oldPw, newPw) {
		username = this.checkUsername(username);
		oldPw = this.checkPassword(oldPw);
		newPw = this.checkPassword(newPw);
		if (!this.verify(username, oldPw)) {
			throw new Error('username or password is wrong');
		}
		this.removeSession(username);
		this.users.set(this.encode(username), this.encode(username, newPw));
		this.clean();
	}
	startExpire(token) {
		let session = this.getSession(token);
		if (session !== undefined) {
			session.expire = Date.now() + SESSION_TOKEN_EXPIRE_TIME;
		}
		this.clean();
	}
	stopExpire(token) {
		let session = this.getSession(token);
		if (session !== undefined) {
			session.expire = Infinity;
		}
		this.clean();
	}
	toJSON() {
		return {
			users: Array.from(this.users),
			salt: this.salt,
		};
	}
	static fromJSON(data) {
		const { users, salt } = data;
		return new UserD(new Map(users), salt);
	}
};
module.exports = UserD;