const MatchGame = require('../match-game-base.js');
const vaild = require('../../utils/vaild.js');
const { Game } = require('./core.js');
const mapGens = require('./map-generator.js');
const MIN_SIZE = 1;
const MAX_SIZE = 100;
module.exports = class Atom extends MatchGame {
	constructor(settings) {
		super(settings);
		const { width, height } = settings;
		this.settings = {
			height: vaild.integer(height, { hint: 'height', min: MIN_SIZE, max: MAX_SIZE }),
			width: vaild.integer(width, { hint: 'width', min: MIN_SIZE, max: MAX_SIZE }),
		};
		this.on('start', () => this.onStart());
		this.on('input',(playerID,data)=>{
			this.onInput(playerID,data);
		})
		this.info.id = 'atom';
	}
	onStart() {
		this.game = new Game({
			players: this.players.map((player,index)=>index),
			map: mapGens[0]({
				height: this.settings.height,
				width: this.settings.width,
				players: this.players.map((player,index)=>index),
			}),
			onUpdate: decide => {
				for (let player of this.players) {
					player.callback(['game_update', {
						round:this.game.round,
						turn:this.game.turn,
						choice:decide,
					}]);
				}
			},
			onDecide: (player, callback) => {
				this.onChoice = callback;
			},
			onEnd: () => {
				for(let player of this.players){
					player.callback(['game_end',null]);
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
		let playerList = this.players.map((player, index) => `player ${index}`);
		player.callback(['game_start', {
			player_list: playerList,
			player_index: index,
			round: this.game.round,
			turn: this.game.turn,
			map: this.game.gameMap.toPlain(),
		}]);
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
			minPlayer:this.minPlayer,
			maxPlayer:this.maxPlayer,
		});
	}
	static unserialization(data) {
		return new Atom(JSON.parse(data));
	}
};