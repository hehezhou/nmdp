const { GameMap, Grid, SpawnPoint, Tower, Bridge, MOUNTAIN, NORTH, WEST, SOUTH, EAST } = require('./core.js');
const { build, forEach } = require('../../utils/two_dim.js');
const { randomInteger, randomReal } = require('../../utils/random.js');
const V = require('../../utils/v.js');
const isEmpty = g => g.terrain === null && g.building === null;
class MapGenerator {
	constructor() { }
	build({ height, width }) {
		this.height = height;
		this.width = width;
		this.map = build(height, width, () => new Grid({
			owner: null,
			atoms: 0,
			terrain: null,
			building: null,
		}));
	}
	randomPlace(grid, cond = isEmpty) {
		let pos = null;
		for (let i = 0; i < 100; i++) {
			pos = {
				x: randomInteger(this.height),
				y: randomInteger(this.width),
			};
			if (cond(this.map[pos.x][pos.y])) {
				break;
			}
			else {
				pos = null;
			}
		}
		if (pos === null) {
			let weight = -Infinity;
			forEach(this.map, (grid, x, y) => {
				let nw = Math.random();
				if (cond(grid) && nw > weight) {
					pos = { x, y };
					nw = weight;
				}
			})
		}
		if (pos === null) {
			throw new Error('grid not found');
		}
		this.map[pos.x][pos.y] = grid;
	}
	inMap(pos) {
		return pos.x >= 0 && pos.x < this.height && pos.y >= 0 && pos.y < this.width;
	}
	get(pos) {
		return this.map[Math.floor(pos.x)][Math.floor(pos.y)];
	}
	set(pos, grid) {
		return this.map[Math.floor(pos.x)][Math.floor(pos.y)] = grid;
	}
	ray(pos, direction, cond = isEmpty, pass = () => { }) {
		let result = null;
		let now = pos.clone();
		while (this.inMap(now)) {
			if (cond(this.get(now))) {
				pass(now.clone());
				result = now.clone();
			}
			now.addM(direction);
		}
		return result;
	}
	generate({ height, width, players }) { }
	getMap(settings) {
		this.build(settings);
		this.generate(settings);
		return new GameMap(this.map);
	}
};
class SimpleGen extends MapGenerator {
	constructor() {
		super();
	}
	generate({ height, width, players }) {
		for (let player of players) {
			this.randomPlace(new Grid({
				owner: player,
				atoms: 0,
				terrain: null,
				building: new SpawnPoint(),
			}));
		}
		try {
			for (let i = 0; i < 3; i++) {
				this.randomPlace(new Grid({
					owner: null,
					atoms: -4,
					terrain: null,
					building: new Tower(1),
				}))
			}
		}
		catch (e) {
			if (e.message !== 'grid not found') {
				throw e;
			}
		}
	}
};

class ArenaGen extends MapGenerator {
	constructor() {
		super();
	}
	generate({ height, width, players }) {
		let size = new V(height, width);
		let mid = size.mul(1 / 2);
		let r = (height + width) / 4;
		for (let x = 0; x < height; x++) {
			for (let y = 0; y < width; y++) {
				if ((new V(x + 0.5, y + 0.5)).sub(mid).sqrlen > r * r) {
					this.map[x][y] = new Grid({
						owner: null,
						atoms: 0,
						terrain: MOUNTAIN,
						building: null,
					});
				}
			}
		}
		let pos = mid.add(new V(randomReal(-0.5, 0.5), randomReal(-0.5, 0.5)));
		this.map[Math.floor(pos.x)][Math.floor(pos.y)] = new Grid({
			owner: null,
			atoms: -4,
			terrain: null,
			building: new Tower(1),
		});
		let angle = randomReal(0, 2 * Math.PI);
		for (let player of players) {
			let pos = this.ray(mid, V.fromAngle(angle));
			let grid = new Grid({
				owner: player,
				atoms: 0,
				terrain: null,
				building: new SpawnPoint(),
			});
			this.set(pos, grid);
			angle += 2 * Math.PI / players.length;
		}
		for (let [direction,bridge] of [
			[new V(-1,0),{[NORTH]:true,[SOUTH]:true}],
			[new V(0,-1),{[WEST]:true,[EAST]:true}],
			[new V(1,0),{[NORTH]:true,[SOUTH]:true}],
			[new V(0,1),{[WEST]:true,[EAST]:true}],
		]) {
			this.ray(mid.add(direction.mul(2)),direction,isEmpty,(pos)=>{
				let go=pos.add(direction);
				if(this.inMap(go)&&isEmpty(this.get(go))){
					this.set(pos,new Grid({
						owner:null,
						atoms:0,
						terrain:null,
						building:new Bridge(bridge),
					}));
				}
			});
		}
	}
}

const mapGens = [ArenaGen];
module.exports = mapGens;