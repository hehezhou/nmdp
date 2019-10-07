const GameServer = require('./game-server.js');
const zlib = require('zlib');
const fs = require('fs');
const CLI = require('./cli.js');
const promisify = require('./utils/promisify.js');

const PATH = './saves/';

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
		.catch(error => {
			console.warn(`! invalid save file ${path}`);
			console.error(error);
			throw error;
		});
}

async function clearSaveFile(path) {
	let result = await promisify(fs.readdir)(path);
	let infos = result
		.map(parseFileName)
		.filter(info => info !== null && info.prefix === 'save')
		.sort((a, b) => b.time - a.time);
	let [, ...useless] = infos;
	await Promise.all(useless.map(info => {
		let name = path + info.fileName;
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
		let name = path + info.fileName;
		try {
			let server = await loadSaveFile(name);
			await clearSaveFile(path);
			return server;
		}
		catch (e) {
			await promisify(fs.unlink)(name);
		}
	}
	throw new Error('no save files');
}

async function loadGameServer(saveUrl) {
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

module.exports = class Server {
	constructor() {
		this.port=null;
		loadGameServer(process.argv[2])
		.then(gameServer=>{
			if(this.port){
				gameServer.listen(this.port);
			}
			this.gameServer = gameServer;

			setInterval(()=>{
				this.save();
			}, 60000);

			CLI(gameServer)
				.on('save',()=>{
					this.save();
				})
				.on('close',()=>{
					this.exit();
				});
		});
	}
	async save(){
		const result = await promisify(zlib.gzip)(this.gameServer.serialization());
		try{
			await promisify(fs.mkdir)(PATH);
		}
		catch(error){
			if(error.code!=='EEXIST'){
				throw error;
			}
		}
		await promisify(fs.writeFile)(PATH + genFileName('save'), result);
		return await clearSaveFile(PATH);
	}
	async exit(){
		try {
			await this.save();
			process.exit(0);
		}
		catch (error) {
			console.error(error);
			process.exit(1);
		}
	}
	listen(port) {
		this.port=port;
		if(this.gameServer!==undefined){
			this.gameServer.listen(port);
		}
	}
}