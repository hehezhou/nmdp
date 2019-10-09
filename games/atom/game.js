const MatchGame = require('../match-game-base.js');
const vaild = require('../../utils/vaild.js');
const { randomPick } = require('../../utils/random.js');
const { Game } = require('./core.js');
const mapGens = require('./map-generator.js');
const MIN_SIZE = 3;
const MAX_SIZE = 100;
module.exports = class Atom extends MatchGame {
	constructor(settings) {
		super(settings);
		const { width = 25, height = 25 } = settings;
		this.settings = {
			height: vaild.integer(height, { hint: 'height', min: MIN_SIZE, max: MAX_SIZE }),
			width: vaild.integer(width, { hint: 'width', min: MIN_SIZE, max: MAX_SIZE }),
		};
		if (this.settings.height * this.settings.width < this.maxPlayer) {
			throw new Error('space is not enough');
		}
		this.on('start', () => this.onStart());
		this.on('input', (playerID, data) => {
			this.onInput(playerID, data);
		})
		this.info.id = 'atom';
	}
	join(playerID, callback) {
		super.join(playerID, callback);
		if (this.isStarted) {
			let index = this.playerIndexs.get(playerID);
			this.send(index);
		}
	}
	onStart() {
		this.game = new Game({
			players: this.players.map((player, index) => index),
			map: new (randomPick(mapGens))().getMap({
				height: this.settings.height,
				width: this.settings.width,
				players: this.players.map((player, index) => index),
			}),
			onUpdate: decide => {
				for (let player of this.players) {
					player.callback(['game_update', {
						round: this.game.round,
						turn: this.game.turn,
						choice: decide,
					}]);
				}
			},
			onDecide: (playerIndex, callback) => {
				this.onChoice = callback;
				if (!this.players[playerIndex].isOnline) {
					this.onChoice(null);
				}
			},
			onEnd: () => {
				for (let player of this.players) {
					player.callback(['game_end', null]);
				}
				this.emit('end');
			},
		});
		this.players.forEach((player, index) => {
			this.send(index);
		});
		this.game.play();
	}
	send(index) {
		let player = this.players[index];
		let playerList = new Array(this.playerCount());
		for (let [id, index] of this.playerIndexs) {
			playerList[index] = id;
		};
		player.callback(['game_start', {
			player_list: playerList,
			player_index: index,
			round: this.game.round,
			turn: this.game.turn,
			map: this.game.gameMap.toPlain(),
		}]);
	}
	leave(playerID) {
		super.leave(playerID);
		if (this.onlineCount === 0) {
			return;
		}
		if (this.isStarted) {
			let index = this.playerIndexs.get(playerID);
			if (this.game.turn === index) {
				// pass
				this.onChoice(null);
			}
		}
	}
	onInput(playerID, input) {
		let index = this.playerIndexs.get(playerID);
		let player = this.players[index];
		let [type, data] = input;
		switch (type) {
			case 'decide': {
				if (this.game.turn !== index) {
					throw new Error('not player\'s turn');
				}
				this.onChoice(data);
				break;
			}
			default: {
				throw new Error('unknown input type');
			}
		}
	}
	serialization() {
		return JSON.stringify({
			...this.settings,
			minPlayer: this.minPlayer,
			maxPlayer: this.maxPlayer,
		});
	}
	static unserialization(data) {
		return new Atom(JSON.parse(data));
	}
};