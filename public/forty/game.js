"use strict";
/** receive
 * ['game_start', {map_height, map_width, id}]
 * Vector: {
 *     x: number;
 *     y: number;
 * }
 * PlayerData: {
 *     pos: Vector;
 *     speed: Vector;
 *     target_speed: Vector;
 *     health: Number;
 *     target_health: Number;
 *     attack_state:{time?: Number, angle?: Number, type: Number};
 *         0: waiting
 *         1: before_attack
 *         2: after_attack
 *     score: Number;
 *     teamID: String;
 * }
 * ['game_update', {map:{players: Map<ID, PlayerData>}}]
 * ['player_lose', {deadID, killerID}]
 * ['request_choice', {type: 'skills'}]
 */

/** send
 * ['set_skills', {passive: Number}];
 * ['attack', theta]
 * ['set_direction', -1 ~ 7];
 */
/**
 * 3  2  1
 * 4 -1  0
 * 5  6  7
 */
const io = new WebSocket(`ws://${location.host}/ws/`);
var GAME_TYPE = {
    FFA: Symbol('ffa'),
    TEAM: Symbol('team'),
}
var CONTINUE_TAG = Symbol('continue_tag'), JOIN_AUTO_FFA = Symbol('join_auto_ffa'), SET_SETTINGS = Symbol('set_settings'), DIE = Symbol('die'), JOIN_AUTO_FFA_BETA = Symbol('ffa_beta'), JOIN_AUTO_TEAM = Symbol('join_auto_team');
var future = Symbol('future');
var Beta;
const W = 1, S = 2, A = 4, D = 8;
const moveList = [-1, 2, 6, -1, 4, 3, 5, 4, 0, 1, 7, 0, -1, 2, 6, -1];

var EFFECT = {
    BLOOD: 0,
    DAGGER: 1,
    BROADSWORD: 2,
    FURNACE: 3,
};

const SETTINGS = {
    PLAYERRADIUS: 3,
    LITTLEMAPSIZE: 40,
};

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
    parse: function (x) {
        let p = document.createElement('p');
        p.innerText = x;
        return p.innerHTML;
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
        let ele = document.createElement(tag);
        if (className) ele.className = className;
        if (inner) ele.innerHTML = inner;
        return ele;
    },
    setPixelated: function (ele) {
        if (window.navigator.appVersion.indexOf('firefox') != -1) ele.style.imageRendering = 'crisp-edges';
        else ele.style.imageRendering = 'pixelated';
    }
};

async function settingInterface() {
    HTML.clearBody();
    let nameList = {
        'PLAYERRADIUS': { text: '人物大小: ', btnList: [{ text: '小', value: 1.5 }, { text: '中', value: 3 }, { text: '大', value: 5 }] },
        'LITTLEMAPSIZE': { text: '小地图大小: ', btnList: [{ text: '小', value: 20 }, { text: '中', value: 40 }, { text: '大', value: 60 }] },
    };
    function update() {
        for (let i in SETTINGS) {
            for (let j of nameList[i].btnList) {
                if (j.value === SETTINGS[i]) j.btn.className = 'settings-chosen';
                else j.btn.className = 'settings';
            }
        }
        localStorage.fortySettings = JSON.stringify(SETTINGS);
    }
    let frame = HTML.create('div', 'frame setting-interface');
    document.body.appendChild(frame);
    let cnt = 0;
    for (let i in SETTINGS) cnt++;
    frame.style.gridTemplateRows = `repeat(135px, ${cnt + 1})`;
    for (let i in SETTINGS) {
        let div = HTML.create('div', 'settings');
        div.appendChild(HTML.create('p', 'settings', nameList[i].text));
        for (let j of nameList[i].btnList) {
            j.btn = HTML.create('button', 'settings', j.text);
            j.btn.addEventListener('click', () => {
                SETTINGS[i] = j.value;
                update();
            });
            div.appendChild(j.btn);
        }
        frame.appendChild(div);
    }
    update();
    await new Promise(resolve => {
        let btn = HTML.create('button', 'settings', '完成'), div = HTML.create('div', 'settings');
        div.appendChild(btn);
        frame.appendChild(div);
        btn.addEventListener('click', resolve);
    })
}
async function skillsInterface() {
    HTML.clearBody();
    let nameList = {
        'passive': { text: '被动: ', btnList: [{ text: '嗜血', value: 'poet', beta: false }, { text: '匕首', value: 'knife', beta: false }, { text: '重刃', value: 'broadsword', beta: false }, { text: '熔炉', value: 'furnace', beta: false }, { text: '剑魔', value: 'king', beta: false }] },
    };
    let frame = HTML.create('div', 'frame skills-interface');
    document.body.appendChild(frame);
    let cnt = 0;
    for (let i in nameList) cnt++;
    frame.style.gridTemplateRows = `repeat(135px, ${cnt})`;
    let promiseList = [];
    for (let i in nameList) {
        let now = nameList[i];
        promiseList.push(new Promise(resolve => {
            let div = HTML.create('div', 'skills');
            let running = 1;
            div.appendChild(HTML.create('p', 'skills', now.text));
            for (let j of now.btnList) {
                if (j.beta && !Beta) continue;
                j.btn = HTML.create('button', 'skills', j.text);
                j.btn.addEventListener('click', () => {
                    if (running === 0) return;
                    j.btn.className = 'skills-chosen';
                    running = 0;
                    resolve({ name: i, value: j.value });
                });
                div.appendChild(j.btn);
            }
            frame.appendChild(div);
        }));
    }
    let list = await Promise.all(promiseList);
    let ans = {};
    list.forEach(data => ans[data.name] = data.value);
    return ans;
}

async function chooseInterface(tag) {
    const typeList = {
        '经典 FFA': { check: () => true, type: JOIN_AUTO_FFA, },
        '团队': { check: () => true, type: JOIN_AUTO_TEAM, },
        'FFA-Beta': { check: () => true, type: JOIN_AUTO_FFA_BETA, },
        '设置': { check: () => true, type: SET_SETTINGS },
    };
    HTML.clearBody();
    let frame = HTML.create('div', 'frame choose-interface');
    return await new Promise(resolve => {
        frame.appendChild(HTML.create(`h1`, 'welcome', 'Welcome to FORTY!!'));
        for (let i in typeList) {
            if (typeList[i].check()) {
                let btn = HTML.create('button', 'choose', i);
                btn.addEventListener('click', async () => {
                    if (typeList[i].type === SET_SETTINGS) {
                        await settingInterface();
                        resolve(await chooseInterface(tag));
                    }
                    else {
                        resolve(typeList[i].type);
                    }
                });
                frame.appendChild(btn);
            }
        }
        document.body.appendChild(frame);
    });
}
async function joinInterface(type) {
    if (type === CONTINUE_TAG) return CONTINUE_TAG;
    HTML.clearBody();
    let frame = HTML.create('div', 'frame join-interface');
    function addWait(ele, data) {
        let now = 0, max = 3;
        return setInterval(() => {
            let str = ['<span style="color: rgba(0, 0, 0, 1)">', HTML.parse(data)];
            for (let i = 0; i < now; i++) str.push('.');
            str.push('</span><span style="color: rgba(0, 0, 0, 0);">')
            for (let i = now; i < max; i++) str.push('.');
            str.push('</span>')
            ele.innerHTML = str.join('');
            if (now++ === max) now = 0;
        }, 600);
    }
    async function joinAuto() {
        let p = HTML.create('p', 'join');
        frame.appendChild(p);
        document.body.appendChild(frame);
        return await new Promise(resolve => {
            let tmp = addWait(p, '正在匹配');
            let roomName;
            if (type === JOIN_AUTO_FFA) roomName = 'forty';
            else if (type === JOIN_AUTO_TEAM) roomName = 'forty-team';
            else if (type === JOIN_AUTO_FFA_BETA) roomName = 'forty-beta'
            send(['join_auto', roomName]);
            io.addEventListener('message', async function x(msg) {
                let data = JSON.parse(msg.data);
                if (data[0] === 'join_success') {
                    localStorage.fortyLastRoomId = roomId = data[1];
                    if (type === JOIN_AUTO_FFA) Beta = false, resolve(GAME_TYPE.FFA);
                    if (type === JOIN_AUTO_TEAM) Beta = false, resolve(GAME_TYPE.TEAM);
                    if (type === JOIN_AUTO_FFA_BETA) Beta = true, resolve(GAME_TYPE.FFA);
                    resolve(CONTINUE_TAG);
                }
                else if (data[0] === 'join_fail') alert('匹配失败, 原因: ' + data[1]), resolve(CONTINUE_TAG);
                else return;
                clearInterval(tmp);
                io.removeEventListener('message', x);
            });
        });
    }
    if (type === JOIN_AUTO_FFA || type === JOIN_AUTO_TEAM || type === JOIN_AUTO_FFA_BETA) return await joinAuto();
    else return console.error(`unknown type ${type}`), CONTINUE_TAG;
}
async function readyInterface(type) {
    if (type === CONTINUE_TAG) return CONTINUE_TAG;
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
        io.addEventListener('message', async function x(msg) {
            let data = JSON.parse(msg.data);
            if (data[0] === 'game_start') {
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
            else if (data[0] === 'request_choice') {
                if (data[1].type === 'skills') send(['set_skills', await skillsInterface()]);
            }
        })
    });
}
const SVG = {
    create: function (tag) {
        return document.createElementNS('http://www.w3.org/2000/svg', tag);
    }
};
async function gameInterface(msg) {
    if (msg === CONTINUE_TAG) return CONTINUE_TAG;
    HTML.clearBody();
    let { data, type } = msg;
    let height = data.map_height, width = data.map_width;
    let nowWidth, nowHeight, alive = 1;
    let ratio = Math.min(height / (SETTINGS.LITTLEMAPSIZE * window.innerHeight / 100), width / (SETTINGS.LITTLEMAPSIZE * window.innerHeight / 100));
    let svg = SVG.create('svg'), frame = HTML.create('div', 'frame game-interface-ffa');
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svg.setAttribute('version', '1.1');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    let littleMap = HTML.create('canvas', 'little-map');
    let skillBox = HTML.create('div', 'skill-box'), nowSkills = [];
    let skillBoxs = (() => {
        function x() {
            let img = HTML.create('img', 'skill'), box = HTML.create('div', 'skill'), cover = HTML.create('div', 'skill-cover');
            box.appendChild(img);
            box.appendChild(cover);
            skillBox.appendChild(box);
            return { img, box, cover };
        }
        return [x(), x()];
    }
    )();
    littleMap.height = Math.ceil(height / ratio), littleMap.width = Math.ceil(width / ratio);
    HTML.setPixelated(littleMap);
    littleMap.style.height = `${SETTINGS.LITTLEMAPSIZE}vh`;
    littleMap.style.width = `${SETTINGS.LITTLEMAPSIZE}vh`;
    let deadMsg = '', deadMsgToTime = 0;
    let standingBox = HTML.create('div', 'standing');
    document.body.appendChild(svg);
    document.body.appendChild(littleMap);
    document.body.appendChild(frame);
    document.body.appendChild(standingBox);
    document.body.appendChild(skillBox);
    document.body.className = 'game';
    function updateSize() {
        nowWidth = window.innerWidth;
        nowHeight = window.innerHeight;
        let d = (nowWidth * nowHeight + 0.01) / (1920 * 969) * 15;
        d = d ** 0.5;
        nowWidth = Math.ceil(nowWidth / d);
        nowHeight = Math.ceil(nowHeight / d);
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    let FORTY = new GAME({ data, type });
    let playerIndex = data.id;
    let X = 0, Y = 0;
    const playerRadius = SETTINGS.PLAYERRADIUS, lastTime = 0.1, HPheight = 3, HPwidth = 20, fontSize = 6, HPdis = 3, textDis = 3;
    const lineDis = 100, lineWidth = 4;
    let rectList = [], svgCircleMap = new Map(), svgAttackMap = new Map(), svgTextMap = new Map(), svgHPMap = new Map();
    let g_knife = SVG.create('g'),
        g_backgroundLine = SVG.create('g'),
        g_HP = SVG.create('g'),
        g_text = SVG.create('g'),
        g_body = SVG.create('g'),
        g_attack = SVG.create('g');
    svg.appendChild(g_backgroundLine);
    svg.appendChild(g_body);
    svg.appendChild(g_attack);
    svg.appendChild(g_knife);
    svg.appendChild(g_HP);
    svg.appendChild(g_text);
    return await new Promise(resolve => {
        let running = 1;
        let nowMouseX = 0, nowMouseY = 0;
        let fixInnerWidth;
        function flush() {
            fixInnerWidth = window.innerWidth / nowWidth;
        }
        function fix(x) {
            return x * fixInnerWidth;
        }
        let lastCalcTime = 0;
        const skillBanChecks = {
            "king_q": (data) => {
                if (data.onattack && data.attackRestTime >= 0) return 1;
                return 0;
            }
        };
        let myTeam, myData;
        requestAnimationFrame(async function x() {
            for (let i of skillBoxs) {
                i.box.style.display = 'none';
            }
            let delta = Date.now() - lastCalcTime;
            lastCalcTime += delta;
            delta /= 1000;
            let tag = 0;
            let { players, standing } = FORTY.getNowMap();
            players.forEach(data => {
                if (data.id === playerIndex) myData = data, X = data.x - nowHeight / 2, Y = data.y - nowWidth / 2, tag = 1, myTeam = data.team;
            });
            for (let [name, skill] of nowSkills) {
                let id;
                switch (name[name.length - 1]) {
                    case 'q': {
                        id = 0;
                        break;
                    }
                    case 'e': {
                        id = 1;
                        break;
                    }
                    default: {
                        id = -1;
                        break;
                    }
                }
                if (id == -1) continue;
                let { box, img, cover } = skillBoxs[id];
                let str = '../sources/images/' + name + '.jpg';
                // console.log(myData);
                if (myData && myData.img[name]) {
                    str = '../sources/images/' + myData.img[name];
                }
                if (img.src !== str) img.src = str;
                box.style.display = 'inline-block';
                skill.cooldown -= delta;
                skill.cooldown = Math.max(skill.cooldown, 0);
                cover.style.height = `${10 * skill.cooldown / skill.total_cooldown}vh`;
                img.style.borderColor = skill.is_active ? 'red' : 'black';
                if (skill.cooldown === 0 && !skill.is_active) {
                    if (skillBanChecks[name] && skillBanChecks[name](myData)) {
                        cover.style.height = `${10}vh`;
                        img.style.borderColor = 'gray';
                    }
                }
            }
            flush();
            g_knife.innerHTML = '';
            let nowFillColor = 'rgb(0, 0, 0)', nowStrokeColor = 'rgb(0, 0, 0)', nowLineWidth = 1;
            let littlecxt = littleMap.getContext('2d');
            littlecxt.clearRect(0, 0, width, height);
            littlecxt.fillStyle = 'rgba(128, 128, 128, 0.5)';
            littlecxt.fillRect(0, 0, littleMap.width, littleMap.height);
            players.forEach(data => {
                littlecxt.fillStyle = data.team === myTeam ? 'blue' : 'red';
                littlecxt.fillRect(Math.floor((data.y) / ratio) - 2.5, Math.floor((width + data.x)) / ratio - 2.5, 5, 5);
            });
            function setStyle(ele) {
                ele.setAttribute('fill', `${nowFillColor}`);
                ele.setAttribute('stroke-width', `${nowLineWidth}`);
                ele.setAttribute('stroke', `${nowStrokeColor}`);
            }
            nowFillColor = nowStrokeColor = 'rgb(128, 128, 128)';
            nowLineWidth = 0;
            let cnt = 0;
            for (let i = Math.floor(X / lineDis) * lineDis - X; i < nowHeight; i += lineDis) {
                if (i + X > 0 || i + X < -width) continue;
                if (i + lineWidth / 2 <= 0 || i - lineWidth / 2 >= nowHeight) continue;
                if (cnt === rectList.length) {
                    let rect = SVG.create('rect');
                    setStyle(rect);
                    rectList.push(rect);
                    g_backgroundLine.appendChild(rect);
                }
                let rect = rectList[cnt++];
                rect.setAttribute('x', `${fix(0 - Y - lineWidth / 2)}`);
                rect.setAttribute('y', `${fix(i - lineWidth / 2)}`);
                rect.setAttribute('width', `${fix(width + lineWidth)}`);
                rect.setAttribute('height', `${fix(lineWidth)}`);
            }
            for (let i = Math.floor(Y / lineDis) * lineDis - Y; i < nowWidth; i += lineDis) {
                if (i + Y < 0 || i + Y > height) continue;
                if (i + lineWidth / 2 <= 0 || i - lineWidth / 2 >= nowWidth) continue;
                if (cnt === rectList.length) {
                    let rect = SVG.create('rect');
                    setStyle(rect);
                    rectList.push(rect);
                    g_backgroundLine.appendChild(rect);
                }
                let rect = rectList[cnt++];
                rect.setAttribute('x', `${fix(i - lineWidth / 2)}`);
                rect.setAttribute('y', `${fix(-height - X - lineWidth / 2)}`);
                rect.setAttribute('width', `${fix(lineWidth)}`);
                rect.setAttribute('height', `${fix(height + lineWidth)}`);
            }
            while (rectList.length > cnt) {
                let now = rectList[rectList.length - 1];
                now.remove();
                rectList.pop();
            }
            nowStrokeColor = 'black';
            nowLineWidth = fix(0.5);
            let tmpSet = new Set();
            players.forEach(data => {
                tmpSet.add(data.id);
                nowFillColor = data.color;
                if (!svgCircleMap.has(data.id)) {
                    let tmp = SVG.create('circle');
                    svgCircleMap.set(data.id, tmp);
                    g_body.appendChild(tmp);
                }
                let circle = svgCircleMap.get(data.id);
                setStyle(circle);
                circle.setAttribute('cx', `${Math.floor(fix(data.y - Y))}`);
                circle.setAttribute('cy', `${Math.floor(fix(data.x - X))}`);
                circle.setAttribute('r', `${Math.floor(fix(playerRadius))}`);
            });
            let deleteList;
            deleteList = [];
            for (let i of svgCircleMap) {
                if (!tmpSet.has(i[0])) deleteList.push(i[0]);
            }
            for (let i of deleteList) svgCircleMap.get(i).remove(), svgCircleMap.delete(i);
            tmpSet.clear();
            players.forEach(data => {
                if (data.onattack) {
                    if (data.attackRestTime < 0) return;
                    nowStrokeColor = data.attackRestTime <= lastTime ?
                        'rgba(255, 56, 56, 0.8)'
                        : data.team === myTeam ?
                            'rgba(61, 139, 255, 0.8)'
                            : 'rgba(90, 90, 90, 0.8)';
                    nowFillColor =
                        data.attackRestTime <= lastTime ?
                            'rgba(255, 56, 56, 0.5)'
                            : data.team === myTeam ?
                                `rgba(61, 139, 255, ${0.5 - 0.3 * (data.attackRestTime / data.attackSumTime)})`
                                : `rgba(90, 90, 90, ${0.5 - 0.3 * (data.attackRestTime / data.attackSumTime)})`;
                    nowLineWidth = fix(0.5);
                }
                else if (data.id === playerIndex) {
                    data.attackTheta = Math.atan2(nowHeight / 2 - nowMouseX, nowMouseY - nowWidth / 2);
                    nowLineWidth = fix(0.5);
                    nowStrokeColor = 'rgba(79, 194, 230, 0.6)';
                    nowFillColor = 'rgba(79, 194, 230, 0.3)';
                }
                else return;
                tmpSet.add(data.id);
                if (svgAttackMap.has(data.id)) {
                    if (svgAttackMap.get(data.id).type !== data.attackType) {
                        svgAttackMap.get(data.id).data.remove();
                        svgAttackMap.delete(data.id);
                    }
                }
                switch (data.attackType) {
                    case 'furnace': {
                        if (!svgAttackMap.has(data.id)) {
                            let tmp1 = SVG.create('circle'),
                                tmp2 = SVG.create('path'),
                                tmp3 = SVG.create('g');
                            svgAttackMap.set(data.id, { data: tmp3, type: data.attackType });
                            g_attack.appendChild(tmp3);
                            tmp3.appendChild(tmp1);
                            tmp3.appendChild(tmp2);
                        }
                        let now = svgAttackMap.get(data.id).data;
                        let [circle, path] = now.children;
                        nowStrokeColor = data.attackRestTime <= lastTime ?
                            'rgba(255, 56, 56, 0.8)'
                            : data.team === myTeam ?
                                'rgba(61, 139, 255, 0.8)'
                                : 'rgba(90, 90, 90, 0.8)';
                        nowFillColor = 'rgba(0, 0, 0, 0)';
                        nowLineWidth = fix(0.5);
                        setStyle(circle);
                        circle.setAttribute('cx', `${fix(data.y - Y)}`);
                        circle.setAttribute('cy', `${fix(data.x - X)}`);
                        circle.setAttribute('r', `${fix(data.knifeRadius)}`);
                        nowFillColor =
                            data.attackRestTime <= lastTime ?
                                'rgba(255, 56, 56, 0.5)'
                                : data.team === myTeam ?
                                    `rgba(61, 139, 255, ${0.5 - 0.3 * (data.attackRestTime / data.attackSumTime)})`
                                    : `rgba(90, 90, 90, ${0.5 - 0.3 * (data.attackRestTime / data.attackSumTime)})`;
                        nowStrokeColor = 'rgba(0, 0, 0, 0)';
                        nowLineWidth = 0;
                        setStyle(path);
                        let str = '';
                        str += `M${fix(data.y - Y)} ${fix(data.x - X - playerRadius * 1.05)} `;
                        str += `A${fix(playerRadius * 1.05)},${fix(playerRadius * 1.05)} 0 1,1 ${fix(data.y - Y)},${fix(data.x - X + playerRadius * 1.05)}`;
                        str += `A${fix(playerRadius * 1.05)},${fix(playerRadius * 1.05)} 0 1,1 ${fix(data.y - Y)},${fix(data.x - X - playerRadius * 1.05)}`;
                        str += `L${fix(data.y - Y)} ${fix(data.x - X - data.knifeRadius)} `;
                        str += `A${fix(data.knifeRadius)},${fix(data.knifeRadius)} 0 1,0 ${fix(data.y - Y)},${fix(data.x - X + data.knifeRadius)}`;
                        str += `A${fix(data.knifeRadius)},${fix(data.knifeRadius)} 0 1,0 ${fix(data.y - Y)},${fix(data.x - X - data.knifeRadius)}`;
                        str += `L${fix(data.y - Y)} ${fix(data.x - X - playerRadius * 1.05)} `;
                        str += `Z`;
                        path.setAttribute('d', str);
                        return;
                    }
                    case 'initial': {
                        if (!svgAttackMap.has(data.id)) {
                            let tmp = SVG.create('path');
                            svgAttackMap.set(data.id, { data: tmp, type: data.attackType });
                            g_attack.appendChild(tmp);
                        }
                        let now = svgAttackMap.get(data.id).data;
                        nowLineWidth = fix(0.5);
                        setStyle(now);
                        let str = '';
                        str += `M${fix(data.y - Y + playerRadius * 1.05 * Math.cos(-data.attackTheta - data.theta))} ${fix(data.x - X + playerRadius * 1.05 * Math.sin(-data.attackTheta - data.theta))} `;
                        str += `A${fix(playerRadius * 1.05)},${fix(playerRadius * 1.05)} 0 ${data.theta >= Math.PI / 2 ? 1 : 0},1 ${fix(data.y - Y + playerRadius * 1.05 * Math.cos(-data.attackTheta + data.theta))},${fix(data.x - X + playerRadius * 1.05 * Math.sin(-data.attackTheta + data.theta))}`;
                        str += `L${fix(data.y - Y + data.knifeRadius * Math.cos(-data.attackTheta + data.theta))} ${fix(data.x - X + data.knifeRadius * Math.sin(-data.attackTheta + data.theta))} `;
                        str += `A${fix(data.knifeRadius)},${fix(data.knifeRadius)} 0 ${data.theta >= Math.PI / 2 ? 1 : 0},0 ${fix(data.y - Y + data.knifeRadius * Math.cos(-data.attackTheta - data.theta))},${fix(data.x - X + data.knifeRadius * Math.sin(-data.attackTheta - data.theta))}`;
                        str += `L${fix(data.y - Y + playerRadius * 1.05 * Math.cos(-data.attackTheta - data.theta))} ${fix(data.x - X + playerRadius * 1.05 * Math.sin(-data.attackTheta - data.theta))} `;
                        str += `Z`;
                        now.setAttribute('d', str);
                        if (data.attackRestTime <= lastTime) {
                            let tag = data.attackRestTime / lastTime;
                            let Theta = (data.attackTheta - data.theta) * tag + (data.attackTheta + data.theta) * (1 - tag);
                            let line = SVG.create('line');
                            nowLineWidth = fix(2);
                            nowFillColor = 'white';
                            nowStrokeColor = 'white';
                            if (data.blood) nowFillColor = nowStrokeColor = 'red';
                            setStyle(line);
                            line.setAttribute('x1', `${fix(data.y - Y + Math.cos(Theta) * playerRadius * 1.05)}`);
                            line.setAttribute('x2', `${fix(data.y - Y + Math.cos(Theta) * data.knifeRadius)}`);
                            line.setAttribute('y1', `${fix(data.x - X - Math.sin(Theta) * playerRadius * 1.05)}`);
                            line.setAttribute('y2', `${fix(data.x - X - Math.sin(Theta) * data.knifeRadius)}`);
                            g_knife.appendChild(line);
                        }
                        return;
                    }
                    case 'king1': {
                        if (!svgAttackMap.has(data.id)) {
                            let tmp1 = SVG.create('path'),
                                tmp2 = SVG.create('path'),
                                tmp3 = SVG.create('line'),
                                tmp4 = SVG.create('g');
                            tmp4.appendChild(tmp1);
                            tmp4.appendChild(tmp2);
                            tmp4.appendChild(tmp3);
                            svgAttackMap.set(data.id, { data: tmp4, type: data.attackType });
                            g_attack.appendChild(tmp4);
                        }
                        let tmpStroke = nowStrokeColor;
                        let [border, spj, split] = svgAttackMap.get(data.id).data.children;
                        let str = '';
                        str += `M${fix(data.y - Y + Math.cos(-Math.PI / 2 - data.attackTheta) * data.attackWidth / 2)} ${fix(data.x - X + Math.sin(-Math.PI / 2 - data.attackTheta) * data.attackWidth / 2)}`;
                        str += `L${fix(data.y - Y + Math.cos(-Math.PI / 2 - data.attackTheta) * playerRadius * 1.05)} ${fix(data.x - X + Math.sin(-Math.PI / 2 - data.attackTheta) * playerRadius * 1.05)}`;
                        str += `A${fix(playerRadius * 1.05)} ${fix(playerRadius * 1.05)} 0 0 1 ${fix(data.y - Y + Math.cos(Math.PI / 2 - data.attackTheta) * playerRadius * 1.05)} ${fix(data.x - X + Math.sin(Math.PI / 2 - data.attackTheta) * playerRadius * 1.05)}`;
                        str += `L${fix(data.y - Y + Math.cos(Math.PI / 2 - data.attackTheta) * data.attackWidth / 2)} ${fix(data.x - X + Math.sin(Math.PI / 2 - data.attackTheta) * data.attackWidth / 2)}`;
                        str += `L${fix(data.y - Y + Math.cos(Math.PI / 2 - data.attackTheta) * data.attackWidth / 2 + Math.cos(-data.attackTheta) * data.attackLength)} ${fix(data.x - X + Math.sin(Math.PI / 2 - data.attackTheta) * data.attackWidth / 2 + Math.sin(-data.attackTheta) * data.attackLength)}`;
                        str += `L${fix(data.y - Y + Math.cos(-Math.PI / 2 - data.attackTheta) * data.attackWidth / 2 + Math.cos(-data.attackTheta) * data.attackLength)} ${fix(data.x - X + Math.sin(-Math.PI / 2 - data.attackTheta) * data.attackWidth / 2 + Math.sin(-data.attackTheta) * data.attackLength)}`;
                        str += `L${fix(data.y - Y + Math.cos(-Math.PI / 2 - data.attackTheta) * data.attackWidth / 2)} ${fix(data.x - X + Math.sin(-Math.PI / 2 - data.attackTheta) * data.attackWidth / 2)}`;
                        str += 'Z';
                        setStyle(border);
                        border.setAttribute('d', str);
                        str = '';
                        str += `M${fix(data.y - Y + Math.cos(-Math.PI / 2 - data.attackTheta) * data.attackWidth / 2 + Math.cos(-data.attackTheta) * data.attackSPJ)} ${fix(data.x - X + Math.sin(-Math.PI / 2 - data.attackTheta) * data.attackWidth / 2 + Math.sin(-data.attackTheta) * data.attackSPJ)}`;
                        str += `L${fix(data.y - Y + Math.cos(Math.PI / 2 - data.attackTheta) * data.attackWidth / 2 + Math.cos(-data.attackTheta) * data.attackSPJ)} ${fix(data.x - X + Math.sin(Math.PI / 2 - data.attackTheta) * data.attackWidth / 2 + Math.sin(-data.attackTheta) * data.attackSPJ)}`;
                        str += `L${fix(data.y - Y + Math.cos(Math.PI / 2 - data.attackTheta) * data.attackWidth / 2 + Math.cos(-data.attackTheta) * data.attackLength)} ${fix(data.x - X + Math.sin(Math.PI / 2 - data.attackTheta) * data.attackWidth / 2 + Math.sin(-data.attackTheta) * data.attackLength)}`;
                        str += `L${fix(data.y - Y + Math.cos(-Math.PI / 2 - data.attackTheta) * data.attackWidth / 2 + Math.cos(-data.attackTheta) * data.attackLength)} ${fix(data.x - X + Math.sin(-Math.PI / 2 - data.attackTheta) * data.attackWidth / 2 + Math.sin(-data.attackTheta) * data.attackLength)}`;
                        str += `L${fix(data.y - Y + Math.cos(-Math.PI / 2 - data.attackTheta) * data.attackWidth / 2 + Math.cos(-data.attackTheta) * data.attackSPJ)} ${fix(data.x - X + Math.sin(-Math.PI / 2 - data.attackTheta) * data.attackWidth / 2 + Math.sin(-data.attackTheta) * data.attackSPJ)}`;
                        str += 'Z';
                        nowStrokeColor = 'rgba(0, 0, 0, 0)';
                        setStyle(spj);
                        spj.setAttribute('d', str);
                        nowStrokeColor = tmpStroke;
                        nowFillColor = 'rgba(0, 0, 0, 0)';
                        split.setAttribute('x1', `${fix(data.y - Y + Math.cos(-Math.PI / 2 - data.attackTheta) * data.attackWidth / 2 + Math.cos(-data.attackTheta) * data.attackSPJ)}`);
                        split.setAttribute('x2', `${fix(data.y - Y + Math.cos(Math.PI / 2 - data.attackTheta) * data.attackWidth / 2 + Math.cos(-data.attackTheta) * data.attackSPJ)}`);
                        split.setAttribute('y1', `${fix(data.x - X + Math.sin(-Math.PI / 2 - data.attackTheta) * data.attackWidth / 2 + Math.sin(-data.attackTheta) * data.attackSPJ)}`);
                        split.setAttribute('y2', `${fix(data.x - X + Math.sin(Math.PI / 2 - data.attackTheta) * data.attackWidth / 2 + Math.sin(-data.attackTheta) * data.attackSPJ)}`);
                        setStyle(split);
                        return;
                    }
                    case 'king2': {
                        if (!svgAttackMap.has(data.id)) {
                            let tmp1 = SVG.create('path'),
                                tmp2 = SVG.create('path'),
                                tmp3 = SVG.create('path'),
                                tmp4 = SVG.create('g');
                            tmp4.appendChild(tmp1);
                            tmp4.appendChild(tmp2);
                            tmp4.appendChild(tmp3);
                            svgAttackMap.set(data.id, { data: tmp4, type: data.attackType });
                            g_attack.appendChild(tmp4);
                        }
                        let tmpStroke = nowStrokeColor;
                        let [border, spj, split] = svgAttackMap.get(data.id).data.children;
                        setStyle(border);
                        let str = '';
                        str += `M${fix(data.y - Y + playerRadius * 1.05 * Math.cos(-data.attackTheta - data.theta))} ${fix(data.x - X + playerRadius * 1.05 * Math.sin(-data.attackTheta - data.theta))} `;
                        str += `A${fix(playerRadius * 1.05)},${fix(playerRadius * 1.05)} 0 ${data.theta >= Math.PI / 2 ? 1 : 0},1 ${fix(data.y - Y + playerRadius * 1.05 * Math.cos(-data.attackTheta + data.theta))},${fix(data.x - X + playerRadius * 1.05 * Math.sin(-data.attackTheta + data.theta))}`;
                        str += `L${fix(data.y - Y + data.knifeRadius * Math.cos(-data.attackTheta + data.theta))} ${fix(data.x - X + data.knifeRadius * Math.sin(-data.attackTheta + data.theta))} `;
                        str += `A${fix(data.knifeRadius)},${fix(data.knifeRadius)} 0 ${data.theta >= Math.PI / 2 ? 1 : 0},0 ${fix(data.y - Y + data.knifeRadius * Math.cos(-data.attackTheta - data.theta))},${fix(data.x - X + data.knifeRadius * Math.sin(-data.attackTheta - data.theta))}`;
                        str += `L${fix(data.y - Y + playerRadius * 1.05 * Math.cos(-data.attackTheta - data.theta))} ${fix(data.x - X + playerRadius * 1.05 * Math.sin(-data.attackTheta - data.theta))} `;
                        str += `Z`;
                        border.setAttribute('d', str);
                        nowStrokeColor = 'rgba(0, 0, 0, 0)';
                        setStyle(spj);
                        str = '';
                        str += `M${fix(data.y - Y + data.attackSPJ * Math.cos(-data.attackTheta - data.theta))} ${fix(data.x - X + data.attackSPJ * Math.sin(-data.attackTheta - data.theta))} `;
                        str += `A${fix(data.attackSPJ)},${fix(data.attackSPJ)} 0 ${data.theta >= Math.PI / 2 ? 1 : 0},1 ${fix(data.y - Y + data.attackSPJ * Math.cos(-data.attackTheta + data.theta))},${fix(data.x - X + data.attackSPJ * Math.sin(-data.attackTheta + data.theta))}`;
                        str += `L${fix(data.y - Y + data.knifeRadius * Math.cos(-data.attackTheta + data.theta))} ${fix(data.x - X + data.knifeRadius * Math.sin(-data.attackTheta + data.theta))} `;
                        str += `A${fix(data.knifeRadius)},${fix(data.knifeRadius)} 0 ${data.theta >= Math.PI / 2 ? 1 : 0},0 ${fix(data.y - Y + data.knifeRadius * Math.cos(-data.attackTheta - data.theta))},${fix(data.x - X + data.knifeRadius * Math.sin(-data.attackTheta - data.theta))}`;
                        str += `L${fix(data.y - Y + data.attackSPJ * Math.cos(-data.attackTheta - data.theta))} ${fix(data.x - X + data.attackSPJ * Math.sin(-data.attackTheta - data.theta))} `;
                        str += `Z`;
                        spj.setAttribute('d', str);
                        nowStrokeColor = tmpStroke;
                        nowFillColor = 'rgba(0, 0, 0, 0)';
                        str = '';
                        str += `M${fix(data.y - Y + data.attackSPJ * Math.cos(-data.attackTheta - data.theta))} ${fix(data.x - X + data.attackSPJ * Math.sin(-data.attackTheta - data.theta))} `;
                        str += `A${fix(data.attackSPJ)},${fix(data.attackSPJ)} 0 ${data.theta >= Math.PI / 2 ? 1 : 0},1 ${fix(data.y - Y + data.attackSPJ * Math.cos(-data.attackTheta + data.theta))},${fix(data.x - X + data.attackSPJ * Math.sin(-data.attackTheta + data.theta))}`;
                        setStyle(split);
                        split.setAttribute('d', str);
                        if (data.attackRestTime <= lastTime) {
                            let tag = data.attackRestTime / lastTime;
                            let Theta = (data.attackTheta - data.theta) * tag + (data.attackTheta + data.theta) * (1 - tag);
                            let line = SVG.create('line');
                            nowLineWidth = fix(2);
                            nowFillColor = 'white';
                            nowStrokeColor = 'white';
                            if (data.blood) nowFillColor = nowStrokeColor = 'red';
                            setStyle(line);
                            line.setAttribute('x1', `${fix(data.y - Y + Math.cos(Theta) * playerRadius * 1.05)}`);
                            line.setAttribute('x2', `${fix(data.y - Y + Math.cos(Theta) * data.knifeRadius)}`);
                            line.setAttribute('y1', `${fix(data.x - X - Math.sin(Theta) * playerRadius * 1.05)}`);
                            line.setAttribute('y2', `${fix(data.x - X - Math.sin(Theta) * data.knifeRadius)}`);
                            g_knife.appendChild(line);
                        }
                        return;
                    }
                    case 'king3': {
                        if (!svgAttackMap.has(data.id)) {
                            let tmp1 = SVG.create('path'),
                                tmp2 = SVG.create('circle'),
                                tmp3 = SVG.create('g');
                            tmp3.appendChild(tmp1);
                            tmp3.appendChild(tmp2);
                            svgAttackMap.set(data.id, { data: tmp3, type: data.attackType });
                            g_attack.appendChild(tmp3);
                        }
                        let [border, spj] = svgAttackMap.get(data.id).data.children;
                        let alpha = Math.acos(playerRadius / 2 / data.knifeRadius);
                        setStyle(border);
                        setStyle(spj);
                        spj.setAttribute('cx', `${fix(data.y - Y + Math.cos(-data.attackTheta) * data.knifeRadius)}`);
                        spj.setAttribute('cy', `${fix(data.x - X + Math.sin(-data.attackTheta) * data.knifeRadius)}`);
                        spj.setAttribute('r', `${fix(data.attackSPJ)}`);
                        let str = '';
                        str += `M${fix(data.y - Y + Math.cos(-data.attackTheta - alpha) * playerRadius)} ${fix(data.x - X + Math.sin(-data.attackTheta - alpha) * playerRadius)}`;
                        str += `A${fix(playerRadius)} ${fix(playerRadius)} 0 1 1 ${fix(data.y - Y + Math.cos(-data.attackTheta + alpha) * playerRadius)} ${fix(data.x - X + Math.sin(-data.attackTheta + alpha) * playerRadius)}`;
                        str += `A${fix(data.knifeRadius)} ${fix(data.knifeRadius)} 0 1 0 ${fix(data.y - Y + Math.cos(-data.attackTheta - alpha) * playerRadius)} ${fix(data.x - X + Math.sin(-data.attackTheta - alpha) * playerRadius)}`;
                        border.setAttribute('d', str);
                        return;
                    }
                }
            });
            deleteList = [];
            for (let i of svgAttackMap) {
                if (!tmpSet.has(i[0])) deleteList.push(i[0]);
            }
            for (let i of deleteList) svgAttackMap.get(i).data.remove(), svgAttackMap.delete(i);
            tmpSet.clear();
            players.forEach(data => {
                tmpSet.add(data.id);
                if (!svgHPMap.has(data.id)) {
                    svgHPMap.set(data.id, { inner: SVG.create('rect'), border: SVG.create('rect') });
                    g_HP.appendChild(svgHPMap.get(data.id).inner);
                    g_HP.appendChild(svgHPMap.get(data.id).border);
                }
                let now = svgHPMap.get(data.id);
                nowLineWidth = 0;
                nowFillColor =
                    data.team === myTeam
                        ? 'blue'
                        : type === GAME_TYPE.FFA
                            ? 'red'
                            : hashGetColor(data.team);
                nowStrokeColor = 'black';
                setStyle(now.inner);
                now.inner.setAttribute('x', `${fix(data.y - Y - HPwidth / 2)}`);
                now.inner.setAttribute('y', `${fix(data.x - X + HPdis + playerRadius)}`);
                now.inner.setAttribute('width', `${fix(Math.max(0, HPwidth * data.HP / data.maxHP))}`);
                now.inner.setAttribute('height', `${fix(HPheight)}`);
                nowLineWidth = fix(0.4);
                nowFillColor = 'rgba(0, 0, 0, 0)'
                setStyle(now.border);
                now.border.setAttribute('x', `${fix(data.y - Y - HPwidth / 2 - 0.2)}`);
                now.border.setAttribute('y', `${fix(data.x - X + HPdis + playerRadius - 0.2)}`);
                now.border.setAttribute('width', `${fix(HPwidth + 0.4)}`);
                now.border.setAttribute('height', `${fix(HPheight + 0.4)}`);
            });
            deleteList = [];
            for (let i of svgHPMap) {
                if (!tmpSet.has(i[0])) deleteList.push(i[0]);
            }
            for (let i of deleteList) svgHPMap.get(i).inner.remove(), svgHPMap.get(i).border.remove(), svgHPMap.delete(i);
            tmpSet.clear();
            players.forEach(data => {
                tmpSet.add(data.id);
                if (!svgTextMap.has(data.id)) {
                    let tmp1 = SVG.create('text'), tmp2 = SVG.create('text');
                    tmp1.innerHTML = `${HTML.parse(data.id)}`;
                    tmp1.setAttribute('font-size', `${fix(fontSize)}`);
                    tmp2.setAttribute('font-size', `${fix(fontSize)}`);
                    g_text.appendChild(tmp1);
                    g_text.appendChild(tmp2);
                    tmp1.setAttribute('text-anchor', `middle`);
                    tmp1.setAttribute('dominant-baseline', `middle`);
                    tmp2.setAttribute('text-anchor', `middle`);
                    tmp2.setAttribute('dominant-baseline', `middle`);
                    if (data.id === playerIndex) {
                        let tmp3 = SVG.create('text');
                        tmp3.setAttribute('font-size', `${fix(fontSize)}`);
                        tmp3.setAttribute('text-anchor', `middle`);
                        tmp3.setAttribute('dominant-baseline', `middle`);
                        svgTextMap.set(data.id, { name: tmp1, score: tmp2, cool: tmp3 });
                        g_text.appendChild(tmp3);
                    }
                    else svgTextMap.set(data.id, { name: tmp1, score: tmp2 });
                }
                let now = svgTextMap.get(data.id);
                nowFillColor = nowStrokeColor = 'black';
                nowLineWidth = 0;
                setStyle(now.name);
                setStyle(now.score);
                now.name.setAttribute('x', `${fix(data.y - Y)}`);
                now.score.setAttribute('x', `${fix(data.y - Y)}`);
                now.name.setAttribute('y', `${fix(data.x - X + HPdis + playerRadius + textDis + HPheight + fontSize / 2)}`);
                now.score.setAttribute('y', `${fix(data.x - X + HPdis + playerRadius + textDis + HPheight + 3 * fontSize / 2)}`);
                now.score.innerHTML = `${Math.floor(data.score)}分`;
                if (playerIndex === data.id) {
                    if (data.onattack) {
                        nowFillColor = nowStrokeColor = data.attackRestTime < 0 ? 'red' : 'black';
                        setStyle(now.cool);
                        now.cool.setAttribute('x', `${fix(data.y - Y)}`);
                        now.cool.setAttribute('y', `${fix(data.x - X - playerRadius - textDis - fontSize / 2)}`);
                        now.cool.innerHTML = `${(Math.ceil(Math.abs(data.attackRestTime * 10)) / 10).toFixed(1)}`;
                    }
                    else setStyle(now.cool), now.cool.innerHTML = '';
                }
            });
            deleteList = [];
            for (let i of svgTextMap) {
                if (!tmpSet.has(i[0])) deleteList.push(i[0]);
            }
            for (let i of deleteList) {
                svgTextMap.get(i).score.remove();
                svgTextMap.get(i).name.remove();
                if (i === playerIndex) svgTextMap.get(i).cool.remove();
                svgTextMap.delete(i);
            }
            standingBox.innerHTML = '';

            if (type === GAME_TYPE.FFA) {
                for (let i = 0; i < 10; i++) {
                    if (i < standing.length) {
                        standingBox.innerHTML += `${i + 1}.${HTML.parse(standing[i][0])} ${Math.floor(standing[i][1].score)}分<br/>`;
                    }
                    else break;
                }
                if (alive && tag) {
                    let ID = standing.findIndex(data => data[0] === playerIndex);
                    standingBox.innerHTML += `<hr/>${ID + 1}.${HTML.parse(playerIndex)} ${Math.floor(standing[ID][1].score)}分<br />`;
                    if (Date.now() < deadMsgToTime) standingBox.innerHTML += deadMsg;
                }
            }
            else {
                for (let i = 0; i < 10; i++) {
                    if (i < standing.length) {
                        standingBox.innerHTML +=
                            `${i + 1}.
                            <span style="color: ${HTML.parse(standing[i][0]) === myTeam ? 'blue' : hashGetColor(HTML.parse(standing[i][0]))};">${HTML.parse(standing[i][0])}</span>
                            ${Math.floor(standing[i][1])}分<br/>`;
                    }
                    else break;
                }
                if (alive && tag) {
                    let ID = standing.findIndex(data => data[0] === myTeam);
                    standingBox.innerHTML += `<hr/>${ID + 1}.<span style="color: blue;">${HTML.parse(myTeam)}</span> ${Math.floor(standing[ID][1])}分<br />`;
                    if (Date.now() < deadMsgToTime) standingBox.innerHTML += deadMsg;
                }
            }
            if (running) requestAnimationFrame(x);
        });
        function pos({ x, y }) {
            return { x: x / window.innerHeight * nowHeight, y: y / window.innerWidth * nowWidth };
        }
        frame.addEventListener('mousemove', ({ offsetX: y, offsetY: x }) => {
            ({ x, y } = pos({ x, y }));
            nowMouseX = Math.floor(x), nowMouseY = Math.floor(y);
        });
        frame.addEventListener('mousedown', (event) => {
            let { offsetX: y, offsetY: x } = event;
            event.preventDefault();
            ({ x, y } = pos({ x, y }));
            x = Math.floor(x), y = Math.floor(y);
            if (alive && FORTY.check(playerIndex)) {
                let tmp = Math.atan2(nowHeight / 2 - x, y - nowWidth / 2);
                send(['attack', tmp < 0 ? tmp + 2 * Math.PI : tmp]);
            }
        });
        var { keydownListener, keyupListener } = (() => {
            let w = 0, s = 0, a = 0, d = 0, now = -1;
            function updatedirect() {
                let newD = 0;
                if (w) newD |= W;
                if (s) newD |= S;
                if (a) newD |= A;
                if (d) newD |= D;
                if (newD != now && alive) send(['set_direction', moveList[newD]]), now = newD;
            }
            return {
                keydownListener: function (data) {
                    let key = data.key.toLowerCase();
                    if (key === 'arrowup') key = 'w';
                    if (key === 'arrowdown') key = 's';
                    if (key === 'arrowleft') key = 'a';
                    if (key === 'arrowright') key = 'd';
                    if (key === 'w') {
                        w = 1;
                        updatedirect();
                    }
                    else if (key === 's') {
                        s = 1;
                        updatedirect();
                    }
                    else if (key === 'a') {
                        a = 1;
                        updatedirect();
                    }
                    else if (key === 'd') {
                        d = 1;
                        updatedirect();
                    }
                    else if (key === ' ') {
                        event.preventDefault();
                        if (alive && FORTY.check(playerIndex)) {
                            let tmp = Math.atan2(nowHeight / 2 - nowMouseX, nowMouseY - nowWidth / 2);
                            send(['attack', tmp < 0 ? tmp + 2 * Math.PI : tmp]);
                        }
                    }
                    else if (key === 'q' || key === 'e') {
                        let tmp = Math.atan2(nowHeight / 2 - nowMouseX, nowMouseY - nowWidth / 2);
                        for (let i of nowSkills) {
                            if (i[0][i[0].length - 1] === key) {
                                if (skillBanChecks[i[0]] && myData && skillBanChecks[i[0]](myData)) continue;
                                console.log('qwq');
                                if (i[1].cooldown <= 0) send(['skill', { name: i[0], angle: tmp < 0 ? tmp + 2 * Math.PI : tmp }]);
                            }
                        }
                    }
                    else return;
                    data.preventDefault();
                },
                keyupListener: function (data) {
                    let key = data.key.toLowerCase();
                    if (key === 'arrowup') key = 'w';
                    if (key === 'arrowdown') key = 's';
                    if (key === 'arrowleft') key = 'a';
                    if (key === 'arrowright') key = 'd';
                    if (key === 'w') {
                        w = 0;
                        updatedirect();
                    }
                    else if (key === 's') {
                        s = 0;
                        updatedirect();
                    }
                    else if (key === 'a') {
                        a = 0;
                        updatedirect();
                    }
                    else if (key === 'd') {
                        d = 0;
                        updatedirect();
                    }
                    else return;
                    data.preventDefault();
                },
            };
        })();
        document.addEventListener('keydown', keydownListener);
        document.addEventListener('keyup', keyupListener);
        io.addEventListener('message', async function x(msg) {
            let data = JSON.parse(msg.data);
            if (data[0] === 'game_update') {
                nowSkills = data[1].skills;
                FORTY.update(data[1]);
                lastCalcTime = Date.now();
            }
            else if (data[0] === 'player_lose') {
                let { killerID, deadID } = data[1];
                if (deadID === playerIndex) {
                    document.body.className = '';
                    window.removeEventListener('resize', updateSize);
                    io.removeEventListener('message', x);
                    document.removeEventListener('keydown', keydownListener);
                    document.removeEventListener('keyup', keyupListener);
                    running = 0;
                    alive = 0;
                    send(['leave', null]);
                    resolve({ type: DIE, data: killerID });
                    return;
                    frame.style.display = 'grid';
                    frame.innerHTML = '';
                    let msg = HTML.create('h1', 'restart', '您已阵亡');
                    let btn = HTML.create('button', 'restart', '复活');
                    frame.appendChild(msg);
                    frame.appendChild(btn);
                    await new Promise(resolve => btn.addEventListener('click', resolve));
                    frame.style.display = 'none';
                    alive = 1;
                }
                else if (killerID === playerIndex) {
                    deadMsg = `<strong>你击杀了${HTML.parse(deadID)}!</strong>`;
                    deadMsgToTime = Date.now() + 2000;
                }
            }
        });
    });
}
async function endInterface(data) {
    if (data === CONTINUE_TAG) return null;
    else if (data.type === DIE) {
        HTML.clearBody();
        let frame = HTML.create('div', 'frame end-interface-die');
        frame.appendChild(HTML.create('h1', 'killer', `你被${HTML.parse(data.data)}击杀了`));
        let btn = HTML.create('button', 'restart-die', '确定');
        frame.appendChild(btn);
        document.body.appendChild(frame);
        await new Promise(resolve => btn.addEventListener('click', resolve));
    }
    else return;
}
function loadSettings() {
    if (localStorage.fortySettings === undefined) return;
    let data = JSON.parse(localStorage.fortySettings);
    for (let i in data) if (i in SETTINGS) SETTINGS[i] = data[i];
}
async function run() {
    let tag = 0;
    io.addEventListener('close', () => {
        if (tag === -1) return;
        alert(tag ? '连接断开' : '连接失败');
        boom();
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
    let tmp = null;
    while (1) {
        await endInterface(await gameInterface(await readyInterface(await joinInterface(await chooseInterface(tmp)))));
    }
}
loadSettings();
run();