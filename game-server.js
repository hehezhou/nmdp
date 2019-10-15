const WS = require('ws');
const https = require('https');
const User = require('./user/user.js');
const querystring = require('querystring');
const fs = require('fs');
const vaild = require('./utils/vaild.js');
const paths = JSON.parse(fs.readFileSync('./paths.json').toString());

const options = {
	cert: fs.readFileSync(paths.certPath),
	key: fs.readFileSync(paths.keyPath),
};

const loadGame = (cache => name => {
	if (cache.has(name)) {
		return cache.get(name);
	}
	if (/[-a-z]+/.test(name)) {
		let result = require(`./games/${name}/game.js`);
		cache.set(name, result);
		return result;
	}
	else {
		throw new Error('Invaild game name');
	}
})(new Map());
module.exports = class GameServer {
	constructor(gameData) {
		this.games = Object.create(null);
		this.matchs = Object.create(null);
		this.user = new User();
		if (gameData !== undefined) {
			for (let id in gameData.games) {
				let { type, data } = gameData.games[id];
				this.createGame(id, type, data, true);
			}
			this.matchs = vaild.object(gameData.matchs, { hint: 'matchs' });
			for (let id in this.matchs) {
				let gameID = this.matchs[id].gameID;
				if (gameID !== null) {
					this.createGameForMatch(id, gameID);
				}
			}
		}
		this.players = Object.create(null);
		setInterval(() => {
			for (let gameID in this.games) {
				let game = this.games[gameID];
				game.setTime(Date.now());
			}
		}, 0);
	}
	listen(port) {
		this.user.init().then(() => {
			const server = https.createServer(options, (req, res) => {
				if (req.method === 'POST') {
					let data = '';
					req.on('data', chunk => {
						data += chunk;
					});
					req.on('end', () => {
						const { username, password } = JSON.parse(data);
						try {
							let token = this.user.login(username, password);
							res.setHeader('Set-Cookie', [`g=${token}; Path=/; HttpOnly; Secure`]);
							res.writeHead(200);
							res.end();
						}
						catch (e) {
							res.writeHead(401);
							res.write(e.message);
							res.end();
						}
					});
				}
			});
			server.listen(port);
			this.webSocketServer = new WS.Server({ server: server });
			this.webSocketServer.on('connection', (webSocket, request) => {
				let cookies = request.headers.cookie;
				try {
					if (cookies === undefined) {
						throw new Error('Why?');
					}
					let token;
					cookies.split(';').forEach(str => {
						let [key, value] = str.split('=', 2);
						if (key === 'g') {
							token = value;
						}
					});
					if (token === undefined) {
						throw new Error('Why?');
					}
					let playerID = this.user.getUsername(token);
					this.user.stopExpire(token);
					webSocket.on('close', () => {
						this.user.startExpire(token);
					})
					this.playerConnect(playerID, webSocket, request);
				}
				catch (e) {
					webSocket.send(JSON.stringify(['force_quit', 'login first']))
					webSocket.close();
				}
			});
		});
		return this;
	}
	playerConnect(playerID, webSocket, request) {
		if (playerID in this.players) {
			this.playerDisconnect(playerID, 'a player with same id connected');
		}
		this.players[playerID] = {
			id: playerID,
			gameID: null,
			webSocket,
		};
		webSocket.on('message', message => {
			this.receiveMessage(playerID, message);
		});
		const exit = () => {
			if ((playerID in this.players)
				&& this.players[playerID].webSocket === webSocket) {
				this.playerDisconnect(playerID, 'player disconnect');
			}
		};
		webSocket.once('close', exit);
	}
	sendMessage(playerID, data) {
		let string = JSON.stringify(data);
		// console.log(playerID, '\t<<\t', string.length > 40 ? [data[0], '[big object]'] : data);
		this.players[playerID].webSocket.send(string);
	}
	playerDisconnect(playerID, reason = null) {
		if (playerID in this.players) {
			let player = this.players[playerID];
			if (this.isPlayerInGame(playerID)) {
				this.playerLeave(playerID);
			}
			if (player.webSocket.readyState === WS.OPEN) {
				this.sendMessage(playerID, ['force_quit', reason]);
				player.webSocket.close();
			}
			delete (this.players)[playerID];
		}
	}
	isPlayerInGame(playerID) {
		let player = this.players[playerID];
		if (player.gameID !== null) {
			if (player.gameID in this.games) {
				return true;
			}
			player.gameID = null;
		}
		return false;
	}
	playerJoin(playerID, playerInput) {
		let player = this.players[playerID];
		let gameID = vaild.string(playerInput, { hint: 'gameID' });
		try {
			if (this.isPlayerInGame(playerID)) {
				throw new Error('the player is already in a game');
			}
			if (!(gameID in this.games)) {
				throw new Error('the game doesn\'t exist');
			}
			let game = this.games[gameID];
			if (game.canJoin(playerID)) {
				player.gameID = gameID;
				this.sendMessage(playerID, ['join_success', gameID]);
				this.games[gameID].join(playerID, (message) => {
					this.sendMessage(playerID, message);
				});
			}
			else {
				throw new Error('the player cannot join the game');
			}
		}
		catch (e) {
			this.sendMessage(playerID, ['join_fail', e.message]);
		}
	}
	createGameForMatch(matchID, gameID = null) {
		let match = this.matchs[matchID];
		if (gameID === null) {
			gameID = `${matchID}#${match.index++}`;
			if (gameID in this.games) {
				gameID += `@${Date.now()}`;
			}
			gameID = this.createGame(gameID, match.type, match.settings, false);
		}
		match.gameID = gameID;
		let game = this.games[match.gameID];
		game.once('start', () => {
			if (match.gameID === gameID) {
				this.createGameForMatch(matchID);
			}
		});
		return gameID;
	}
	playerJoinMatch(playerID, playerInput) {
		let matchID = vaild.string(playerInput, { hint: 'matchID' });
		try {
			if (!(matchID in this.matchs)) {
				throw new Error('the match doesn\'t exist');
			}
			if (this.isPlayerInGame(playerID)) {
				throw new Error('the player is already in a game');
			}
			let match = this.matchs[matchID];
			let gameID = match.gameID;
			if (gameID === null || !(gameID in this.games) || !this.games[gameID].canJoin(playerID)) {
				gameID = this.createGameForMatch(matchID);
			}
			this.playerJoin(playerID, gameID);
		}
		catch (e) {
			this.sendMessage(playerID, ['join_fail', e.message]);
		}
	}
	getMatchGame(matchID) {
		let match = this.matchs[matchID];
		let gameID = match.gameID;
		if (gameID !== null && !(gameID in this.games)) {
			match.gameID = gameID = null;
		}
		return gameID;
	}
	playerLeave(playerID) {
		let player = this.players[playerID];
		if (this.isPlayerInGame(playerID)) {
			this.games[player.gameID].leave(playerID);
			player.gameID = null;
		}
		else {
			throw new Error('the player is not in a game');
		}
	}
	receiveMessage(playerID, playerMessage) {
		let player = this.players[playerID];
		try {
			let content = JSON.parse(playerMessage);
			let [type, data] = vaild.array(content, { length: 2 });
			type = vaild.string(type, { hint: 'type' });
			switch (type) {
				case 'join': {
					this.playerJoin(playerID, data);
					break;
				}
				case 'join_auto': {
					this.playerJoinMatch(playerID, data);
					break;
				}
				case 'leave': {
					this.playerLeave(playerID);
					break;
				}
				case 'create': {
					// FALL DOWN
				}
				default: {
					if (this.isPlayerInGame(playerID)) {
						this.games[player.gameID].input(playerID, content);
						return;
					}
					else {
						throw new Error('the type is not supported');
					}
				}
			}
		}
		catch (e) {
			this.sendMessage(playerID, ['invalid', e.stack.split('\n')]);
		}
	}
	createGame(id, type, data, unserialization = false) {
		if (id in this.games) {
			throw new Error('game id already exists');
		}
		const GameClass = loadGame(type);
		let game = unserialization
			? GameClass.unserialization(data)
			: new GameClass(data);
		game.setTime(Date.now());
		this.games[id] = game;
		game.on('end', () => {
			delete (this.games)[id];
		});
		return id;
	}
	createMatch(id, type, settings) {
		if (id in this.matchs) {
			throw new Error('match id already exists');
		}
		this.matchs[id] = {
			type,
			settings,
			gameID: null,
			index: 0,
		};
		try {
			this.createGameForMatch(id);
		}
		catch (error) {
			delete (this.matchs)[id];
			throw error;
		}
		return id;
	}
	serialization() {
		let result = {
			games: {},
			matchs: this.matchs,
		};
		for (let id in this.games) {
			let game = this.games[id];
			result.games[id] = {
				type: game.info.id,
				data: game.serialization(),
			};
		}
		return JSON.stringify(result);
	}
	static unserialization(data) {
		return new GameServer(JSON.parse(data));
	}
}