const { integer, boolean } = require('../utils/vaild.js');
const { randomInteger } = require('../utils/random.js');
const Game = require('./game-base.js');
const START_TIMEOUT = 60 * 1000;
module.exports = class MatchGame extends Game {
	constructor(settings) {
		super(settings);
		const { minPlayer = 2, maxPlayer = Infinity } = settings;
		this.minPlayer = integer(minPlayer, { hint: 'minPlayer', min: 1 });
		this.maxPlayer = integer(maxPlayer, { hint: 'maxPlayer', min: this.minPlayer, allows: [Infinity] });
		this.players = [];
		this.playerIndexs = new Map();
		this.isStarted = false;
		this.time = -Infinity;
		this.readyCount = 0;
		this.onlineCount = 0;
		this.startTime = null;
		let getter = key => this[key];
		this.info = {
			get isStarted() {
				return getter('isStarted');
			},
			get player() {
				return getter('isStarted') ? `${getter('players').length} players` : `${getter('readyCount')}/${getter('players').length} ready`;
			}
		};
	}
	playerCount() {
		return this.players.length;
	}
	canJoin(id) {
		if (this.playerIndexs.has(id)) {
			return true;
		}
		else {
			return !this.isStarted
				&& this.playerCount() < this.maxPlayer;
		}
	}
	updateReadyState() {
		if (this.startTime !== null) {
			if (this.playerCount() < this.minPlayer) {
				this.startTime = null;
			}
		}
		else {
			if (this.playerCount() >= this.minPlayer) {
				this.startTime = this.time + START_TIMEOUT;
			}
		}
		for (let { callback } of this.players) {
			callback(['ready_state', {
				player_count: this.playerCount(),
				ready_count: this.readyCount,
				start_time: this.startTime === null ? null : this.startTime - this.time,
			}]);
		}
		if (!this.isStarted && this.playerCount() >= this.minPlayer && this.readyCount === this.playerCount()) {
			this.isStarted = true;
			this.emit('start');
		}
	}
	join(id, callback) {
		this.onlineCount += 1;
		if (this.isStarted) {
			let index = this.playerIndexs.get(id);
			let player = this.players[index];
			player.callback = callback;
			player.isOnline = true;
		}
		else {
			this.players.push({
				id,
				callback,
				isReady: false,
				isOnline: true,
			});
			let p = this.players;
			let swap = randomInteger(this.playerCount());
			let last = this.playerCount() - 1;
			([p[swap], p[last]] = [p[last], p[swap]]);
			this.playerIndexs.set(id, swap);
			this.playerIndexs.set(p[last].id, last);
			this.updateReadyState();
		}
	}
	leave(id) {
		this.onlineCount -= 1;
		let index = this.playerIndexs.get(id);
		let p = this.players;
		let player = p[index];
		if (this.isStarted) {
			player.callback = () => { };
			player.isOnline = false;
			if (this.onlineCount === 0) {
				this.emit('end');
			}
		}
		else {
			let last = this.playerCount() - 1;
			if (player.isReady) {
				this.readyCount -= 1;
			}
			([p[index], p[last]] = [p[last], p[index]]);
			this.playerIndexs.set(p[index].id, index);
			this.playerIndexs.delete(id);
			this.players.pop();
			this.updateReadyState();
		}
	}
	input(id, input) {
		let index = this.playerIndexs.get(id);
		let player = this.players[index];
		let [type, data] = input;
		switch (type) {
			case 'set_ready_state': {
				if (this.isStarted) {
					throw new Error('game is started');
				}
				let state = boolean(data, { hint: 'state' });
				if (state !== player.isReady) {
					if (state) {
						this.readyCount += 1;
					}
					else {
						this.readyCount -= 1;
					}
					player.isReady = state;
				}
				this.updateReadyState();
				break;
			}
			default: {
				this.emit('input', id, [type, data]);
				break;
			}
		}
	}
	setTime(timeStamp) {
		this.time = timeStamp;
		this.emit('time', this.time);
		if (!this.isStarted && this.startTime !== null && this.time >= this.startTime) {
			this.isStarted = true;
			this.emit('start');
		}
	}
	serialization() { }
	static unserialization(data) { }
};