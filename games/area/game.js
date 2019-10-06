const { integer, boolean, array } = require('../../utils/vaild.js');
const Game = require('../game-base.js');
const MIN_SIZE = 1;
const MAX_SIZE = 2000;
const GRID_EMPTY = -1;
const GRID_BLOCK = -2;
const START_TIMEOUT = 60 * 1000;
module.exports = class Area extends Game {
	constructor(settings) {
		super(settings);
		const { height, width, maxPlayer, state } = settings;
		this.height = integer(height, { hint: 'height', min: MIN_SIZE, max: MAX_SIZE });
		this.width = integer(width, { hint: 'width', min: MIN_SIZE, max: MAX_SIZE });
		let size = this.height * this.width;
		this.maxPlayerCount = integer(maxPlayer, { hint: 'maxPlayer', min: 2, max: size });
		let getter = key => this[key];
		this.info = {
			id: 'area',
			get isStarted() {
				return getter('isStarted');
			},
			get player() {
				return getter('isStarted') ? `${getter('aliveCount')}/${getter('players').length} alive` : `${getter('readyCount')}/${getter('players').length} ready`;
			}
		};
		if (state === undefined || !boolean(state.isStarted, { hint: 'isStarted' })) {
			this.players = [];
			this.playerIndexs = new Map();
			this.isStarted = false;
			this.readyCount = 0;
			this.time = -Infinity;
			this.startTime = null;
		}
		else {
			this.players = array(state.players, { hint: 'players', length: { min: 0, max: this.maxPlayerCount } })
				.map(({ isAlive, edgeCount }) => ({
					isAlive: boolean(isAlive, { hint: 'isAlive' }),
					edgeCount: integer(edgeCount, { hint: 'edgeCount', min: 0 }),
					owns: [],
					queue: [],
				}));
			this.playerIndexs = new Map(array(state.playerIndexs, { hint: 'playerIndexs', length: this.playerCount() }));
			this.isStarted = true;
			this.map = array(state.map, { hint: 'map', length: this.height })
				.map((line, index) => array(line, { hint: `map[${index}]`, length: this.width })
					.map((grid, index2) => integer(grid, { hint: `map[${index}][${index2}]`, min: GRID_BLOCK, max: this.playerCount() - 1 })));
			for (let x = 0; x < this.height; x++) {
				for (let y = 0; y < this.width; y++) {
					let index = this.map[x][y];
					if (index >= 0) {
						this.players[index].owns.push({ x, y });
					}
				}
			}
			this.aliveCount = integer(state.aliveCount, { hint: 'aliveCount', min: 0, max: this.playerCount() });
			this.round = integer(state.round, { hint: 'round', min: 0 });
			this.turn = integer(state.turn, { hint: 'turn', min: 0, max: this.playerCount() - 1 });
			this.losers = array(state.losers, { hint: 'losers', length: { max: this.playerCount() - 1 } });
		}
	}
	playerCount() {
		return this.players.length;
	}
	sendState(index, reconnecting) {
		let callback = this.players[index].callback;
		if (this.isStarted) {
			if (reconnecting) {
				callback(['game_start', {
					player_index: index,
					player_list: this.players.map((player, index) => `player ${index}`),
					height: this.height,
					width: this.width,
				}]);
			}
			callback(['game_update', {
				round: this.round,
				turn: this.turn,
				map: this.map,
				losers: this.losers,
			}]);
		}
		else {
			callback(['ready_state', {
				player_count: this.playerCount(),
				ready_count: this.readyCount,
				start_time: this.startTime === null ? null : this.startTime - this.time,
			}]);
		}
	}
	canJoin(id) {
		return (
			!this.isStarted
			&& this.playerCount() < this.maxPlayerCount
		)
			|| this.playerIndexs.has(id);
	}
	join(id, callback) {
		if (!this.canJoin(id)) {
			throw new Error('cannot join');
		}
		let index = this.playerIndexs.get(id);
		if (index === undefined) {
			// new player
			index = this.playerCount();
			this.playerIndexs.set(id, index);
			this.players.push({
				isReady: false,
				id,
			});
		}
		this.players[index].callback = callback;
		this.players[index].queue = [];
		if (!this.isStarted) {
			if (this.startTime === null && this.playerCount() >= 2) {
				this.startTime = this.time + START_TIMEOUT;
			}
			this.update();
		}
		else {
			this.sendState(index, true);
		}
	}
	leave(id) {
		let index = this.playerIndexs.get(id);
		this.players[index].callback = () => { };
		if (!this.isStarted) {
			this.playerIndexs.delete(id);
			if (this.players[index].isReady) {
				this.players[index].isReady = false;
				this.readyCount -= 1;
			}
			let lastPlayer = this.players.pop();
			if (this.players.length !== index) {
				this.players[index] = lastPlayer;
				this.playerIndexs.set(lastPlayer.id, index);
			}
			if (this.startTime !== null && this.playerCount() < 2) {
				this.startTime = null;
			}
			this.update();
		}
	}
	startGame() {
		// console.log('Game Start!');
		this.isStarted = true;
		this.map = [];
		for (let x = 0; x < this.height; x++) {
			let line = [];
			this.map.push(line);
			for (let y = 0; y < this.width; y++) {
				line.push(GRID_EMPTY);
			}
		}
		this.round = 0;
		this.turn = 0;
		for (let index in this.players) {
			let player = this.players[index];
			player.edgeCount = 0;
			let x, y;
			do {
				x = Math.floor(Math.random() * this.height);
				y = Math.floor(Math.random() * this.width);
			} while (this.map[x][y] !== GRID_EMPTY);
			this.setGrid({ x, y }, parseInt(index));
			player.owns = [{ x, y }];
			player.queue = [];
			player.isAlive = true;
		}
		this.aliveCount = this.playerCount();
		this.losers = [];
		this.update(true);
	}
	getAdj({ x, y }) {
		let result = [];
		if (x - 1 >= 0) {
			result.push({ x: x - 1, y });
		}
		if (x + 1 < this.height) {
			result.push({ x: x + 1, y });
		}
		if (y - 1 >= 0) {
			result.push({ x, y: y - 1 });
		}
		if (y + 1 < this.width) {
			result.push({ x, y: y + 1 });
		}
		return result;
	}
	countAdj(pos) {
		let emptyCount = 0, playerAdj = [];
		const doit = (pos) => {
			const { x, y } = pos;
			if (this.map[x][y] === GRID_EMPTY) {
				emptyCount += 1;
			}
			else if (this.map[x][y] >= 0) {
				playerAdj.push(this.map[x][y]);
			}
		}
		this.getAdj(pos).forEach(doit);
		return { emptyCount, playerAdj };
	}
	setGrid(pos, value) {
		const { x, y } = pos;
		let old = this.map[x][y];
		if (old == value) {
			return;
		}
		this.map[x][y] = value;
		const { emptyCount, playerAdj } = this.countAdj(pos);
		if (old >= 0) {
			this.players[old].edgeCount -= emptyCount;
		}
		if (value >= 0) {
			this.players[value].edgeCount += emptyCount;
		}
		let isValueEmpty = value === GRID_EMPTY;
		if (isValueEmpty !== (old === GRID_EMPTY)) {
			let delta = isValueEmpty ? 1 : -1;
			playerAdj.forEach(index => {
				this.players[index].edgeCount += delta;
			});
		}
	}
	playerDeath(index) {
		for (let player of this.players) {
			player.callback(['player_lose', index]);
		}
		let player = this.players[index];
		player.isAlive = false;
		for (let pos of player.owns) {
			this.setGrid(pos, GRID_EMPTY);
		}
		this.losers.push(index);
		this.aliveCount -= 1;
	}
	canContinueLoop() {
		let player = this.players[this.turn];
		return !player.isAlive || player.edgeCount === 0 || player.queue.length > 0;
	}
	loop() {
		let needUpdate = false;
		while (this.canContinueLoop()) {
			const inc = () => {
				this.turn++;
				if (this.turn >= this.playerCount()) {
					this.turn = 0;
					this.round++;
				}
				needUpdate = true;
			}
			let index = this.turn;
			let player = this.players[index];
			if (!player.isAlive) {
				inc();
			}
			else if (player.edgeCount === 0) {
				this.playerDeath(index);
				needUpdate = true;
				inc();
			}
			else {
				do {
					let pos = player.queue.shift();
					let { x, y } = pos;
					if (this.map[x][y] !== GRID_EMPTY) {
						player.callback(['decide_fail', 'the grid is not empty']);
						continue;
					}
					if (!this.getAdj(pos).some(({ x, y }) => this.map[x][y] === index)) {
						player.callback(['decide_fail', 'the grid is not adjacent to owned grids']);
						continue;
					}
					player.callback(['decide_success', pos]);
					this.setGrid(pos, index);
					player.owns.push(pos);
					needUpdate = true;
					inc();
					break;
				} while (player.queue.length > 0);
			}
		}
		if (needUpdate) {
			this.update();
		}
	}
	update(arg = false) {
		for (let index in this.players) {
			this.sendState(parseInt(index), arg);
		}
		if (this.aliveCount === 1) {
			let winner = this.players.findIndex(player => player.isAlive);
			this.losers.push(winner);
			// reverse(losers) === rank
			this.losers.reverse();
			for (let player of this.players) {
				player.callback(['game_end', this.losers]);
			}
			this.emit('end');
		}
		if (!this.isStarted && this.playerCount() >= 2 && this.readyCount === this.playerCount()) {
			this.startGame();
		}
	}
	input(id, input) {
		let index = this.playerIndexs.get(id);
		let player = this.players[index];
		let { queue, callback } = player;
		let [type, data] = input;
		switch (type) {
			case 'set_ready_state': {
				if (this.isStarted) {
					throw new Error('game is started');
				}
				const isReady = boolean(data);
				if (player.isReady !== isReady) {
					if (isReady) {
						this.readyCount += 1;
					}
					else {
						this.readyCount -= 1;
					}
					player.isReady = isReady;
					this.update();
				}
				break;
			}
			case 'decide': {
				if (!this.isStarted) {
					throw new Error('game is not started');
				}
				const { x, y } = data;
				if (queue.length < 5) {
					queue.push({
						x: integer(x, { min: 0, max: this.height - 1, hint: 'x' }),
						y: integer(y, { min: 0, max: this.width - 1, hint: 'y' }),
					});
					callback(['queue_success', queue.length]);
					this.loop();
				}
				else {
					callback(['queue_fail', 'queue is full']);
				}
				break;
			}
			case 'queue_clear': {
				if (!this.isStarted) {
					throw new Error('game is not started');
				}
				player.queue = [];
				callback(['queue_success', 0]);
				break;
			}
			case 'queue_pop': {
				if (!this.isStarted) {
					throw new Error('game is not started');
				}
				const count = integer(data, { min: 1, hint: 'count' });
				if (count > queue.length) {
					count = queue.length;
				}
				queue.length -= count;
				callback(['queue_success', queue.length]);
				break;
			}
			default: {
				throw new Error('unknown input type');
			}
		}
	}
	setTime(timeStamp) {
		this.time = timeStamp;
		if (!this.isStarted && this.startTime !== null && this.time >= this.startTime) {
			this.startGame();
		}
	}
	serialization() {
		let settings = {
			height: this.height,
			width: this.width,
			maxPlayer: this.maxPlayerCount,
		};
		if (this.isStarted) {
			settings.state = {
				isStarted: true,
				round: this.round,
				turn: this.turn,
				playerIndexs: Array.from(this.playerIndexs),
				players: [],
				losers: this.losers,
			};
			for (let { isAlive, edgeCount } of this.players) {
				settings.state.players.push({
					isAlive,
					edgeCount,
				});
			}
			settings.state.map = this.map;
			settings.state.aliveCount = this.aliveCount;
		}
		else {
			settings.state = {
				isStarted: false,
			};
		}
		return JSON.stringify(settings);
	}
	static unserialization(data) {
		let result = JSON.parse(data);
		return new Area(result);
	}
}