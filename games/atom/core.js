const { makeObject, makeArray, makeSet } = require('../../utils/map_maker.js');
const { forEach, map } = require('../../utils/two_dim.js');
const { size } = require('../../utils/object.js');
const vaild = require('../../utils/vaild.js');
const { InvaildError: InvalidError } = vaild;
const NORTH = 'n';
const WEST = 'w';
const SOUTH = 's';
const EAST = 'e';
const DIRECTIONS = [NORTH, WEST, SOUTH, EAST];
const TURN = {
	[NORTH]: WEST,
	[WEST]: SOUTH,
	[SOUTH]: EAST,
	[EAST]: NORTH,
};
const TURN_AROUND = makeObject($ => {
	for (let d of DIRECTIONS) {
		$(d, TURN[TURN[d]]);
	}
});
const DX = {
	[NORTH]: -1,
	[WEST]: 0,
	[SOUTH]: 1,
	[EAST]: 0,
};
const DY = {
	[NORTH]: 0,
	[WEST]: -1,
	[SOUTH]: 0,
	[EAST]: 1,
};
const MOUNTAIN = Symbol('MOUNTAIN');
const WATER = Symbol('WATER');
class Bridge {
	constructor(ins) {
		for (let d of DIRECTIONS) {
			this[d] = ins[d];
		}
	}
	is_corner() {
		return (this[NORTH] ^ this[SOUTH]) && (this[WEST] ^ this[EAST]) ? true : false;
	}
	toPlain() {
		return {
			entry: makeObject($ => {
				for (let d of DIRECTIONS) {
					$(d, this[d]);
				}
			}),
		};
	}
	static fromPlain(data) {
		return new Bridge(data.entry);
	}
};
class Tower {
	constructor(produce_per_round) {
		this.produce_per_round = produce_per_round;
	}
	toPlain() {
		return {
			produce_count: this.produce_per_round,
		};
	}
	static fromPlain(data) {
		return new Tower(data.produce_count);
	}
};
class SpawnPoint {
	constructor() { }
	toPlain() {
		return {};
	}
	static fromPlain() {
		return new SpawnPoint();
	}
};
class Grid {
	constructor({ owner, atoms, terrain, building }) {
		this.owner = owner;
		this.atoms = atoms;
		this.terrain = terrain;
		this.building = building;
	}
	can_place_atom() {
		return this.terrain === null && (this.building === null || (this.building instanceof SpawnPoint));
	}
	access(d) {
		return this.building instanceof Bridge
			? this.building[d]
			: this.terrain !== MOUNTAIN;
	}
};
class GameMap {
	constructor(map) {
		this.map = map;
		this.findMap = new Map();
		forEach(this.map, (value, x, y) => {
			this.findMap.set(value, { x, y });
		});
		this.alive_players_set = makeSet($ => {
			forEach(this.map, ({ owner }) => {
				if (owner !== null) {
					$(owner);
				}
			});
		});
	}
	get(x, y) {
		return (x in this.map) ? this.map[x][y] : undefined;
	}
	find(grid) {
		return this.findMap.get(grid);
	}
	alive_players() {
		return this.alive_players_set;
	}
	play() {
		while (!this.is_ended) {
			this.round();
		}
	}
	round() {
		for (let player of this.alive_players()) {
			this.tower_produce(player);
			this.place_atom(player);
		}
		this.tower_produce(null);
	}
	simulate(transfers, onSimulate = (map) => { }) {
		while (this.alive_players().size >= 2 && transfers.length > 0) {
			transfers = makeArray($ => {
				for (let { source, amount } of transfers) {
					if (source instanceof Grid) {
						source.atoms -= amount;
					}
				}
				for (let t of transfers) {
					$(...this.arrive(t));
				}
			});
			onSimulate(this);
		}
	}
	adjacents(grid) {
		return makeObject($ => {
			let { x, y } = this.find(grid);
			for (let d of DIRECTIONS) {
				let g = this.get(x + DX[d], y + DY[d]);
				if (g instanceof Grid) {
					$(d, g);
				}
			}
		});
	}
	empty_adjacents(grid) {
		return makeObject($ => {
			let a = this.adjacents(grid);
			for (let d in a) {
				let g = a[d];
				if (g.access(TURN_AROUND[d])) {
					$(d, g);
				}
			}
		});
	}
	arrive({ source, destination: dest, amount }) {
		let { building, terrain, atoms } = dest;
		if (building === null && (terrain === WATER || terrain === MOUNTAIN)) {
			return [];
		}
		if (terrain === null
			&& (
				building === null
				|| building instanceof SpawnPoint
				|| building instanceof Tower
			)
		) {
			return makeArray($ => {
				let e = this.empty_adjacents(dest);
				let es = size(e);
				let oc = atoms <= 0 ? 0 : Math.floor(atoms / es);
				dest.atoms += amount;
				if (dest.atoms >= 0) {
					if (source !== null && dest.owner !== source.owner) {
						if (dest.building instanceof SpawnPoint) {
							let dead = dest.owner;
							this.alive_players_set.delete(dead);
							forEach(this.map, a => {
								if (a.owner === dead) {
									a.owner = source.owner;
								}
							});
							dest.building = null;
						}
						else {
							dest.owner = source.owner;
						}
					}
				}
				if (es > 0) {
					let nc = dest.atoms <= 0 ? 0 : Math.floor(dest.atoms / es);
					if (nc > oc) {
						for (let d in e) {
							$({
								source: dest,
								destination: e[d],
								amount: nc - oc,
							});
						}
					}
				}
			});
		}
		if (building instanceof Bridge) {
			dest.atoms += amount;
			if (source !== null) {
				dest.owner = source.owner;
			}
			let a = this.adjacents(source);
			let d;
			for (let dd of DIRECTIONS) {
				if (a[dd] === dest) {
					d = dd;
					break;
				}
			}
			return makeArray($ => {
				const go = (d) => {
					$({
						source: dest,
						destination: this.adjacents(dest)[d],
						amount,
					});
				};
				let b = building;
				if (b.is_corner()) {
					go(b[TURN[d]] ? TURN[d] : TURN_AROUND[TURN[d]]);
				}
				else {
					go(d);
				}
			});
		}
	}
	toPlain() {
		const TERRAINS = new Map([
			[null, -1],
			[MOUNTAIN, -2],
			[WATER, -3],
		]);
		const BUILDINGS = new Map([
			[null, -1],
			[Bridge.prototype, -2],
			[Tower.prototype, -3],
			[SpawnPoint.prototype, -4],
		]);
		return map(this.map, grid => ({
			owner: grid.owner,
			atoms: grid.atoms,
			terrain: TERRAINS.get(grid.terrain),
			building: {
				type: BUILDINGS.get(grid.building && Object.getPrototypeOf(grid.building)),
				...(grid.building ? grid.building.toPlain() : {}),
			},
		}));
	}
	static fromPlain(data) {
		const TERRAINS = new Map([
			[-1, null],
			[-2, MOUNTAIN],
			[-3, WATER],
		]);
		const BUILDINGS = new Map([
			[-1, null],
			[-2, Bridge],
			[-3, Tower],
			[-4, SpawnPoint],
		]);
		return new GameMap(map(data, ({ owner, atoms, terrain, building }) => new Grid({
			owner,
			atoms,
			terrain: TERRAINS.get(terrain),
			building: (BUILDINGS.get(building.type) || { fromPlain: () => null }).fromPlain(building),
		})));
	}
	serialization() {
		return JSON.stringify(this.toPlain());
	}
	static unserialization(data) {
		return this.fromPlain(JSON.parse(data));
	}
};

class Game {
	constructor(setting = {}) {
		const {
			round = 0,
			turn = 0,
			onEnd = () => { },
			onDecide = (player, callback) => { callback(null); },
			onUpdate = (result) => { },
			onSimulate = (map) => { },
			map,
			players = []
		} = setting;
		this.gameMap = map;
		this.round = round;
		this.turn = turn;
		this.onUpdate = onUpdate;
		this.onDecide = onDecide;
		this.onEnd = onEnd;
		this.onSimulate = onSimulate;
		this.players = players;
		this.playerCount = players.length;
		this.towers = makeArray($ => {
			forEach(this.gameMap.map, grid => {
				const { building } = grid;
				if (building instanceof Tower) {
					$(grid);
				}
			});
		});
	}
	tower_produce(owner) {
		this.gameMap.simulate(
			this.towers
				.filter(grid => grid.owner === owner && grid.atoms >= 0)
				.map(grid => ({
					source: null,
					destination: grid,
					amount: grid.building.produce_per_round
				}))
			, this.onSimulate);
	}
	place_atom(choice) {
		if (choice !== null) {
			this.gameMap.simulate([{
				source: null,
				destination: this.gameMap.get(choice.x, choice.y),
				amount: 1,
			}], this.onSimulate);
		}
	}
	is_ended() {
		return this.gameMap.alive_players().size <= 1;
	}
	find_next_player() {
		do {
			this.turn++;
			if (this.turn >= this.playerCount) {
				this.tower_produce(null);
				this.round++;
				this.turn = 0;
			}
		} while (!this.gameMap.alive_players().has(this.players[this.turn]));
	}
	check(player, result) {
		let grid = this.gameMap.get(result.x, result.y);
		return grid.owner === player && grid.can_place_atom();
	}
	play() {
		if (!this.is_ended()) {
			let player = this.players[this.turn];
			this.tower_produce(player);
			const wait = (callback) => {
				this.onDecide(player, callback);
			};
			const listener = ((called) => (result) => {
				if (called) {
					throw new InvalidError('repeated decide');
				}
				if (result !== null) {
					let { x, y } = result;
					result = {
						x: vaild.integer(x, { hint: 'x', min: 0, max: this.gameMap.map.length }),
						y: vaild.integer(y, { hint: 'y', min: 0, max: this.gameMap.map[0].length }),
					};
					if (!this.check(player, result)) {
						throw new InvalidError('invalid result');
					}
				}
				called = true;
				this.onUpdate(result);
				this.place_atom(result);
				this.find_next_player();
				this.play();
			})(false);
			wait(listener);
		}
		else {
			this.onEnd(this.gameMap.alive_players());
		}
	}
};

module.exports = {
	WATER,
	MOUNTAIN,
	Bridge,
	Tower,
	SpawnPoint,
	Grid,
	GameMap,
	Game,
	NORTH,
	WEST,
	SOUTH,
	EAST,
};