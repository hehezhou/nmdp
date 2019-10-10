const vaild = require('../../utils/vaild.js');
const Game = require('../game-base.js');
const { cut } = require('../../utils/two_dim.js');
const MIN_SIZE = 1;
const MAX_SIZE = 2000;
const COLORS = 27;
const PAINT_COOLDOWN = 300;
module.exports = class PrintBoard extends Game {
	constructor(settings) {
		super(settings);
		const { height, width, background = 0, board } = settings;
		this.height = vaild.integer(height, { min: MIN_SIZE, max: MAX_SIZE, hint: 'height' });
		this.width = vaild.integer(width, { min: MIN_SIZE, max: MAX_SIZE, hint: 'width' });
		this.background = vaild.integer(background, { min: 0, max: COLORS - 1, hint: 'background' });
		this.info = {
			id: 'paint-board',
		};
		if (board === undefined) {
			this.board = [];
			for (let x = 0; x < this.height; x++) {
				let line = [];
				for (let y = 0; y < this.width; y++) {
					line.push(this.background);
				}
				this.board.push(line);
			}
		}
		else {
			if (typeof board === 'string') {
				this.board = cut(vaild.string(board, { hint: 'board', length: this.height * this.width }), this.width)
					.map(str => Array.from(str).map(x => vaild.integer(parseInt(x, 36), { hint: 'value', min: 0, max: COLORS - 1 })));
			}
			else {
				this.board = vaild.array(board, { hint: 'board', length: this.height })
					.map(
						(line, index) => vaild.array(line, { hint: `board[${index}]`, length: this.width })
							.map((color, index2) => vaild.integer(color, { hint: `board[${index}][${index2}]`, min: 0, max: COLORS - 1 }))
					);
			}
		}
		this.players = new Map();
		this.time = -Infinity;
	}
	getBoard() {
		return {
			height: this.height,
			width: this.width,
			board: this.board.map(line => line.map(x => x.toString(36)).join('')).join(''),
		};
	}
	canJoin(id) {
		return true;
	}
	join(id, callback) {
		if (this.players.has(id)) {
			this.players.get(id).callback = callback;
		}
		else {
			this.players.set(id, {
				paintTime: this.time,
				callback: callback,
			});
		}
		callback(['board', this.getBoard()]);
	}
	leave(id) {
		this.players.get(id).callback = () => { };
	}
	input(id, input) {
		let player = this.players.get(id);
		let [type, data] = input;
		switch (type) {
			case 'paint': {
				let { x, y, color } = data;
				x = vaild.integer(x, { min: 0, max: this.height - 1, hint: 'x' });
				y = vaild.integer(y, { min: 0, max: this.width - 1, hint: 'y' });
				color = vaild.integer(color, { min: 0, max: COLORS - 1, hint: 'color' });
				if (this.time >= player.paintTime) {
					player.paintTime = this.time + PAINT_COOLDOWN;
					player.callback(['paint_success', null]);
					this.board[x][y] = color;
					for (let [, player] of this.players) {
						player.callback(['update', { x, y, color }]);
					}
				}
				else {
					player.callback(['paint_fail', `cooldown: ${player.paintTime - this.time} ms`]);
				}
				break;
			}
			default: {
				throw new Error('unknown input type');
			}
		}
	}
	setTime(timeStamp) {
		this.time = timeStamp;
	}
	serialization() {
		return JSON.stringify(this.getBoard());
	}
	static unserialization(data) {
		return new PrintBoard(JSON.parse(data));
	}
}