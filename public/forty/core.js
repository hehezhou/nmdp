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
const transferPassive = [
    (data) => { },
    (data) => {
        data.attackSumTime -= 0.4;
        data.knifeRadius *= 0.75;
    },
    (data) => {
        data.knifeRadius *= 1.5;
        data.attackSumTime += 1.2;
        data.theta *= 1.5;
    },
    () => {
        data.knifeRadius *= 0.75;
        data.attackSumTime += 1.2;
        data.attackTheta = null;
    },
]
const GAME = (() => {
    const BASE = {
        PLAYER_TIME_BEFORE_ATTACK: 0.8,
        PLAYER_MAX_SPEED: 60,
        PLAYER_ACC: 200,
        PLAYER_MAX_HEALTH: 100,
        PLAYER_ATTACK_RANGE: 40,
        PLAYER_ATTACK_ANGLE: Math.PI / 6,
        PLAYER_ATTACK_DAMAGE: 40,
        PLAYER_ATTACK_HEAL: 0.4,
        PLAYER_HURT_PER_SEC: 100,
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
         * @param {{pos: vector, speed: vector, targetSpeed: vector, attackState: Waiting|BeforeAttack, health: number, targetHealth: number}} param0 
         */
        constructor({ pos, speed, targetSpeed, attackState, health, targetHealth, score, team, passive }) {
            this.pos = pos;
            this.speed = speed;
            this.targetSpeed = targetSpeed;
            this.attackState = attackState;
            this.health = health;
            this.targetHealth = targetHealth;
            this.score = score;
            this.team = team;
            this.passive = passive;
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
                    if (this.passive === PASSIVE.BROADSWORD) this.attackState = new AfterAttack({ time: 1.5 });
                    else this.attackState = Waiting;
                }
            }
            if (this.attackState instanceof AfterAttack) {
                this.attackState.time -= t;
                if (this.attackState.time <= 0) {
                    if(this.passive === SMELTING) {
                        this.attackState.time = 2;
                    }
                    else {
                        this.attackState = Waiting;
                    }
                }
            }
            this.health = Math.max(this.targetHealth, this.health - BASE.PLAYER_HURT_PER_SEC * t);
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
                    if(i[1].attackState instanceof BeforeAttack) {
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
                data.passive = i[1].passive;
                transferPassive[data.passive](data);
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
                    attackState: (() => {
                        if(i[1].type === 0) {
                            return Waiting;
                        }
                        else if(i[1].type === 1) {
                            return new BeforeAttack(i[1]);
                        }
                        else if(i[1].type === 2) {
                            return new AfterAttack(i[1]);
                        }
                    }),
                    health: i[1].health,
                    targetHealth: i[1].target_health,
                    score: typeof i[1].score === 'number' ? i[1].score : 0,
                    team: i[1].teamID,
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
            return this.players.has(playerIndex) && this.players.get(playerIndex).passive !== PASSIVE.SMELTING && this.players.get(playerIndex).attackState === Waiting;
        }
    }
})();