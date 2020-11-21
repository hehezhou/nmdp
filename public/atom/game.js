"use strict";
/** 
 * receive
 * ['create_success', id]
 * ['create_fail', reason]
 * ['join_success', id]
 * ['join_fail', reason]
 * ['force_quit', reason] 房间关闭
 * ['fail', reason] 输入非法
 */

/**
 * send
 * ['create', {type, setting} ] 创建房间 暂未实装
 * ['join', id] 加入房间
 * ['set_name', name] 暂未实装
 * ['join_auto', type] 自动加入该类型的房间
 */

/** 
 * receive
 * ['ready_state', {player_count, ready_count, start_time}] 加入房间后，开始游戏前 不断更新 (倒计时/ms)
 * ['game_start', {player_index, player_list, round, turn, map:{owner:number,terrain:number,building:{type:number,produce_count?:number,entry?:{n:boolean,w:boolean,s:boolean,e:boolean}},atom_count:number}[][]}]
 * ['game_update', {round, turn, choice:{x, y}|null}] 不断更新
 * ['decide_success', {x, y}]
 * ['decide_fail', reason]
 * ['game_end', rank]
 * ['player_lose', id] 玩家输了
 */

/**
 * send
 * ['set_ready_state', isReady]
 * ['decide', {x, y}|null]
 */

const io = new WebSocket(`ws://${location.host}/ws/`);
const JOIN_AUTO_FFA = Symbol('joinAutoFFA'), GAME_CONTINUE = Symbol('gameContinue'), future = {}, CONTINUE_TAG = Symbol('continueTag');
const MOUNTAIN = -2, NONE = -1, WATER = -3;
const TOWER = -3, BORN = -4, BRIDGE = -2;
let roomId;
function send(message) {
    io.send(JSON.stringify(message));
}
function clone(obj) {
    if (typeof obj === 'object') return JSON.parse(JSON.stringify(obj));
    else return obj;
}
function boom() {
    location.href = location.origin;
}
const HTML = {
    parse: function(x) {
        console.log(x);
        let p = this.create('p');
        p.innerText = x;
        return p.innerHTML;
    },
    setPixelated: function (x) {
        let type = navigator.userAgent;
        if (type.indexOf('Firefox') > -1) x.style.imageRendering = 'crisp-edges';
        else x.style.imageRendering = 'pixelated';
    },
    clearBody: function () {
        document.body.innerHTML = '';
    },
    /**
     * @param {string} tag 
     * @param {string?} className 
     * @param {string?} inner 
     * @returns {HTMLElement}
     */
    create: function (tag, className = '', inner = '') {
        let ret = document.createElement(tag);
        ret.className = className;
        ret.innerHTML = inner;
        return ret;
    },
};
const CANVAS = {
    COLOR: {
        colorList: [
            { "r": 255, "g": 0, "b": 0 },
            { "r": 0, "g": 255, "b": 0 },
            { "r": 0, "g": 0, "b": 255 },
            { "r": 255, "g": 170, "b": 0 },
            { "r": 0, "g": 255, "b": 170 },
            { "r": 170, "g": 0, "b": 255 },
            { "r": 170, "g": 255, "b": 0 },
            { "r": 0, "g": 170, "b": 255 },
            { "r": 255, "g": 0, "b": 170 },
            { "r": 255, "g": 56, "b": 0 },
            { "r": 0, "g": 255, "b": 56 },
            { "r": 56, "g": 0, "b": 255 },
            { "r": 255, "g": 227, "b": 0 },
            { "r": 0, "g": 255, "b": 227 },
            { "r": 227, "g": 0, "b": 255 },
            { "r": 113, "g": 255, "b": 0 },
            { "r": 0, "g": 113, "b": 255 },
            { "r": 255, "g": 0, "b": 113 },
            { "r": 255, "g": 113, "b": 0 },
            { "r": 0, "g": 255, "b": 113 },
            { "r": 113, "g": 0, "b": 255 },
            { "r": 227, "g": 255, "b": 0 },
            { "r": 0, "g": 227, "b": 255 },
            { "r": 255, "g": 0, "b": 227 },
            { "r": 56, "g": 255, "b": 0 },
            { "r": 0, "g": 56, "b": 255 },
            { "r": 255, "g": 0, "b": 56 },
            { "r": 255, "g": 18, "b": 0 },
            { "r": 0, "g": 255, "b": 18 },
            { "r": 18, "g": 0, "b": 255 },
            { "r": 255, "g": 189, "b": 0 },
            { "r": 0, "g": 255, "b": 189 },
            { "r": 189, "g": 0, "b": 255 },
            { "r": 151, "g": 255, "b": 0 },
            { "r": 0, "g": 151, "b": 255 },
            { "r": 255, "g": 0, "b": 151 },
            { "r": 255, "g": 75, "b": 0 },
            { "r": 0, "g": 255, "b": 75 },
            { "r": 75, "g": 0, "b": 255 },
            { "r": 255, "g": 246, "b": 0 },
            { "r": 0, "g": 255, "b": 246 },
            { "r": 246, "g": 0, "b": 255 },
            { "r": 94, "g": 255, "b": 0 },
            { "r": 0, "g": 94, "b": 255 },
            { "r": 255, "g": 0, "b": 94 },
            { "r": 255, "g": 132, "b": 0 },
            { "r": 0, "g": 255, "b": 132 },
            { "r": 132, "g": 0, "b": 255 },
            { "r": 208, "g": 255, "b": 0 },
            { "r": 0, "g": 208, "b": 255 },
            { "r": 255, "g": 0, "b": 208 },
            { "r": 37, "g": 255, "b": 0 },
            { "r": 0, "g": 37, "b": 255 },
            { "r": 255, "g": 0, "b": 37 },
            { "r": 255, "g": 37, "b": 0 },
            { "r": 0, "g": 255, "b": 37 },
            { "r": 37, "g": 0, "b": 255 },
            { "r": 255, "g": 208, "b": 0 },
            { "r": 0, "g": 255, "b": 208 },
            { "r": 208, "g": 0, "b": 255 },
            { "r": 132, "g": 255, "b": 0 },
            { "r": 0, "g": 132, "b": 255 },
            { "r": 255, "g": 0, "b": 132 },
            { "r": 255, "g": 94, "b": 0 },
            { "r": 0, "g": 255, "b": 94 },
            { "r": 94, "g": 0, "b": 255 },
            { "r": 246, "g": 255, "b": 0 },
            { "r": 0, "g": 246, "b": 255 },
            { "r": 255, "g": 0, "b": 246 },
            { "r": 75, "g": 255, "b": 0 },
            { "r": 0, "g": 75, "b": 255 },
            { "r": 255, "g": 0, "b": 75 },
            { "r": 255, "g": 151, "b": 0 },
            { "r": 0, "g": 255, "b": 151 },
            { "r": 151, "g": 0, "b": 255 },
            { "r": 189, "g": 255, "b": 0 },
            { "r": 0, "g": 189, "b": 255 },
            { "r": 255, "g": 0, "b": 189 },
            { "r": 18, "g": 255, "b": 0 },
            { "r": 0, "g": 18, "b": 255 },
            { "r": 255, "g": 0, "b": 18 },
            { "r": 255, "g": 6, "b": 0 },
            { "r": 0, "g": 255, "b": 6 },
            { "r": 6, "g": 0, "b": 255 },
            { "r": 255, "g": 176, "b": 0 },
            { "r": 0, "g": 255, "b": 176 },
            { "r": 176, "g": 0, "b": 255 },
            { "r": 164, "g": 255, "b": 0 },
            { "r": 0, "g": 164, "b": 255 },
            { "r": 255, "g": 0, "b": 164 },
            { "r": 255, "g": 63, "b": 0 },
            { "r": 0, "g": 255, "b": 63 },
            { "r": 63, "g": 0, "b": 255 },
            { "r": 255, "g": 233, "b": 0 },
            { "r": 0, "g": 255, "b": 233 },
            { "r": 233, "g": 0, "b": 255 },
            { "r": 107, "g": 255, "b": 0 },
            { "r": 0, "g": 107, "b": 255 },
            { "r": 255, "g": 0, "b": 107 },
            { "r": 255, "g": 120, "b": 0 },
            { "r": 128, "g": 128, "b": 128 },
        ],
        emptyColor: { r: 255, g: 255, b: 255 },
        waterColor: { r: 0, g: 128, b: 255 },
        mountainColor: { r: 240, g: 240, b: 240 },
        colorMix: function (a, b) {
            let ans = {};
            for (let i in a) {
                if (i in b) {
                    ans[i] = Math.round((a[i] + b[i]) / 2);
                }
            }
            return ans;
        },
        toRGBString: function ({ r, g, b }) {
            return `rgb(${r}, ${g}, ${b})`;
        },
        toRGBAString: function ({ r, g, b, a }) {
            return `rgba(${r}, ${g}, ${b}, ${a})`;
        },
    },
    ctx1: {},
    ctx2: {},
    ctx3: {},
    Ratio: 50,
    createCanvas: function (height, width) {
        let box = HTML.create('div', 'graph');
        let canvas4 = HTML.create('canvas', 'hover');
        let canvas3 = HTML.create('canvas', 'atom');
        let canvas2 = HTML.create('canvas', 'build');
        let canvas1 = HTML.create('canvas', 'background');
        canvas1.height = height * this.Ratio;
        canvas1.width = width * this.Ratio;
        canvas2.height = height * this.Ratio;
        canvas2.width = width * this.Ratio;
        canvas3.height = height * this.Ratio;
        canvas3.width = width * this.Ratio;
        canvas4.height = height * this.Ratio;
        canvas4.width = width * this.Ratio;
        canvas1.style.height = canvas2.style.height = canvas3.style.height = canvas4.style.height = `${height * this.Ratio / 2}px`;
        canvas1.style.width = canvas2.style.width = canvas3.style.width = canvas4.style.width = `${width * this.Ratio / 2}px`;
        box.appendChild(canvas1);
        box.appendChild(canvas2);
        box.appendChild(canvas3);
        box.appendChild(canvas4);
        box.style.height = `${height * this.Ratio / 2 + 4}px`;
        box.style.width = `${width * this.Ratio / 2 + 4}px`;
        HTML.setPixelated(canvas1);
        HTML.setPixelated(canvas4);
        this.ctx1 = canvas1.getContext('2d');
        this.ctx2 = canvas2.getContext('2d');
        this.ctx3 = canvas3.getContext('2d');
        return box;
    },
    setBackground: function ({ x, y }, { terrain, building, owner, atoms: atom_count }) {
        if (owner === null) owner = -1;
        let fill;
        if (terrain === MOUNTAIN) fill = this.COLOR.mountainColor;
        else if (terrain === WATER) fill = this.COLOR.waterColor;
        else if (building === BRIDGE);
        else if (terrain === NONE) fill = owner === -1 ? this.COLOR.emptyColor : this.COLOR.colorList[owner];
        else throw new Error('error type');
        this.ctx1.fillStyle = this.COLOR.toRGBString(fill);
        this.ctx1.fillRect(y * this.Ratio, x * this.Ratio, this.Ratio, this.Ratio);
    },
    setBuilding: function ({ x, y }, { atoms, terrain, building, owner }) {
        if (owner === null) owner = -1;
        let pos = { x: x * this.Ratio, y: y * this.Ratio };
        if (building.type === TOWER) DRAW.tower(this.ctx2, 'black', pos);
        else if (building.type === BORN) DRAW.born(this.ctx2, 'black', pos);
        else if (building.type === BRIDGE) DRAW.bridge(this.ctx2, owner === -1 ? 'white' : this.COLOR.toRGBString(this.COLOR.colorList[owner]), pos, building.entry);
        else if (terrain === MOUNTAIN) DRAW.mountain(this.ctx2, 'black', pos);
        else if (terrain === WATER && (x + y) % (2 * this.Ratio)) DRAW.water(this.ctx2, 'black', pos);
        else this.ctx2.clearRect(pos.y, pos.x, this.Ratio, this.Ratio);
    },
    setAtom: function ({ x: y, y: x }, { owner, building, atoms: atom_count }) {
        x = x * this.Ratio;
        y = y * this.Ratio;
        this.ctx3.clearRect(x, y, this.Ratio, this.Ratio);
        if (atom_count === 0) return;
        let delta = 2 * Math.PI / atom_count;
        let color = atom_count > 0 ? owner === null ? 'gray' : 'white' : 'red';
        if (atom_count < 0) atom_count = -atom_count;
        if (building === BRIDGE || atom_count === 1) {
            this.ctx3.beginPath();
            this.ctx3.arc(x + 25, y + 25, 5, 0, 2 * Math.PI);
            this.ctx3.closePath();
            this.ctx3.fillStyle = color;
            this.ctx3.fill();
            return;
        }
        for (let i = 0; i < atom_count; i++) {
            let theta = i * delta;
            if (atom_count === 2) theta += Math.PI / 2;
            let midx = x + 25 - 11 * Math.sin(theta);
            let midy = y + 25 - 11 * Math.cos(theta);
            this.ctx3.beginPath()
            this.ctx3.arc(midx, midy, 4.5, 0, 2 * Math.PI);
            this.ctx3.fillStyle = color;
            this.ctx3.closePath();
            this.ctx3.fill();
        }
    },
    initDraw: function (map) {
        let n = map.length, m = map[0].length;
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < m; j++) {
                this.setBackground({ x: i, y: j }, map[i][j]);
                this.setBuilding({ x: i, y: j }, map[i][j]);
                this.setAtom({ x: i, y: j }, map[i][j]);
            }
        }
    },
    update: function ({ x, y }, data) {
        this.setBackground({ x, y }, data);
        this.setBuilding({ x, y }, data);
        this.setAtom({ x, y }, data);
    },
};
const WORK = {
    chooseInterface: async function () {
        const typeList = {
            '重新连接': { check: () => Boolean(localStorage.atomLastRoomId), type: GAME_CONTINUE, },
            '经典 FFA': { check: () => true, type: JOIN_AUTO_FFA, },
        };
        HTML.clearBody();
        let frame = HTML.create('div', 'frame choose-interface');
        return await new Promise(resolve => {
            frame.appendChild(HTML.create(`h1`, 'welcome', 'Welcome to Atom'));
            for (let i in typeList) {
                if (typeList[i].check()) {
                    let btn = HTML.create('button', 'choose', i);
                    btn.addEventListener('click', () => {
                        resolve(typeList[i].type);
                    });
                    frame.appendChild(btn);
                }
            }
            document.body.appendChild(frame);
        });
    },
    joinInterface: async function (type) {
        if (type === CONTINUE_TAG) return CONTINUE_TAG;
        HTML.clearBody();
        let frame = HTML.create('div', 'frame join-interface');
        function addWait(ele, data) {
            let now = 0, max = 3;
            return setInterval(() => {
                let str = ['<span style="color: rgba(0, 0, 0, 1)">', data];
                for (let i = 0; i < now; i++) str.push('.');
                str.push('</span><span style="color: rgba(0, 0, 0, 0);">')
                for (let i = now; i < max; i++) str.push('.');
                str.push('</span>')
                ele.innerHTML = str.join('');
                if (now++ === max) now = 0;
            }, 600);
        }
        async function joinAutoFFA() {
            let p = HTML.create('p', 'join')
            frame.appendChild(p);
            document.body.appendChild(frame);
            return await new Promise(resolve => {
                let tmp = addWait(p, '正在匹配');
                send(['join_auto', 'atom']);
                io.addEventListener('message', function x(msg) {
                    let data = JSON.parse(msg.data);
                    if (data[0] === 'join_success') roomId = data[1], resolve(type);
                    else if (data[0] === 'join_fail') alert('匹配失败, 原因: ' + data[1]), resolve(CONTINUE_TAG);
                    else return;
                    clearInterval(tmp);
                    io.removeEventListener('message', x);
                });
            });
        }
        async function gameContinue() {
            let p = HTML.create('p', 'join');
            frame.appendChild(p);
            document.body.appendChild(frame);
            return await new Promise(resolve => {
                let tmp = addWait(p, '正在重新连接');
                send(['join', localStorage.atomLastRoomId]);
                localStorage.removeItem('atomLastRoomId');
                io.addEventListener('message', function x(msg) {
                    let data = JSON.parse(msg.data);
                    if (data[0] === 'join_success') roomId = data[1], resolve(type);
                    else if (data[0] === 'join_fail') alert('重新连接失败, 原因: ' + data[1]), resolve(CONTINUE_TAG);
                    else return;
                    clearInterval(tmp);
                    io.removeEventListener('message', x);
                });
            });
        }
        if (type === GAME_CONTINUE) return await gameContinue();
        else if (type === JOIN_AUTO_FFA) return await joinAutoFFA();
        else return console.error(`unknown type ${type}`), CONTINUE_TAG;
    },
    readyInterface: async function (type) {
        if (type === CONTINUE_TAG) return { type: CONTINUE_TAG };
        HTML.clearBody();
        let frame = HTML.create('div', 'frame ready-interface'),
            readyMsg = HTML.create('p', 'ready-state'),
            countdown = HTML.create('h1', 'countdown'),
            btn = HTML.create('button', 'unready', '准备提前开始');
        frame.appendChild(countdown);
        frame.appendChild(readyMsg);
        frame.appendChild(btn);
        document.body.appendChild(frame);
        let playerCnt = 0, readyCnt = 0, flag = 1;
        let startTime = null;
        let tmp = setInterval(() => {
            if (startTime === null) countdown.innerHTML = '对局仍不能开始';
            else countdown.innerHTML = `倒计时: ${Math.ceil((startTime - Date.now()) / 1000)}s`;
        }, 0);
        btn.addEventListener('click', () => {
            if (btn.className === 'unready') {
                btn.className = 'ready';
                btn.innerHTML = '取消提前开始';
            }
            else {
                btn.className = 'unready';
                btn.innerHTML = '准备提前开始';
            }
            flag = 0;
            send(['set_ready_state', btn.className === 'ready']);
        });
        return await new Promise(resolve => {
            io.addEventListener('message', function x(msg) {
                let data = JSON.parse(msg.data);
                if (data[0] === 'game_start') {
                    localStorage.atomLastRoomId = roomId;
                    resolve({ data: data[1], type });
                    io.removeEventListener('message', x);
                    clearInterval(tmp);
                }
                else if (data[0] === 'ready_state') {
                    playerCnt = data[1].player_count;
                    readyCnt = data[1].ready_count;
                    startTime = data[1].start_time === null ? null : Date.now() + data[1].start_time;
                    if (flag) flag = 0, send(['set_ready_state', btn.className === 'ready']);
                    readyMsg.innerHTML = `提前开始: ${readyCnt} / ${playerCnt}`;
                }
            })
        });
    },
    gameInterface: async function ({ data, type }) {
        if (type === CONTINUE_TAG) return CONTINUE_TAG;
        let ATOMmap = CORE.GameMap.fromPlain(data.map);
        let playerCnt = data.player_list.length;
        let List = Array(playerCnt);
        for (let i = 0; i < playerCnt; i++) List[i] = i;
        let decide, simulate;
        let height = data.map.length, width = data.map[0].length;
        let playerIndex = data.player_index, playerList = data.player_list;
        let alive = Array(playerList.length);
        alive.fill(1);
        HTML.clearBody();
        let frame = HTML.create('div', 'frame game-interface');
        let canva = CANVAS.createCanvas(height, width);
        let allHeight = Number(canva.style.height.slice(0, -2));
        frame.style.gridTemplateRows = `[st] ${Math.floor(allHeight * 0.25)}px ${Math.ceil(allHeight * 0.75)}px [en]`;
        frame.style.gridTemplateColumns = `250px ${canva.style.width} 250px`;
        CANVAS.initDraw(data.map);
        let nowRound = data.round, nowTurn = data.turn;
        function getPlayerName(index) {
            return `<span style="color:${CANVAS.COLOR.toRGBString(CANVAS.COLOR.colorList[index])};">${HTML.parse(playerList[index])}</span>`;
        }
        function getRoundMsg() {
            return `当前轮数: ${nowRound + 1}<br/>当前行动: ${getPlayerName(nowTurn)}<br/>你是: ${getPlayerName(playerIndex)}${playerIndex === nowTurn ? '<br/><strong>现在轮到你行动了</strong>' : '<br/>'}`;
        }
        let lastMap = ATOMmap.toPlain(), msgBox = HTML.create('div', 'message');
        let rankList = [];
        function getPlayerMsg() {
            let str = [];
            let atomCnt = Array(playerCnt), has = Array(playerCnt);
            atomCnt.fill(0);
            has.fill(0);
            lastMap.forEach(line => line.forEach(data => {
                if (data.owner !== null && data.owner >= 0) atomCnt[data.owner] += data.atoms, has[data.owner] = 1;
            }));
            has.forEach((data, index) => {
                if (data === 0 && alive[index]) {
                    alive[index] = 0;
                    rankList.unshift(index);
                    msgBox.innerHTML += index === playerIndex ? `你阵亡了<br/>` : `${getPlayerName(index)}阵亡了<br/>`;
                }
            });
            playerList.forEach((data, index) => {
                if (alive[index]) str.push(`${getPlayerName(index)} ${atomCnt[index]}个<br/>`);
            });
            playerList.forEach((data, index) => {
                if (!alive[index]) str.push(`${getPlayerName(index)} 阵亡<br/>`);
            });
            return str.join('');
        }
        let roundMsg = HTML.create('div', 'round', getRoundMsg()), playerMsg = HTML.create('div', 'player-message', getPlayerMsg());
        frame.appendChild(roundMsg), frame.appendChild(playerMsg);
        frame.appendChild(canva);
        frame.appendChild(msgBox);
        document.body.appendChild(frame);
        return await new Promise(resolve => {
            let canvas = document.getElementsByClassName('hover')[0];
            let decideList = [], headDecide = 0;
            let nowCallback = null;
            decide = function (player, callback) {
                if (headDecide !== decideList.length) callback(decideList[headDecide++]);
                else nowCallback = callback;
            }
            let running = 0;
            simulate = (() => {
                let mapList = [];
                async function run() {
                    running = 1;
                    let head = 0;
                    while (head < mapList.length) {
                        let newMap = mapList[head++];
                        for (let i = 0; i < height; i++) {
                            for (let j = 0; j < width; j++) {
                                if (lastMap[i][j] !== newMap[i][j]) CANVAS.update({ x: i, y: j }, newMap[i][j]);
                            }
                        }
                        lastMap = newMap;
                        roundMsg.innerHTML = getRoundMsg();
                        playerMsg.innerHTML = getPlayerMsg();
                        for (let i = 0; i < 5; i++) await new Promise(resolve => requestAnimationFrame(resolve));
                    }
                    mapList = [];
                    running = 0;
                }
                return map => {
                    map = map.toPlain();
                    mapList.push(map);
                    if (running === 0) run();
                }
            })();
            let ATOM = new CORE.Game({ round: data.round, map: ATOMmap, turn: data.turn, players: List, onDecide: decide, onSimulate: simulate });
            ATOM.play();
            io.addEventListener('message', async function x(msg) {
                let data = JSON.parse(msg.data);
                if (data[0] === 'game_update') {
                    if (nowCallback === null) decideList.push(data[1].choice);
                    else {
                        let tmp = nowCallback;
                        nowCallback = null;
                        tmp(data[1].choice);
                    }
                    nowRound = ATOM.round;
                    nowTurn = ATOM.turn;
                    roundMsg.innerHTML = getRoundMsg();
                    playerMsg.innerHTML = getPlayerMsg();
                }
                else if (data[0] === 'game_end') {
                    while (running === 1) await new Promise(resolve => setTimeout(resolve, 500));
                    alive.forEach((data, index) => data ? rankList.unshift(index) : undefined);
                    resolve({ rank: rankList, playerIndex });
                    io.removeEventListener('message', x);
                }
                else if (data[0] === 'decide_fail') {
                    msgBox.innerHTML += `决策有误, 原因:${HTML.parse(data[1])}<br/>`;
                }
            });
            function pos(event) {
                let { offsetX: y, offsetY: x } = event;
                // x -= 2, y -= 2;
                x = Math.floor(CANVAS.Ratio * x / (canvas.offsetHeight - 4) * height);
                y = Math.floor(CANVAS.Ratio * y / (canvas.offsetWidth - 4) * width);
                return { x, y };
            }
            canva.addEventListener('click', (event) => {
                event.preventDefault();
                let { x, y } = pos(event);
                x = Math.floor(x / CANVAS.Ratio);
                y = Math.floor(y / CANVAS.Ratio);
                if (running === 1 || nowTurn !== playerIndex) return;
                if (ATOM.check(playerIndex, { x, y })) {
                    send(['decide', { x, y }]);
                }
                else msgBox.innerHTML += `请选择自己的空地或出生点<br/>`;
            });
            document.addEventListener('keydown', (event) => {
                if (event.key !== 'p' && event.key !== 'P') return;
                if (running === 1 || nowTurn !== playerIndex) return;
                send(['decide', null]);
            });
            let nowX = -1, nowY = -1;
            let ctx = canvas.getContext('2d');
            function addHover() {
                if (nowX < 0 || nowX >= height || nowY < 0 || nowY >= width) return;
                ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                let borderWidth = 4;
                ctx.fillRect(nowY * CANVAS.Ratio, nowX * CANVAS.Ratio, CANVAS.Ratio, CANVAS.Ratio);
                ctx.clearRect(nowY * CANVAS.Ratio + borderWidth, nowX * CANVAS.Ratio + borderWidth, CANVAS.Ratio - 2 * borderWidth, CANVAS.Ratio - 2 * borderWidth);
            }
            function delHover() {
                if (nowX < 0 || nowX >= height || nowY < 0 || nowY >= width) return;
                ctx.clearRect(nowY * CANVAS.Ratio, nowX * CANVAS.Ratio, CANVAS.Ratio, CANVAS.Ratio);
            }
            canva.addEventListener('mouseenter', (event) => {
                let { x, y } = pos(event);
                x = Math.floor(x / CANVAS.Ratio);
                y = Math.floor(y / CANVAS.Ratio);
                nowX = x, nowY = y;
                addHover();
            });
            canva.addEventListener('mousemove', (event) => {
                let { x, y } = pos(event);
                x = Math.floor(x / CANVAS.Ratio);
                y = Math.floor(y / CANVAS.Ratio);
                delHover();
                nowX = x, nowY = y;
                addHover();
            });
            canva.addEventListener('mouseleave', () => {
                delHover();
                nowX = -1, nowY = -1;
            });
        });
    },
    endInterface: async function (data) {
        if (data === CONTINUE_TAG) return CONTINUE_TAG;
        let { rank, playerIndex } = data;
        await new Promise(resolve => setTimeout(resolve, 4750));
        rank = rank.indexOf(playerIndex);
        HTML.clearBody();
        let frame = HTML.create('div', 'frame end-interface');
        frame.appendChild(HTML.create('h1', 'rank', `你是第 ${rank + 1} 名`));
        let btn = HTML.create('button', 'restart', '确定');
        frame.appendChild(btn);
        document.body.appendChild(frame);
        await new Promise(resolve => btn.addEventListener('click', resolve));
    },
};
async function work() {
    await WORK.endInterface(await WORK.gameInterface(await WORK.readyInterface(await WORK.joinInterface(await WORK.chooseInterface()))));
}
async function run() {
    let tag = 0;
    io.addEventListener('close', () => {
        if (tag === -1) return;
        alert(tag ? '连接断开' : '连接失败');
    });
    await new Promise(resolve => io.addEventListener('open', resolve));
    tag = 1;
    io.addEventListener('message', (msg) => {
        let data = JSON.parse(msg.data);
        if (data[0] !== 'force_quit') return;
        if (data[1].trim() === 'login first') {
            tag = -1;
            location.href = location.origin + '/login';
        }
        else {
            setTimeout(alert(`房间已关闭, 原因: ${data[1]}`), 200);
            boom();
        }
    });
    while (1) await work();
}
run();