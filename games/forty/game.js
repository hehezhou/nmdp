const Game = require('../game-base.js');
const V = require('../../utils/v.js');
const { mid } = require('../../utils/math.js');
const { randomReal } = require('../../utils/random.js');
const vaild = require('../../utils/vaild.js');
const ARENA_HEIGHT = 1000;
const ARENA_WIDTH = 1000;
function getDefaultPlayerProp() {
	return {
		maxSpeed: 60,
		acc: 200,
		maxHealth: 100,
		attack: {
			range: 40,
			angle: Math.PI / 6,
			damage: 40,
			prepareTime: 0.8,
			cooldownTime: 0,
			auto: false,
		},
		bloodSucking: 0.4,
		defense: 0,
		hurtRate: 100,
		killSteal: 0.5,
		KillScore: 100,
	};
}
function makeEffect(apply) {
	return class Effect {
		constructor(time = Infinity) {
			this.time = time;
		}
		apply(playerProp) {
			apply(playerProp);
		}
	};
}
const Poet = makeEffect(p => {
	p.bloodSucking *= 2;
});
const Knive = makeEffect(p => {
	p.maxSpeed += 10;
	(a => {
		a.damage *= 0.75;
		a.range *= 0.75;
		a.prepareTime -= 0.4;
	})(p.attack);
});
const Broadsward = makeEffect(p => {
	p.maxSpeed -= 10;
	p.bloodSucking *= 0.75;
	(a => {
		a.range *= 1.5;
		a.prepareTime += 1.2;
		a.cooldownTime += 1.5;
		a.damage *= 2;
		a.angle *= 1.5;
	})(p.attack);
	p.defense += 0.2;
});
const Furnace = makeEffect(p => {
	p.maxSpeed += 25;
	p.bloodSucking *= 1.5;
	(a => {
		a.range *= 0.75;
		a.angle = Math.PI;
		a.damage *= 0.625;
		a.prepareTime += 1.2;
		a.auto = true;
	})(p.attack);
});
const EFFECTS = [
	Poet,
	Knive,
	Broadsward,
	Furnace,
];
const PASSIVE_SKILLS = EFFECTS.map(Effect => ({ Effect }));
const EFFECT_ID = new Map(EFFECTS.map((Effect, index) => [Effect.prototype, index]));

class Waiting { };
class BeforeAttack {
	constructor(time, angle) {
		this.time = time;
		this.angle = angle;
	}
};
class AfterAttack {
	constructor(time) {
		this.time = time;
	}
};

const PLAYER_STATE_SELECTING_PASSIVE_SKILL = Symbol('PLAYER_STATE_SECLETING_PASSIVE_SKILL');
const PLAYER_STATE_PLAYING = Symbol('PLAYER_STATE_PLAYING');

module.exports = class Forty extends Game {
	constructor(settings) {
		super(settings);
		this.info = {
			id: 'forty',
		};
		this.settings = settings;
		const { teamCount = null } = settings;
		this.teamCount = vaild.integer(teamCount, { hint: 'teamCount', min: 2, allows: [null] });
		if (this.teamCount !== null) {
			this.teams = [];
			for (let i = 1; i <= this.teamCount; i++) {
				let team = {
					id: `Orz Siyu${'a'.repeat(i)}n`,
				};
				this.teams.push(team);
			}
		}
		let players = new Map();
		this.players = players;
		this.waitingPlayers = new Map();
		this.time = -Infinity;
		let game = this;
		this.Player = class Player {
			constructor({
				state = PLAYER_STATE_SELECTING_PASSIVE_SKILL,
				pos = new V(),
				speed = new V(),
				targetSpeed = new V(),
				facing = V.fromAngle(randomReal(0, 2 * Math.PI)),
				attackState = new Waiting(),
				prop = getDefaultPlayerProp(),
				health = prop.maxHealth,
				targetHealth = prop.maxHealth,
				lastDamager = null,
				effects = [],
				score = 0,
				teamID,
				id,
				callback,
			}) {
				this.state = state;
				this.pos = pos;
				this.speed = speed;
				this.targetSpeed = targetSpeed;
				this.facing = facing;
				this.attackState = attackState;
				this.health = health;
				this.targetHealth = targetHealth;
				this.lastDamager = lastDamager;
				this.effects = effects;
				this.prop = prop;
				this.score = score;
				this.teamID = teamID;
				this.id = id;
				this.callback = callback;
			}
			startAttack(angle) {
				if (!(this.attackState instanceof Waiting)) {
					throw new Error('player is attacking');
				}
				this.attackState = new BeforeAttack(this.prop.attack.prepareTime, angle);
			}
			startMove(targetSpeed) {
				let len = targetSpeed.len;
				if (len > 0) {
					targetSpeed.mulM(this.prop.maxSpeed / len);
				}
				this.targetSpeed = targetSpeed;
			}
			canDamage(player) {
				return player.teamID !== this.teamID;
			}
			canAttackReach(player) {
				let distance = player.pos.sub(this.pos);
				let len = distance.len;
				let angle = this.prop.attack.angle;
				if (len === 0 || len > this.prop.attack.range) {
					return false;
				}
				let theta = distance.angle - this.attackState.angle;
				if (theta < 0) {
					theta += 2 * Math.PI;
				}
				return theta <= angle || theta >= 2 * Math.PI - angle;
			}
			move(s) {
				let deltaSpeed = this.targetSpeed.sub(this.speed);
				let len = deltaSpeed.len;
				let accT = Math.min(len / this.prop.acc, s);
				this.pos.addM(this.speed.mul(accT / 2));
				if (len > 0) {
					this.speed.addM(deltaSpeed.mul(1 / len).mul(accT * this.prop.acc));
				}
				this.pos.addM(this.speed.mul(s - accT / 2));
				this.pos.x = mid(this.pos.x, 0, ARENA_WIDTH);
				this.pos.y = mid(this.pos.y, 0, ARENA_HEIGHT);
				let speedLen = this.speed.len;
				if (speedLen > 0) {
					this.facing = this.speed.mul(1 / speedLen);
				}
			}
			dealDamage(player, value) {
				let damage = Math.max((1 - player.prop.defense) * value, 0);
				player.targetHealth -= damage;
				player.lastDamager = this;
				this.targetHealth += damage * this.prop.bloodSucking;
				if (this.targetHealth > this.prop.maxHealth) {
					this.targetHealth = this.prop.maxHealth;
				}
			}
			attack() {
				for (let [, player] of players) {
					if (this.canDamage(player) && this.canAttackReach(player)) {
						this.dealDamage(player, this.prop.attack.damage);
						game.needUpdate = true;
					}
				}
			}
			updateEffect() {
				this.prop = getDefaultPlayerProp();
				for (let effect of this.effects) {
					effect.apply(this.prop);
				}
			}
			applyEffect(effect) {
				this.effects.push(effect);
				this.updateEffect();
			}
			time(s) {
				this.move(s);

				let attackTime = s;
				const updateAttackState = (state, done) => {
					if (this.attackState instanceof state) {
						if (this.attackState.time <= attackTime) {
							attackTime -= Math.min(this.attackState.time);
							done();
						}
						else {
							this.attackState.time -= attackTime;
							attackTime = 0;
						}
					}
				}
				do {
					updateAttackState(BeforeAttack, () => {
						this.attack();
						this.attackState = new AfterAttack(this.prop.attack.cooldownTime)
					});
					updateAttackState(AfterAttack, () => {
						this.attackState = new Waiting();
					});
					if (this.attackState instanceof Waiting) {
						if (this.prop.attack.auto) {
							this.attackState = new BeforeAttack(this.prop.attack.prepareTime, this.facing.angle);
						}
						else {
							break;
						}
					}
				} while (attackTime > 0);

				this.health = Math.max(this.targetHealth, this.health - this.prop.hurtRate * s);

				// TODO: effect expire
			}
		};
	}
	canJoin(id) {
		return true;
	}
	getTeamID(teamIndex) {
		return `team ${teamIndex}`;
	}
	startGame(player) {
		player.callback(['game_start', {
			map_height: ARENA_HEIGHT,
			map_width: ARENA_WIDTH,
			id: player.id,
		}]);
		this.needUpdate = true;
	}
	join(id, callback) {
		let player;
		if (this.players.has(id)) {
			player = this.players.get(id);
			player.callback = callback;
		}
		else if (this.waitingPlayers.has(id)) {
			player = this.waitingPlayers.get(id);
			player.callback = callback;
		}
		else {
			player = new this.Player({
				pos: new V(
					randomReal(0, ARENA_WIDTH),
					randomReal(0, ARENA_HEIGHT),
				),
				callback,
				teamID: this.teamCount === null ? id : (() => {
					let count = new Map(this.teams.map(team => [team.id, 0]));
					this.players.forEach(player => {
						count.set(player.teamID, count.get(player.teamID) + 1);
					});
					let minTeamID;
					let min = Infinity;
					count.forEach((playerCount, teamID) => {
						if (playerCount < min) {
							min = playerCount;
							minTeamID = teamID;
						}
					});
					return minTeamID;
				})(),
				id,
			});
			callback(['request_choice', { type: 'skills' }])
			this.waitingPlayers.set(id, player);
		}
		switch (player.state) {
			case PLAYER_STATE_SELECTING_PASSIVE_SKILL: {
				break;
			}
			case PLAYER_STATE_PLAYING: {
				this.startGame(player);
				break;
			}
			default: {
				throw new Error('impossible');
			}
		}
	}
	getDirection(dirID) {
		if (dirID === -1) {
			return new V(0, 0);
		}
		return V.fromAngle(dirID * Math.PI / 4);
	}
	leave(id) {
		if (this.players.has(id)) {
			let player = this.players.get(id);
			player.callback = () => { };
			player.startMove(new V(0, 0));
			this.needUpdate = true;
		}
		else if (this.waitingPlayers.has(id)) {
			this.waitingPlayers.delete(id);
		}
	}
	input(id, input) {
		let [type, data] = input;
		let player = this.players.get(id) || this.waitingPlayers.get(id);
		if (player === undefined) {
			throw new Error('player is died');
		}
		switch (type) {
			case 'set_skills': {
				if (player.state !== PLAYER_STATE_SELECTING_PASSIVE_SKILL) {
					throw new Error('player cannot select a passive skill');
				}
				const { passive } = data;
				let passiveSkillID = vaild.integer(passive, { min: 0, max: PASSIVE_SKILLS.length - 1, hint: 'passiveSkillID' });
				let Effect = PASSIVE_SKILLS[passiveSkillID].Effect;
				player.applyEffect(new Effect());
				player.state = PLAYER_STATE_PLAYING;
				this.players.set(id, player);
				this.waitingPlayers.delete(id);
				this.startGame(player);
				break;
			}
			case 'attack': {
				if (player.state !== PLAYER_STATE_PLAYING) {
					throw new Error('player is not playing');
				}
				player.startAttack(vaild.real(data, { min: 0, max: Math.PI * 2, hint: 'angle' }));
				this.needUpdate = true;
				break;
			}
			case 'set_direction': {
				if (player.state !== PLAYER_STATE_PLAYING) {
					throw new Error('player is not playing');
				}
				player.startMove(this.getDirection(vaild.integer(data, { min: -1, max: 7, hint: 'direction' })));
				this.needUpdate = true;
				break;
			}
			default: {
				throw new Error('unknown input type');
			}
		}
	}
	update(id = null) {
		let players = [];
		for (let [id, player] of this.players) {
			players.push([id, {
				pos: player.pos,
				speed: player.speed,
				target_speed: player.targetSpeed,
				health: player.health,
				target_health: player.targetHealth,
				attack_state: player.attackState instanceof BeforeAttack
					? {
						type: 1,
						...player.attackState,
					}
					: player.attackState instanceof AfterAttack
						? {
							type: 2,
							...player.attackState,
						}
						: { type: 0 },
				facing: player.facing,
				effects: player.effects.map(effect => ({
					id: EFFECT_ID.get(Object.getPrototypeOf(effect)),
					time: effect.time,
				})),
				teamID: player.teamID,
				score: player.score,
			}]);
		}
		let message = ['game_update', { map: { players } }];
		if (id !== null) {
			let player = this.players.get(id);
			player.callback(message);
		}
		else {
			this.players.forEach((player) => {
				player.callback(message);
			});
		}
	}
	setTime(timeStamp) {
		let deltaTime = timeStamp - this.time;
		this.time = timeStamp;
		let deaths = [];
		this.players.forEach(player => {
			player.time(deltaTime / 1000);
		});
		this.players.forEach((player, id) => {
			if (player.health <= 0) {
				deaths.push({ deadID: id, killerID: (player.lastDamager || { id: null }).id });
				let killer = player.lastDamager;
				if (killer !== null) {
					killer.score += player.score * killer.prop.killSteal + killer.prop.KillScore;
				}
				player.score = 0;
			}
		});
		deaths.forEach(death => {
			for (let [, { callback }] of this.players) {
				callback(['player_lose', death]);
			}
		});
		deaths.forEach(death => {
			this.players.delete(death.deadID);
		});
		if (deaths.length > 0) {
			this.needUpdate = true;
		}
		if (this.needUpdate) {
			this.update();
			this.needUpdate = false;
		}
	}
	serialization() {
		return JSON.stringify(this.settings);
	}
	static unserialization(data) {
		return new Forty(JSON.parse(data));
	}
}