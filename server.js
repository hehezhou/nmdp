const WebServer = require('./web-server.js');
const GameServer = require('./game-server.js');
const zlib = require('zlib');
const fs = require('fs');
const CLI = require('./cli.js');
const promisify = require('./utils/promisify.js');
(new WebServer()).listen(80);

const PATH='./saves/';
const PORT = 1926;

function genFileName(prefix = 'file') {
	return `${prefix}@${Date.now()}.dat`;
}
function parseFileName(fileName) {
	const parser = /^(.+?)@(.+?)\.dat$/;
	let result = parser.exec(fileName);
	if (result === null) {
		return null;
	}
	else {
		return {
			prefix: result[1],
			time: parseInt(result[2]),
			fileName,
		};
	}
}

function loadSaveFile(path) {
	return promisify(fs.readFile)(path)
		.then(promisify(zlib.gunzip))
		.then(result => {
			console.log(`* reading save file from ${path}`);
			return (GameServer.unserialization(result.toString()));
		})
		.catch(error=>{
			console.warn(`! invalid save file ${path}`);
			console.error(error);
			throw error;
		});	
}

async function clearSaveFile(path){
	let result = await promisify(fs.readdir)(path);
	let infos = result
		.map(parseFileName)
		.filter(info => info !== null && info.prefix === 'save')
		.sort((a, b) => b.time - a.time);
	let [,...useless]=infos;
	await Promise.all(useless.map(info=>{
		let name = path+info.fileName;
		return promisify(fs.unlink)(name);
	}));
}

async function loadSaveDir(path) {
	let result = await promisify(fs.readdir)(path);
	let infos = result
		.map(parseFileName)
		.filter(info => info !== null && info.prefix === 'save')
		.sort((a, b) => b.time - a.time);
	for (let info of infos) {
		let name = path+info.fileName;
		try {
			let server=await loadSaveFile(name);
			await clearSaveFile(path);
			return server;
		}
		catch (e) {
			await promisify(fs.unlink)(name);
		}
	}
	throw new Error('no save files');
}

async function loadGameServer(saveUrl){
	if (saveUrl !== undefined) {
		try {
			return await loadSaveFile(saveUrl);
		}
		catch (e) {
			return new GameServer();
		}
	}
	else {
		try {
			return await loadSaveDir(PATH);
		}
		catch (e) {
			return new GameServer();
		}
	}
}

(async () => {

	let gameServer = await loadGameServer(process.argv[2]);

	gameServer.listen(PORT);

	function save() {
		return promisify(zlib.gzip)(gameServer.serialization())
			.then(
				result => promisify(fs.writeFile)(PATH+genFileName('save'), result)
			)
			.then(()=>clearSaveFile(PATH));
	}

	setInterval(save, 60000);

	async function exit() {
		save()
			.then(() => {
				process.exit(0);
			})
			.catch(error => {
				console.error(error);
				process.exit(1);
			});
	}

	CLI(gameServer)
		.on('save',save)
		.on('close',exit);
})();