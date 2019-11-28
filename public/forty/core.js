function hashGetColor(id) {
    let hash = 0, base = 12;
    const mod = 0b1011001010100100010010110;
    function Mod(x) {
        for (let i = 31; i >= 24; i--) {
            if (x & (1 << i)) x ^= mod << (i - 24);
        }
        return x;
    }
    id = id.split('');
    id.forEach(data => hash = Mod(hash * base + data.charCodeAt() * data.charCodeAt()));
    id.reverse();
    id.forEach(data => hash = Mod(hash * base + data.charCodeAt() * data.charCodeAt()));
    return '#' + hash.toString(16).padStart(6, '0');
}
const transferEffect = [
    (data, msg) => {
        data.blood = true;
        data.attackType = 'initial';
    },
    (data, msg) => {
        data.attackSumTime -= 0.4;
        data.knifeRadius *= 0.75;
        data.dagger = true;
        data.attackType = 'initial';
    },
    (data, msg) => {
        data.knifeRadius *= 1.5;
        data.attackSumTime += 1.2;
        data.theta *= 1.5;
        data.broadsword = true;
        data.attackType = 'initial';
    },
    (data, msg) => {
        data.knifeRadius *= 0.75;
        data.attackSumTime += 1.2;
        data.attackTheta = null;
        data.smelting = true;
        data.attackType = 'smelting';
    },
    (data, msg) => {
        data.king = true;
        data.attackType = 'initial';
    },
    (data, msg) => {
        switch (msg.part) {
            case 1: {
                data.attackType = 'king1';
                data.attackSumTime = 0.7;
                data.attackWidth = 20;
                data.attackLength = 50;
                data.attackSPJ = 30;
                break;
            }
            case 2: {
                data.attackType = 'king2';
                data.attackSumTime = 0.7;
                data.attackSPJ = 30;
                data.knifeRadius *= 45 / 40;
                break;
            }
            case 3: {
                data.attackType = 'king3';
                data.attackSumTime = 0.5;
                data.knifeRadius *= 25 / 40;
                data.attackSPJ = 15;
                break;
            }
        }
    },
]
const GAME = (() => {
    const BASE = {
        PLAYER_TIME_BEFORE_ATTACK: 0.8,
        PLAYER_MAX_SPEED: 60,
        PLAYER_ACC: 200,
        PLAYER_MAX_HEALTH: 200,
        PLAYER_ATTACK_RANGE: 40,
        PLAYER_ATTACK_ANGLE: Math.PI / 6,
        PLAYER_ATTACK_DAMAGE: 40,
        PLAYER_ATTACK_HEAL: 0.4,
        PLAYER_HURT_PER_SEC: 200,
    }
    class vector {
        constructor(x, y) {
            if (typeof x === 'number') {
                this.x = x, this.y = y;
            }
            else {
                this.x = x.x;
                this.y = x.y;
            }
        }
        len() {
            return Math.sqrt(this.x * this.x + this.y * this.y);
        }
        angle() {
            let ans = Math.atan2(y, x);
            if (ans < 0) ans += 2 * Math.PI;
            return ans;
        }
    };
    function plus(a, b) { return new vector(a.x + b.x, a.y + b.y); }
    function sub(a, b) { return new vector(a.x - b.x, a.y - b.y); }
    function mult(a, b) { return new vector(a.x * b, a.y * b); }
    function div(a, b) { return new vector(a.x / b, a.y / b); }
    function angleToVector(angle) {
        return new vector(cos(angle), sin(angle));
    }
    let Waiting = Symbol('waiting');
    class BeforeAttack {
        constructor({ time, angle }) {
            this.time = time;
            this.angle = angle;
        }
    }
    class AfterAttack {
        constructor({ time }) {
            this.time = time;
        }
    }
    function mid(a, b, c) {
        if (a < b) a ^= b ^= a ^= b;
        if (b < c) b ^= c ^= b ^= c;
        if (a < b) a ^= b ^= a ^= b;
        return b;
    }
    class Player {
        /**
         * @param {{pos: vector, speed: vector, targetSpeed: vector, attackState: Waiting|BeforeAttack, health: number, targetHealth: number, team: String, effects: Array<{id: Number, time: Number}>} param0 
         */
        constructor({ pos, speed, targetSpeed, attackState, health, targetHealth, score, team, effects }) {
            this.pos = pos;
            this.speed = speed;
            this.targetSpeed = targetSpeed;
            this.attackState = attackState;
            this.health = health;
            this.targetHealth = targetHealth;
            this.score = score;
            this.team = team;
            this.effects = effects;
        }
        time(t, height, width) {
            let deltaSpeed = sub(this.targetSpeed, this.speed);
            let dl = deltaSpeed.len();
            let p = Math.min(dl / BASE.PLAYER_ACC, t);
            this.pos = plus(this.pos, mult(this.speed, p / 2));
            if (deltaSpeed.len() > 1e-5) this.speed = plus(this.speed, mult(deltaSpeed, BASE.PLAYER_ACC * p / deltaSpeed.len()));
            this.pos = plus(this.pos, mult(this.speed, (t - p / 2)));
            if (this.pos.x < 0) this.pos.x = 0;
            if (this.pos.y < 0) this.pos.y = 0;
            if (this.pos.x > width) this.pos.x = width;
            if (this.pos.y > height) this.pos.y = height;
            if (this.attackState instanceof BeforeAttack) {
                this.attackState.time -= t;
                if (this.attackState.time <= 0) {
                    if (this.effects.some(data => data.id === EFFECT.SMELTING)) {
                        this.attackState.time = 2;
                    }
                    else if (this.effects.some(data => data.id === EFFECT.BROADSWORD)) this.attackState = new AfterAttack({ time: 1.5 });
                    else this.attackState = Waiting;
                }
            }
            else if (this.attackState instanceof AfterAttack) {
                this.attackState.time -= t;
                if (this.attackState.time <= 0) {
                    this.attackState = Waiting;
                }
            }
            function swap(x, y) {
                let tmp = x;
                x = y;
                y = tmp;
            }
            let hurtPerSec = BASE.PLAYER_HURT_PER_SEC;
            for (let i = 0; i < this.effects.length; i++) {
                if (this.effects[i].time !== null) {
                    this.effects[i].time -= t / 1000;
                    if (this.effects[i].time < 0) {
                        swap(this.effects[i], this.effects[this.effects.length - 1]);
                        this.effects.pop();
                        i--;
                        continue;
                    }
                }
                switch (this.effects[i].id) {
                    case 3: {
                        hurtPerSec = 50;
                        break;
                    }
                }
            }
            this.health = Math.max(this.targetHealth, this.health - hurtPerSec * t);
        }
    }
    return class {
        constructor({ data, type }) {
            this.type = type;
            this.players = new Map();
            this.width = data.map_width;
            this.height = data.map_height;
            this.lastTime = Date.now();
        }
        output() {
            let ans = [];
            for (let i of this.players) {
                let data = {};
                data.id = i[0];
                data.onattack = i[1].attackState !== Waiting;
                if (i[1].attackState !== Waiting) {
                    if (i[1].attackState instanceof BeforeAttack) {
                        data.attackRestTime = i[1].attackState.time;
                        data.attackTheta = i[1].attackState.angle;
                    }
                    else {
                        data.attackRestTime = -i[1].attackState.time;
                    }
                }
                data.x = -i[1].pos.y;
                data.y = i[1].pos.x;
                data.HP = i[1].health;
                data.maxHP = BASE.PLAYER_MAX_HEALTH;
                data.score = i[1].score;
                data.color = hashGetColor(i[0]);
                data.knifeRadius = BASE.PLAYER_ATTACK_RANGE;
                data.attackSumTime = BASE.PLAYER_TIME_BEFORE_ATTACK;
                data.theta = BASE.PLAYER_ATTACK_ANGLE;
                switch (this.type) {
                    case GAME_TYPE.FFA: {
                        data.team = data.id;
                        break;
                    }
                    case GAME_TYPE.TEAM: {
                        data.team = i[1].team;
                        break;
                    }
                }
                for (let j of i[1].effects) {
                    if (j.id >= transferEffect.length);
                    transferEffect[j.id](data, j);
                }
                ans.push(data);
            }
            return ans;
        }
        ranking() {
            if (this.type === GAME_TYPE.FFA) {
                let ans = Array.from(this.players);
                ans.sort((a, b) => b[1].score - a[1].score);
                return ans;
            }
            if (this.type === GAME_TYPE.TEAM) {
                let ans = new Map();
                for (let i of this.players) {
                    if (!ans.has(i[1].team)) ans.set(i[1].team, 0);
                    ans.set(i[1].team, ans.get(i[1].team) + i[1].score);
                }
                ans = Array.from(ans);
                ans.sort((a, b) => b[1] - a[1]);
                return ans;
            }
        }
        update(data) {
            this.players.clear();
            for (let i of data.map.players) {
                this.players.set(i[0], new Player({
                    pos: new vector(i[1].pos),
                    speed: new vector(i[1].speed),
                    targetSpeed: new vector(i[1].target_speed),
                    attackState: ((data) => {
                        if (data.type === 0) {
                            return Waiting;
                        }
                        else if (data.type === 1) {
                            return new BeforeAttack(data);
                        }
                        else if (data.type === 2) {
                            return new AfterAttack(data);
                        }
                    })(i[1].attack_state),
                    health: i[1].health,
                    targetHealth: i[1].target_health,
                    score: typeof i[1].score === 'number' ? i[1].score : 0,
                    team: i[1].teamID,
                    effects: i[1].effects,
                }));
            }
        }
        time(t) {
            for (let player of this.players) {
                player[1].time(t, this.height, this.width);
            }
        }
        getNowMap() {
            let now = Date.now();
            this.time((now - this.lastTime) / 1000);
            this.lastTime = now;
            return { players: this.output(), standing: this.ranking() };
        }
        check(playerIndex) {
            return this.players.has(playerIndex) && this.players.get(playerIndex).passive !== EFFECT.SMELTING && this.players.get(playerIndex).attackState === Waiting;
        }
    }
})();