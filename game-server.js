const WS = require('ws');
const vaild = require('./utils/vaild.js');
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
		if (gameData !== undefined) {
			for (let id in gameData.games) {
				let { type, data } = gameData.games[id];
				this.createGame(id, type, data, true);
			}
			this.matchs = vaild.object(gameData.matchs, { hint: 'matchs' });
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
		this.webSocketServer = new WS.Server({ port });
		this.webSocketServer.on('connection', (webSocket, request) => {
			this.playerConnect(webSocket, request);
		});
		return this;
	}
	playerConnect(webSocket, request) {
		let playerID = `player#${request.connection.remoteAddress}`;
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
	createGameForMatch(matchID) {
		let match = this.matchs[matchID];
		let gameID = `${matchID}#${match.index++}`;
		if(gameID in this.games){
			gameID += `@${Date.now()}`;
		}
		match.gameID = this.createGame(gameID, match.type, match.settings, false);
		let game=this.games[match.gameID];
		game.on('start',()=>{
			this.createGameForMatch(matchID);
		})
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
			// console.log(playerID, '\t>>\t', content);
			if (this.isPlayerInGame(playerID)) {
				this.games[player.gameID].input(playerID, content);
				return;
			}
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
				case 'leave':{
					this.playerLeave(playerID);
				}
				case 'create': {
					// FALL DOWN
				}
				default: {
					throw new Error('the type is not supported');
				}
			}
		}
		catch (e) {
			this.sendMessage(playerID, ['invalid', e.stack]);
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
		this.createGameForMatch(id);
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