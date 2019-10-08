const Game = require('../game-base.js');
const V = require('../../utils/v.js');
const { mid } = require('../../utils/math.js');
const { randomReal } = require('../../utils/random.js');
const vaild = require('../../utils/vaild.js');
const PLAYER_TIME_BEFORE_ATTACK = 1;
const PLAYER_MAX_SPEED = 30;
const PLAYER_ACC = 120;
const PLAYER_MAX_HEALTH = 100;
const PLAYER_ATTACK_RANGE = 40;
const PLAYER_ATTACK_ANGLE = Math.PI / 6;
const PLAYER_ATTACK_DAMAGE = 75;
const PLAYER_ATTACK_HEAL = 25;
const PLAYER_HURT_PER_SEC = 100;
const ARENA_HEIGHT = 1000;
const ARENA_WIDTH = 1000;
class Waiting { };
class BeforeAttack {
	constructor(time, angle) {
		this.time = time;
		this.angle = angle;
	}
};
module.exports = class Forty extends Game {
	constructor(settings) {
		super(settings);
		this.info={
			id:'forty',
		};
		this.settings=settings;
		let players = new Map();
		this.players = players;
		this.time = -Infinity;
		this.Player = class Player {
			constructor({
				pos = new V(),
				speed = new V(),
				targetSpeed = new V(),
				attackState = new Waiting(),
				health = PLAYER_MAX_HEALTH,
				targetHealth = PLAYER_MAX_HEALTH,
				lastDamager = null,
				callback,
			}) {
				this.pos = pos;
				this.speed = speed;
				this.targetSpeed = targetSpeed;
				this.attackState = attackState;
				this.health = health;
				this.targetHealth = targetHealth;
				this.lastDamager = lastDamager,
				this.callback = callback;
			}
			startAttack(angle) {
				if (!(this.attackState instanceof Waiting)) {
					throw new Error('player is attacking');
				}
				this.attackState = new BeforeAttack(PLAYER_TIME_BEFORE_ATTACK, angle);
			}
			startMove(targetSpeed) {
				let len = targetSpeed.len;
				if (len > 0) {
					targetSpeed.mulM(PLAYER_MAX_SPEED / len);
				}
				this.targetSpeed = targetSpeed;
			}
			canAttack(player, angle) {
				let distance = player.pos.sub(this.pos);
				let len = distance.len;
				if (len === 0 || len > PLAYER_ATTACK_RANGE) {
					return false;
				}
				let theta = distance.angle - angle;
				return theta <= PLAYER_ATTACK_ANGLE || theta >= 2 * Math.PI - PLAYER_ATTACK_ANGLE;
			}
			move(s) {
				let deltaSpeed = this.targetSpeed.sub(this.speed);
				let len = deltaSpeed.len;
				let accT = Math.min(len / PLAYER_ACC, s);
				this.pos.addM(this.speed.mul(accT / 2));
				if (len > 0) {
					this.speed.addM(deltaSpeed.mul(1 / len).mul(accT * PLAYER_ACC));
				}
				this.pos.addM(this.speed.mul(s - accT / 2));
				this.pos.x = mid(this.pos.x, 0, ARENA_WIDTH);
				this.pos.y = mid(this.pos.y, 0, ARENA_HEIGHT);
			}
			attack() {
				for (let [, player] of players) {
					if (this.canAttack(player, this.attackState.angle)) {
						player.targetHealth -= PLAYER_ATTACK_DAMAGE;
						player.lastDamager = this;
						this.targetHealth = Math.min(this.targetHealth+PLAYER_ATTACK_HEAL,PLAYER_MAX_HEALTH);
					}
				}
			}
			time(s) {
				this.move(s);
				if (this.attackState instanceof BeforeAttack) {
					this.attackState.time -= s;
					if (this.attackState.time <= 0) {
						this.attack();
						this.attackState = new Waiting();
					}
				}
				this.health = Math.max(this.targetHealth, this.health - PLAYER_HURT_PER_SEC * s);
			}
		};
	}
	canJoin(id) {
		return true;
	}
	join(id, callback) {
		let player;
		if (!this.players.has(id)) {
			player = new this.Player({
				pos: new V(
					randomReal(0, ARENA_WIDTH),
					randomReal(0, ARENA_HEIGHT),
				),
				callback,
			});
			this.players.set(id,player);
		}
		else {
			player = this.players.get(id);
			player.callback = callback;
		}
		player.callback(['game_start', {
			map_height: ARENA_HEIGHT,
			map_width: ARENA_WIDTH,
			id,
		}]);
		this.update();
	}
	getDirection(dirID) {
		if (dirID === -1) {
			return new V(0, 0);
		}
		return V.fromAngle(dirID * Math.PI / 4);
	}
	leave(id) {
		let player = this.players.get(id);
		player.callback = () => { };
		player.startMove(new V(0, 0));
		this.update();
	}
	input(id, input) {
		let [type, data] = input;
		if(!this.players.has(id)){
			throw new Error('player is died');
		}
		let player = this.players.get(id);
		switch (type) {
			case 'attack': {
				player.startAttack(vaild.real(data, { min: 0, max: Math.PI * 2, hint: 'angle' }));
				this.update();
				break;
			}
			case 'set_direction': {
				player.startMove(this.getDirection(vaild.integer(data, { min: -1, max: 7, hint: 'direction' })));
				this.update();
				break;
			}
			default: {
				throw new Error('unknown input type');
			}
		}
	}
	update(id=null){
		let players = [];
		for (let [id, player] of this.players) {
			players.push([id, {
				pos: player.pos,
				speed: player.speed,
				target_speed: player.targetSpeed,
				health: player.health,
				target_health: player.targetHealth,
				attack_state: player.attackState instanceof BeforeAttack
					? player.attackState
					: null
			}]);
		}
		let message=['game_update',{map:{players}}];
		if(id!==null){
			let player=this.players.get(id);
			player.callback(message);
		}
		else{
			this.players.forEach((player)=>{
				player.callback(message);
			});
		}
	}
	setTime(timeStamp) {
		let deltaTime=timeStamp-this.time;
		this.time = timeStamp;
		let deaths=[];
		this.players.forEach(player=>{
			player.time(deltaTime/1000);
		});
		this.players.forEach((player,id)=>{
			if(player.health<=0){
				deaths.push({deadID:id,killerID:(player.lastDamager||{id:null}).id});
			}
		});
		deaths.forEach(death=>{
			this.players.delete(death.deadID);
			for(let [,{callback}] of this.players){
				callback(['player_lose',death]);
			}
		});
		if(deaths.length>0){
			this.update();
		}
	}
	serialization() {
		return JSON.stringify(this.settings);
	}
	static unserialization(data) {
		return new Forty(JSON.parse(data));
	}
}