const ReadLine = require('readline');
const vm = require('vm');
const promisify = require('./utils/promisify.js');
const EXIT = Symbol('EXIT');
const PROMPT = '> ';
module.exports = function CLI(gameServer) {
	let cli = new ReadLine.createInterface({
		input: process.stdin,
		output: process.stdout,
		prompt: PROMPT,
	});
	const globals = {
		games: new Proxy(gameServer.games, {
			get(games, name) {
				if (name in games) {
					return {
						...games[name].info,
						stop: [function () {
							games[name].emit('end');
						}][0],
					};
				}
				else {
					return undefined;
				}
			},
			set(target, name, value) {
				throw new Error('no left-hand assignment here');
			},
		}),
		get players() {
			let result = {};
			for (let playerID in gameServer.players) {
				result[playerID] = {
					playing: gameServer.isPlayerInGame(playerID) ? gameServer.players[playerID].gameID : null,
					kick: [function () {
						gameServer.playerDisconnect(playerID, 'the player is kicked by admin');
					}][0],
				};
			}
			return result;
		},
		get matchs() {
			let result = {};
			for (let matchID in gameServer.matchs) {
				result[matchID] = {
					gameID: gameServer.getMatchGame(matchID),
					stop: [function () {
						delete (gameServer.matchs)[matchID];
					}][0],
				};
			}
			return result;
		},
		exit() {
			cli.emit('close');
			return EXIT;
		},
		save() {
			cli.emit('save');
		},
		create_game(id, type = id, settings = {}) {
			gameServer.createGame(id, type, settings, false);
		},
		create_match(id, type = id, settings = {}) {
			gameServer.createMatch(id, type, settings);
		},
		get userCount(){
			return gameServer.userD.users.size;
		},
		register(username,password){
			gameServer.userD.register(username,password);
		},
		help: '(NO HELP!)',
		mosiyuan: 'Link: https://lmoliver.github.io/mosiyuan',
	};

	async function command(data) {
		try {
			let script = new vm.Script(data);
			let context = vm.createContext(globals);
			let result = script.runInContext(context, {
				filename: 'command',
				timeout: 10000,
				breakOnSigint: true,
			});
			switch (typeof result) {
				case 'function': {
					result = await result();
					break;
				}
				case 'number':
				case 'boolean':
				case 'string': {
					console.log(result);
					break;
				}
				case 'object': {
					if ([null, Object.prototype].includes(Object.getPrototypeOf(result))) {
						console.table(result);
					}
					else {
						console.log(result);
					}
					break;
				}
				case 'symbol':
				case 'undefined': {
					break;
				}
			}
			return result;
		}
		catch (e) {
			console.error(e);
			console.log(`\nInput 'help' for help.`);
		}
	}

	async function init() {
		do {
			cli.prompt();
			let input = await promisify(cli.once, cli)('line');
			let result = await command(input);
			if (result === EXIT) {
				break;
			}
		} while (true);
	}
	init();
	return cli;
}