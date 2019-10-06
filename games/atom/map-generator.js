const { GameMap, Grid, SpawnPoint,Tower } = require('./core.js');
const { build } = require('../../utils/two_dim.js');
function simpleGen({
	height, width, players,
}) {
	let map = build(height, width, () => new Grid({
		owner: null,
		atoms: 0,
		terrain: null,
		building: null,
	}));
	function randomPlace(grid) {
		let pos = null;
		let cnt = 0;
		do {
			if (++cnt > 100) {
				return;
			}
			pos = {
				x: Math.floor(Math.random() * height),
				y: Math.floor(Math.random() * width),
			};
		} while (!(g => g.terrain === null && g.building === null)(map[pos.x][pos.y]));
		map[pos.x][pos.y] = grid;
	}
	for (let player of players) {
		randomPlace(new Grid({
			owner: player,
			atoms: 0,
			terrain: null,
			building: new SpawnPoint(),
		}));
	}
	for(let i=0;i<3;i++){
		randomPlace(new Grid({
			owner:null,
			atoms:-4,
			terrain:null,
			building: new Tower(1),
		}))
	}
	return new GameMap(map);
}
const mapGens = [simpleGen];
module.exports = mapGens;