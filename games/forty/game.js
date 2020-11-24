const { EventEmitter } = require('events');
const Game = require('../game-base.js');
const V = require('../../utils/v.js');
const { mid } = require('../../utils/math.js');
const { randomReal } = require('../../utils/random.js');
const vaild = require('../../utils/vaild.js');
const { InvaildError } = vaild;
const { ALL } = require('dns');
const ARENA_HEIGHT = 1000;
const ARENA_WIDTH = 1000;
const UPDATE_COOLDOWN = 0.05;
/**@typedef {{type:'line',dest:V}} LineEdge*/
/**@typedef {{type:'arc',dest:V,circleCenter:V,isClockwise:boolean}} ArcEdge*/
/**@typedef {LineEdge|ArcEdge} Edge*/
class Shape {
	constructor(data = []) {
		/**@type {Edge[]} */
		this.edges = [];
		for (let element of data) {
			this[element.type](element);
		}
		this.scale = new V(1, 1);
		this.rorate = 0;
		this.translation = new V(0, 0);
	}
	/**
	 * @param {V|{dest:V}} input 
	 */
	line(input) {
		let dest = input instanceof V ? input : input.dest;
		this.edges.push({
			type: 'line',
			dest,
		});
		return this;
	}
	/**
	 * @param {{dest:V,circleCenter:V,isClockwise:boolean}} input 
	 */
	arc({ dest, circleCenter, isClockwise }) {
		this.edges.push({
			type: 'arc',
			dest,
			circleCenter,
			isClockwise,
		});
		return this;
	}
	/**
	 * @param {V} point 
	 */
	_unTransform(point) {
		let qwq = point.sub(this.translation);
		let { x, y } = V.fromAngle(-this.rorate);
		return new V(
			(x * qwq.x - y * qwq.y) / this.scale.x,
			(y * qwq.x + x * qwq.y) / this.scale.y
		);
	}
	/**
	 * @param {V} point 
	 */
	include(point) {
		if (this.edges.length === 0) {
			return false;
		}
		point = this._unTransform(point);
		let facing = this.edges[this.edges.length - 1].dest.sub(point);
		let facingAngle = facing.angle;
		let angle = 0;
		for (let element of this.edges) {
			let dest = element.dest.sub(point);
			let destAngle = dest.angle;
			let turn = (destAngle - facingAngle + 2 * Math.PI) % (2 * Math.PI);
			switch (element.type) {
				case 'line': {
					angle += turn - (turn < Math.PI ? 0 : 2 * Math.PI);
					break;
				}
				case 'arc': {
					let { circleCenter, isClockwise } = element;
					angle += turn - ((point.sub(circleCenter).sqrlen < element.dest.sub(circleCenter).sqrlen && ((facing.cross(dest) < 0) !== isClockwise)) !== (turn <= Math.PI) ? 0 : 2 * Math.PI);
					break;
				}
				default: {
					throw new Error('unknown type');
				}
			}
			facing = dest;
			facingAngle = destAngle;
		}
		return Math.abs(angle) > Math.PI;
	}
};
class SkillMap {
	constructor() {
		/**@type {Record<string,Skill>} */
		this.o = Object.create(null);
	}
	/**
	 * @param {Skill} skill 
	 */
	addSkill(skill) {
		this.o[skill.name] = skill;
	}
	/**
	 * @param {string} key
	 */
	removeSkill(key) {
		delete (this.o)[key];
	}
	/**
	 * @param {string} key
	 */
	getSkill(key) {
		if (key in this.o) {
			return this.o[key];
		}
		else {
			throw new InvaildError('no such skill');
		}
	}
	/**
	 * @param {(key:string,skill:Skill)=>void} callback
	 */
	forEach(callback) {
		for (let key in this.o) {
			callback(key, this.o[key]);
		}
	}
	toJSON() {
		let result = [];
		this.forEach((name, skill) => {
			/**@type {object} */
			let data = { ...skill };
			data.total_cooldown = data.totalCooldown;
			delete data.totalCooldown;
			data.is_active = data.isActive;
			delete data.isActive;
			result.push([name, data]);
		});
		return result;
	}
}

class PlayerProp extends EventEmitter {
	constructor() {
		super();
		this.maxSpeed = 60;
		this.acc = 200;
		this.maxHealth = 200;
		this.attack = {
			range: 40,
			angle: Math.PI / 6,
			shape: null,
			damage: 40,
			prepareTime: 0.8,
			cooldownTime: 0,
			auto: false,
			eventAttackReach: [],
			eventAttackDone: [],
		};
		this.bloodSucking = 0.4;
		this.defense = 0;
		this.hurtRate = 200;
		this.killSteal = 0.5;
		this.KillScore = 100;
	}
};

function getDefaultPlayerProp() {
	return new PlayerProp();
}
class Effect extends EventEmitter {
	constructor(time = Infinity) {
		super();
		this.time = time;
	}
	/**@param {PlayerProp} _*/
	apply(_) { }
};
/**
 * @param {string} id
 * @param {(p:PlayerProp)=>void} apply 
 */
function makeEffect(id, apply) {
	return class extends Effect {
		static get id() {
			return id;
		}
		apply(playerProp) {
			apply(playerProp);
		}
	};
}
class Skill extends Effect {
	constructor(name, cooldown) {
		super(Infinity);
		this.name = name;
		this.totalCooldown = cooldown;
		this.cooldown = 0;
		this.isActive = false;
	}
	/**
	 * @param {Player} player 
	 * @param  {...any[]} args 
	 */
	active(player, ...args) {
		if (this.cooldown > 0) {
			throw new InvaildError('skill is cooldowning');
		}
		if (this.isActive) {
			throw new InvaildError('skill is active');
		}
		this.isActive = true;
	}
	/**
	 * @param {Player} player 
	 * @param  {...any[]} args 
	 */
	disactive(player, ...args) {
		this.isActive = false;
		this.cooldown = this.totalCooldown;
	}
}

/**
 * 
 * @param {string} name 
 * @param {number} cooldown 
 * @param {{[x:string]:(player:Player,...args:any[])=>void}} events
 */
function makeSkill(name, cooldown, events) {
	return class extends Skill {
		static get id() {
			return name;
		}
		constructor() {
			super(name, cooldown);
			for (const [event, callback] of Object.entries(events)) {
				this.on(event, callback);
			}
		}
		/**
		 * @param {Player} player 
		 * @param  {...any[]} args 
		 */
		active(player, ...args) {
			this.emit('beforeactive', player, ...args);
			super.active(player, ...args);
			this.emit('afteractive', player, ...args);
		}
		/**
		 * @param {Player} player 
		 * @param  {...any[]} args 
		 */
		disactive(player, ...args) {
			this.emit('beforedisactive', player, ...args);
			super.disactive(player, ...args);
			this.emit('afterdisactive', player, ...args);
		}
	};
};
const Poet = makeEffect('poet', p => {
	p.bloodSucking *= 2;
});
const Knife = makeEffect('knife', p => {
	p.maxSpeed += 15;
	(a => {
		a.damage *= 2.5;
		a.range *= 0.7;
		a.prepareTime -= 0.5;
		a.cooldownTime += 3;
	})(p.attack);
});
const Broadsword = makeEffect('broadsword', p => {
	p.maxSpeed -= 5;
	p.bloodSucking *= 0.9;
	(a => {
		a.range *= 1.75;
		a.prepareTime += 1.2;
		a.cooldownTime += 1.5;
		a.damage *= 3;
		a.angle *= 1.5;
	})(p.attack);
	p.defense += 0.2;
});
const Furnace = makeEffect('furnace', p => {
	p.maxSpeed += 25;
	p.bloodSucking *= 1.5;
	(a => {
		a.range *= 0.8;
		a.angle = Math.PI;
		a.damage *= 0.75;
		a.prepareTime += 1.2;
		a.auto = true;
	})(p.attack);
});
const JIAN_Q_MAX_SEP_TIME = 4;
class JianQAttacking extends Effect {
	static get id() {
		return 'king_q';
	}
	/**@param {number} time @param {number} stage*/
	constructor(time, stage = 1) {
		super(time);
		this.part = stage;
		this._combo_hited = new Map();
	}
	/**@param {PlayerProp} p*/
	apply(p) {
		(a => {
			switch (this.part) {
				case 1: {
					const W = 20;
					const H = 50;
					a.shape = (new Shape())
						.line(new V(0, W / 2))
						.line(new V(H, W / 2))
						.line(new V(H, -W / 2))
						.line(new V(0, -W / 2))
						.line(new V(0, 0));
					a.prepareTime *= 5 / 8;
					a.damage *= 0.8;
					break;
				}
				case 2: {
					const A = Math.PI / 6;
					const R = 45;
					a.shape = (new Shape())
						.line(V.fromAngle(A, R))
						.arc({
							dest: V.fromAngle(-A, R),
							circleCenter: new V(0, 0),
							isClockwise: true,
						})
						.line(new V(0, 0));
					a.prepareTime *= 7 / 8;
					break;
				}
				case 3: {
					const R = 22;
					a.shape = (new Shape())
						.arc({
							dest: new V(2 * R, 0),
							circleCenter: new V(R, 0),
							isClockwise: false,
						})
						.arc({
							dest: new V(0, 0),
							circleCenter: new V(R, 0),
							isClockwise: false,
						});
					a.prepareTime *= 9 / 8;
					a.damage *= 1.3;
					break;
				}
				default: {
					throw new Error('impossible');
				}
			}
		})(p.attack);
		const comboEnd = (player) => {
			this._combo_hited.clear();
			player.game.needUpdate = true;
			try {
				player.skills.getSkill('king_q').disactive(player);
			}
			catch (_) { }
		};
		p.on('beforeexpire', (player, { effect }) => {
			if (effect === this) {
				comboEnd(player);
			}
		});
		p.on('afterstartattack', player => {
			this.time = JIAN_Q_MAX_SEP_TIME;
			player.updateEffect();
		});
		p.on('beforeattackreach', (player, data) => {
			const W = 20;
			const H1 = 30;
			const H2 = 50;
			const A = Math.PI / 6;
			const R21 = 30;
			const R22 = 45;
			const R3 = 13;
			let special_shape = {
				1: (new Shape())
					.line(new V(H1, W / 2))
					.line(new V(H2, W / 2))
					.line(new V(H2, -W / 2))
					.line(new V(H1, -W / 2))
					.line(new V(H1, 0)),
				2: (new Shape())
					.line(V.fromAngle(A, R22))
					.arc({
						dest: V.fromAngle(-A, R22),
						circleCenter: new V(0, 0),
						isClockwise: true,
					})
					.line(V.fromAngle(-A, R21))
					.arc({
						dest: V.fromAngle(A, R21),
						circleCenter: new V(0, 0),
						isClockwise: false,
					}),
				3: (new Shape())
					.arc({
						dest: new V(2 * R3, 0),
						circleCenter: new V(R3, 0),
						isClockwise: false,
					})
					.arc({
						dest: new V(0, 0),
						circleCenter: new V(R3, 0),
						isClockwise: false,
					})
			}[this.part];
			player.modifyShapeTransform(special_shape);
			let { target } = data;
			if (special_shape.include(target.pos)) {
				data.damage *= 1.5;
			}
		});
		p.on('afterattack', player => {
			if (this.part === 3) {
				comboEnd(player);
				player.removeEffect(this);
			}
			else {
				this.part++;
				player.updateEffect();
			}
			player.game.needUpdate = true;
		});
	}
}
class Shifting extends Effect {
	static get id() {
		return 'shifting';
	}
	/**
	 * @param {number} time 
	 * @param {V} deltaSpeed 
	 */
	constructor(time, deltaSpeed) {
		super(time);
		this.deltaSpeed = deltaSpeed;
	}
	/**@param {PlayerProp} p*/
	apply(p) {
		p.on('time', (player, { time }) => {
			player.pos.addM(this.deltaSpeed.mul(time));
		});
	}
}
const JianQ = makeSkill('king_q', 10, {
	beforeactive(player) {
		if (player.attackState instanceof BeforeAttack) {
			throw new InvaildError('player is attacking');
		}
	},
	afteractive(player) {
		player.applyEffect(new JianQAttacking(JIAN_Q_MAX_SEP_TIME));
	},
});
const JianE = makeSkill('king_e', 5, {
	afteractive(player, { angle }) {
		angle = vaild.real(angle, { hint: 'angle', min: 0, max: 2 * Math.PI });
		player.applyEffect(new Shifting(0.2, V.fromAngle(angle, 100)));
		player.skills.getSkill('king_e').disactive(player);
	},
});

class Jian extends Effect {
	static get id() {
		return 'king';
	}
	constructor() {
		super();
	}
	/**@param {PlayerProp} p*/
	apply(p) {
		p.maxSpeed += 5;
		p.bloodSucking *= 1.2;
		p.on('aftereffectapply', (player, { effect }) => {
			if (effect === this) {
				player.skills.addSkill(new JianQ());
				player.skills.addSkill(new JianE());
			}
		});
	}
};
const VIEWED_EFFECT_ID = new Map([
	Poet,
	Knife,
	Broadsword,
	Furnace,
	Jian,
	JianQAttacking,
	Shifting,
].map(Effect => [Effect.prototype, Effect.id]));
const ALL_SELECTABLE_PASSIVE_EFFECTS = [
	Poet,
	Knife,
	Broadsword,
	Furnace,
	Jian,
];
const ALL_SELECTABLE_PASSIVE_EFFECT_IDS = ALL_SELECTABLE_PASSIVE_EFFECTS.map(Effect => Effect.id);
const ID_EFFECT_MAP = new Map(ALL_SELECTABLE_PASSIVE_EFFECTS.map(Effect => [Effect.id, Effect]));

class Waiting { };
class BeforeAttack {
	/**
	 * @param {number} time 
	 * @param {number} angle 
	 */
	constructor(time, angle) {
		this.time = time;
		this.angle = angle;
	}
};
class AfterAttack {
	/**
	 * @param {number} time 
	 */
	constructor(time) {
		this.time = time;
	}
};

/**@typedef {Waiting|BeforeAttack|AfterAttack} AttackState*/

const PLAYER_STATE_SELECTING_PASSIVE_SKILL = Symbol('PLAYER_STATE_SECLETING_PASSIVE_SKILL');
const PLAYER_STATE_PLAYING = Symbol('PLAYER_STATE_PLAYING');
/**@typedef {PLAYER_STATE_SELECTING_PASSIVE_SKILL|PLAYER_STATE_PLAYING} PlayerState*/

class Player {
	/**
	 * 
	 * @param {{
	state?:PlayerState,
	pos?:V,
	speed?:V,
	targetSpeed?:V,
	facing?:V,
	attackState?:AttackState,
	prop?:PlayerProp,
	health?:number,
	targetHealth?:number,
	lastDamager?:Player|null,
	effects?:Effect[],
	skills?:SkillMap,
	score?:number,
	teamID:string,
	id:string,
	callback:function,
	game:Forty,
	}} input
	 */
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
		skills = new SkillMap(),
		score = 0,
		teamID,
		id,
		callback,
		game,
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
		this.skills = skills;
		this.prop = prop;
		this.score = score;
		this.teamID = teamID;
		this.id = id;
		this.callback = callback;
		this.game = game;
	}
	startAttack(angle) {
		if (!(this.attackState instanceof Waiting)) {
			throw new InvaildError('player is attacking');
		}
		let prepareTime = this.prop.attack.prepareTime;
		let a = { prepareTime, angle };
		this.prop.emit('beforestartattack', this, a);
		({ prepareTime, angle } = a);
		this.attackState = new BeforeAttack(prepareTime, angle);
		this.prop.emit('afterstartattack', this, { prepareTime, angle });
	}
	/**
	 * @param {V} targetSpeed 
	 */
	startMove(targetSpeed) {
		let len = targetSpeed.len;
		if (len > 0) {
			targetSpeed.mulM(this.prop.maxSpeed / len);
		}
		this.targetSpeed = targetSpeed;
	}
	/**
	 * @param {Player} player 
	 */
	canDamage(player) {
		return player.teamID !== this.teamID;
	}
	/**
	 * @param {Shape} shape 
	 */
	modifyShapeTransform(shape) {
		if (!(this.attackState instanceof BeforeAttack)) {
			throw new TypeError('not in BeforeAttack state');
		}
		shape.translation = this.pos;
		shape.rorate = this.attackState.angle;
	}
	/**
	 * @param {Player} player 
	 */
	canAttackReach(player) {
		if (!(this.attackState instanceof BeforeAttack)) {
			throw new TypeError('not in BeforeAttack state');
		}
		let shape = this.prop.attack.shape;
		if (shape !== null) {
			this.modifyShapeTransform(shape);
			return shape.include(player.pos);
		}
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
	/**
	 * @param {number} s 
	 */
	move(s) {
		let deltaSpeed = this.targetSpeed.sub(this.speed);
		let len = deltaSpeed.len;
		let accT = Math.min(len / this.prop.acc, s);
		this.pos.addM(this.speed.mul(accT / 2));
		if (len > 0) {
			this.speed.addM(deltaSpeed.mul(1 / len).mul(accT * this.prop.acc));
		}
		this.pos.addM(this.speed.mul(s - accT / 2));
		let speedLen = this.speed.len;
		if (speedLen > 0) {
			this.facing = this.speed.mul(1 / speedLen);
		}
		this.pos.x = mid(this.pos.x, 0, ARENA_WIDTH);
		this.pos.y = mid(this.pos.y, 0, ARENA_HEIGHT);
	}
	dealDamage(target, damage, options = {}) {
		let data = {
			source: this,
			target,
			damage,
			bloodSucking: this.prop.bloodSucking,
			...options,
		};
		this.prop.emit('beforedealdamage', this, data);
		target.prop.emit('beforehurt', target, data);
		let source, bloodSucking;
		({ source, target, damage, bloodSucking } = data);
		let defense = target.prop.defense;
		damage = Math.max((1 - defense) * damage, 0);
		target.targetHealth -= damage;
		target.lastDamager = source;
		target.prop.emit('afterhurt', target, { source, target, damage });
		this.targetHealth += damage * bloodSucking;
		if (this.targetHealth > this.prop.maxHealth) {
			this.targetHealth = this.prop.maxHealth;
		}
		this.prop.emit('afterdealdamage', this, { source, target, damage });
	}
	attack() {
		this.prop.emit('beforeattack', this);
		for (let [, target] of this.game.players) {
			if (this.canDamage(target) && this.canAttackReach(target)) {
				let data = { target, damage: this.prop.attack.damage };
				this.prop.emit('beforeattackreach', this, data);
				this.dealDamage(target, data.damage);
				this.prop.emit('afterattackreach', this, data);
				this.game.needUpdate = true;
			}
		}
		this.prop.emit('afterattack', this);
	}
	updateEffect() {
		this.prop = getDefaultPlayerProp();
		for (let effect of this.effects) {
			effect.apply(this.prop);
		}
		this.targetHealth = Math.min(this.targetHealth, this.prop.maxHealth);
	}
	applyEffect(effect) {
		this.effects.push(effect);
		this.updateEffect();
		this.prop.emit('aftereffectapply', this, { effect });
	}
	removeEffect(effect) {
		let index = this.effects.indexOf(effect);
		if (index !== -1) {
			this.effects.splice(index, 1);
			this.updateEffect();
			return true;
		}
		return false;
	}
	findEffect(f) {
		return this.effects.find(f);
	}
	time(s) {
		this.prop.emit('time', this, { time: s });
		this.move(s);

		let attackTime = s;
		/**
		 * @template {typeof BeforeAttack|typeof AfterAttack} T
		 * @param {T} state
		 * @param {()=>void} done
		 */
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
		};
		do {
			updateAttackState(BeforeAttack, () => {
				this.attack();
				this.attackState = new AfterAttack(this.prop.attack.cooldownTime);
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

		this.skills.forEach((name, skill) => {
			if (!skill.isActive) {
				skill.cooldown = Math.max(skill.cooldown - s, 0);
			}
		});

		this.effects.forEach(effect => effect.time -= s);
		if (this.effects.some(effect => effect.time <= 0)) {
			this.effects = this.effects.filter(effect => {
				if (effect.time <= 0) {
					let data = { effect, canceled: false };
					this.prop.emit('beforeexpire', this, data);
					return data.canceled;
				}
				else {
					return true;
				}
			});
			this.updateEffect();
		}
	}
}

class Forty extends Game {
	constructor(settings) {
		super(settings);
		this.info = {
			id: 'forty',
		};
		this.settings = settings;
		const {
			teamCount = null,
			selectableEffectIDs = ALL_SELECTABLE_PASSIVE_EFFECT_IDS,
			ban = [],
			bannedEffectIDs = ban || [],
		} = settings;
		this.teamCount = vaild.integer(teamCount, { hint: 'teamCount', min: 2, allows: [null] });
		this.selectableEffectIDs = vaild.array(selectableEffectIDs)
			.map(s => vaild.string(s))
			.filter(id => !bannedEffectIDs.includes(id));
		if (this.teamCount !== null) {
			this.teams = [];
			for (let i = 1; i <= this.teamCount; i++) {
				let team = {
					id: `Orz Siyu${'a'.repeat(i)}n`,
				};
				this.teams.push(team);
			}
		}
		/**@type {Map<string,Player>} */
		let players = new Map();
		this.players = players;
		/**@type {Map<string,Player>} */
		this.waitingPlayers = new Map();
		this.time = -Infinity;
		this.needUpdate = false;
		this.updateCooldown = 0;
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
			player = new Player({
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
					/**@type {string} */
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
				game: this,
			});
			callback(['request_choice', { type: 'skills' }]);
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
			throw new InvaildError('player is died');
		}
		switch (type) {
			case 'set_skills': {
				if (player.state !== PLAYER_STATE_SELECTING_PASSIVE_SKILL) {
					throw new InvaildError('player cannot select a passive skill');
				}
				const { passive } = data;
				const passiveSkillID = vaild.string(passive, { hint: 'passiveSkillID' });
				if (!this.selectableEffectIDs.includes(passiveSkillID)) {
					throw new InvaildError('you cannot select that skill');
				}
				const Effect = ID_EFFECT_MAP.get(passiveSkillID);
				player.applyEffect(new Effect());
				player.state = PLAYER_STATE_PLAYING;
				this.players.set(id, player);
				this.waitingPlayers.delete(id);
				this.startGame(player);
				break;
			}
			case 'attack': {
				if (player.state !== PLAYER_STATE_PLAYING) {
					throw new InvaildError('player is not playing');
				}
				player.startAttack(vaild.real(data, { min: 0, max: Math.PI * 2, hint: 'angle' }));
				this.needUpdate = true;
				break;
			}
			case 'skill': {
				if (player.state !== PLAYER_STATE_PLAYING) {
					throw new InvaildError('player is not playing');
				}
				player.skills.getSkill(vaild.string(data.name, { hint: 'name' })).active(player, data);
				this.needUpdate = true;
				break;
			}
			case 'set_direction': {
				if (player.state !== PLAYER_STATE_PLAYING) {
					throw new InvaildError('player is not playing');
				}
				player.startMove(this.getDirection(vaild.integer(data, { min: -1, max: 7, hint: 'direction' })));
				this.needUpdate = true;
				break;
			}
			default: {
				throw new InvaildError('unknown input type');
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
				effects: player.effects
					.filter(effect => VIEWED_EFFECT_ID.has(Object.getPrototypeOf(effect)))
					.map(effect => ({
						id: VIEWED_EFFECT_ID.get(Object.getPrototypeOf(effect)),
						...((e => {
							let result = {};
							for (let key in e) {
								if (key[0] !== '_') {
									result[key] = e[key];
								}
							}
							return result;
						})(effect)),
					})),
				teamID: player.teamID,
				score: player.score,
			}]);
		}
		let message = player => ['game_update', {
			map: { players },
			skills: player.skills.toJSON(),
		}];
		if (id !== null) {
			let player = this.players.get(id);
			player.callback(message(player));
		}
		else {
			this.players.forEach((player) => {
				player.callback(message(player));
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
		if (this.updateCooldown > 0) {
			this.updateCooldown -= deltaTime;
		}
		if (this.needUpdate && this.updateCooldown <= 0) {
			this.update();
			this.needUpdate = false;
			this.updateCooldown = UPDATE_COOLDOWN;
		}
	}
	serialization() {
		return JSON.stringify(this.settings);
	}
	static unserialization(data) {
		return new Forty(JSON.parse(data));
	}
};

module.exports = Forty;