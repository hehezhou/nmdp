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
 *     attack_state:{time: Number, angle: Number}|null;
 *     score: Number;
 * }
 * ['game_update', {map:{players: Map<ID, PlayerData>}}]
 * ['player_lose', {deadID, killerID}]
 */

/** send
 * ['attack', theta]
 * ['set_direction', -1 ~ 7];
 */
/**
 * 3  2  1
 * 4 -1  0
 * 5  6  7
 */
const io = new WebSocket(`ws://${location.hostname}:1926`);
const CONTINUE_TAG = Symbol('continue_tag'), JOIN_AUTO_FFA = Symbol('join_auto_ffa'), SET_SETTINGS = Symbol('set_settings'), DIE = Symbol('die');
const future = Symbol('future');
const W = 1, S = 2, A = 4, D = 8;
const moveList = [-1, 2, 6, -1, 4, 3, 5, 4, 0, 1, 7, 0, -1, 2, 6, -1];

const SETTINGS = {
    PLAYERRADIUS: 3,
    LITTLEMAPSIZE: 300,
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
        let ele = document.createElement(tag);
        if(className) ele.className = className;
        if(inner) ele.innerHTML = inner;
        return ele;
    },
    setPixelated: function (ele) {
        if(window.navigator.appVersion.indexOf('firefox') != -1) ele.style.imageRendering = 'crisp-edges';
        else ele.style.imageRendering = 'pixelated';
    }
};

async function settingInterface() {
    HTML.clearBody();
    let nameList = {
        'PLAYERRADIUS': {text: '人物大小: ', btnList: [{text: '小', value: 1.5}, {text: '中', value: 3}, {text: '大', value: 5}]},
        'LITTLEMAPSIZE': {text: '小地图大小: ', btnList: [{text: '小', value: 150}, {text: '中', value: 300}, {text: '大', value: 500}]},
    };
    function update() {
        for(let i in SETTINGS) {
            for(let j of nameList[i].btnList) {
                if(j.value === SETTINGS[i]) j.btn.className = 'settings-chosen';
                else j.btn.className = 'settings';
            }
        }
        localStorage.fortySettings = JSON.stringify(SETTINGS);
    }
    let frame = HTML.create('div', 'frame settting-interface');
    document.body.appendChild(frame);
    let cnt = 0;
    for(let i in SETTINGS) cnt++;
    frame.style.gridTemplateRows = `repeat(135px, ${cnt + 1})`;
    for(let i in SETTINGS) {
        let div = HTML.create('div', 'settings');
        div.appendChild(HTML.create('p', 'settings', nameList[i].text));
        for(let j of nameList[i].btnList) {
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
async function chooseInterface(tag) {
    const typeList = {
        '经典 FFA': { check: () => true, type: JOIN_AUTO_FFA, },
        '设置': {check:() => true, type: SET_SETTINGS},
    };
    HTML.clearBody();
    let frame = HTML.create('div', 'frame choose-interface');
    return await new Promise(resolve => {
        frame.appendChild(HTML.create(`h1`, 'welcome', 'Welcome to FORTY!!'));
        for (let i in typeList) {
            if (typeList[i].check()) {
                let btn = HTML.create('button', 'choose', i);
                btn.addEventListener('click', async () => {
                    if(typeList[i].type === SET_SETTINGS) {
                        await settingInterface();
                        resolve(await chooseInterface(tag));
                    }
                    else resolve(typeList[i].type);
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
            send(['join_auto', 'forty']);
            io.addEventListener('message', function x(msg) {
                let data = JSON.parse(msg.data);
                if (data[0] === 'join_success') localStorage.fortyLastRoomId = roomId = data[1], resolve(type);
                else if (data[0] === 'join_fail') alert('匹配失败, 原因: ' + data[1]), resolve(CONTINUE_TAG);
                else return;
                clearInterval(tmp);
                io.removeEventListener('message', x);
            });
        });
    }
    if (type === JOIN_AUTO_FFA) return await joinAutoFFA();
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
        io.addEventListener('message', function x(msg) {
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
        })
    });
}
const SVG = {
    create: function(tag) {
        return document.createElementNS('http://www.w3.org/2000/svg', tag);
    }
};
async function gameInterface(msg) {
    if (msg === CONTINUE_TAG) return CONTINUE_TAG;
    HTML.clearBody();
    let { data, type } = msg;
    let height = data.map_height, width = data.map_width;
    let nowWidth, nowHeight, alive = 1;
    let ratio = Math.min(height / SETTINGS.LITTLEMAPSIZE, width / SETTINGS.LITTLEMAPSIZE);
    let svg = SVG.create('svg'), frame = HTML.create('div', 'frame game-interface-ffa');
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svg.setAttribute('version', '1.1');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    let littleMap = HTML.create('canvas', 'little-map');
    littleMap.height = Math.ceil(height / ratio), littleMap.width = Math.ceil(width / ratio);
    HTML.setPixelated(littleMap);
    littleMap.style.height = `${SETTINGS.LITTLEMAPSIZE}px`;
    littleMap.style.width = `${SETTINGS.LITTLEMAPSIZE}px`;
    let deadMsg = '', deadMsgToTime = 0;
    let standingBox = HTML.create('div', 'standing');
    document.body.appendChild(svg);
    document.body.appendChild(littleMap);
    document.body.appendChild(frame);
    document.body.appendChild(standingBox);
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
    let FORTY = new GAME({ data });
    let playerIndex = data.id;
    let X = 0, Y = 0;
    const playerRadius = SETTINGS.PLAYERRADIUS, knifeRadius = 40, theta = Math.PI / 6, lastTime = 0.1, HPheight = 4, HPwidth = 20, fontSize = 6, HPdis = 3, attactTime = 1, nameDis = 3;
    const lineDis = 100, lineWidth = 4;
    let svgCircleMap = new Map(), svgAttackMap = new Map(), svgNameMap = new Map(), svgHPMap = new Map();
    let g = SVG.create('g');
    svg.appendChild(g);
    return await new Promise(resolve => {
        let running = 1;
        let nowMouseX = 0, nowMouseY = 0;
        requestAnimationFrame(async function x() {
            g.innerHTML = '';
            let nowFillColor = 'rgb(0, 0, 0)', nowStrokeColor = 'rgb(0, 0, 0)', nowLineWidth = 1;
            let tag = 0;
            let littlecxt = littleMap.getContext('2d');
            littlecxt.clearRect(0, 0, width, height);
            littlecxt.fillStyle = 'rgba(128, 128, 128, 0.5)';
            littlecxt.fillRect(0, 0, littleMap.width, littleMap.height);
            let { players, standing } = FORTY.getNowMap();
            players.forEach(data => {
                if (data.id === playerIndex) X = data.x - nowHeight / 2, Y = data.y - nowWidth / 2, tag = 1;
                littlecxt.fillStyle = data.id === playerIndex ? 'red' : 'black';
                littlecxt.fillRect(Math.floor((data.y) / ratio) - 2.5, Math.floor((width + data.x)) / ratio - 2.5, 5, 5);
            });
            function setStyle(ele) {
                ele.setAttribute('fill', `${nowFillColor}`);
                ele.setAttribute('stroke-width', `${nowLineWidth}`); 
                ele.setAttribute('stroke', `${nowStrokeColor}`);
            }
            function fix(x) {
                return x / nowWidth * window.innerWidth;
            }
            nowFillColor = nowStrokeColor = 'rgb(128, 128, 128)';
            nowLineWidth = 0;
            for(let i = Math.floor(X / lineDis) * lineDis - X; i < nowHeight; i += lineDis) {
                if(i + X > 0 || i + X < -width) continue;
                if(i + lineWidth / 2 <= 0 || i - lineWidth / 2 >= nowHeight) continue;
                let rect = SVG.create('rect');
                setStyle(rect);
                rect.setAttribute('x', `${fix(0 - Y - lineWidth / 2)}`);
                rect.setAttribute('y', `${fix(i - lineWidth / 2)}`);
                rect.setAttribute('width', `${fix(width + lineWidth)}`);
                rect.setAttribute('height', `${fix(lineWidth)}`);
                g.appendChild(rect);
            }
            for(let i = Math.floor(Y / lineDis) * lineDis - Y; i < nowWidth; i += lineDis) {
                if(i + Y < 0 || i + Y > height) continue;
                if(i + lineWidth / 2 <= 0 || i - lineWidth / 2 >= nowWidth) continue;
                let rect = SVG.create('rect');
                setStyle(rect);
                rect.setAttribute('x', `${fix(i - lineWidth / 2)}`);
                rect.setAttribute('y', `${fix(-height - X - lineWidth / 2)}`);
                rect.setAttribute('width', `${fix(lineWidth)}`);
                rect.setAttribute('height', `${fix(height + lineWidth)}`);
                g.appendChild(rect);
            }
            nowStrokeColor = 'black';
            nowLineWidth = fix(0.5);
            let tmpSet = new Set();
            players.forEach(data => {
                tmpSet.add(data.id);
                nowFillColor = data.color;
                if(!svgCircleMap.has(data.id)) svgCircleMap.set(data.id, SVG.create('circle')), svg.appendChild(svgCircleMap.get(data.id));
                let circle = svgCircleMap.get(data.id);
                setStyle(circle);
                circle.setAttribute('cx', `${Math.floor(fix(data.y - Y))}`);
                circle.setAttribute('cy', `${Math.floor(fix(data.x - X))}`);
                circle.setAttribute('r', `${Math.floor(fix(playerRadius))}`);
            });
            let deleteList;
            deleteList = [];
            for(let i of svgCircleMap) {
                if(!tmpSet.has(i[0])) deleteList.push(i[0]);
            }
            for(let i of deleteList) svgCircleMap.get(i).remove(), svgCircleMap.delete(i);
            tmpSet.clear();
            players.forEach(data => {
                if (data.onattack) {
                    tmpSet.add(data.id);
                    if(!svgAttackMap.has(data.id)) svgAttackMap.set(data.id, SVG.create('path')), svg.appendChild(svgAttackMap.get(data.id));
                    let now = svgAttackMap.get(data.id);
                    nowStrokeColor = data.attackRestTime <= lastTime ? 
                        'rgba(255, 56, 56, 0.8)' 
                        : data.id === playerIndex ? 
                            'rgba(61, 139, 255, 0.8)' 
                            : 'rgba(90, 90, 90, 0.8)';
                    nowFillColor =
                        data.attackRestTime <= lastTime ?
                            'rgba(255, 56, 56, 0.5)'
                            : data.id === playerIndex ?
                                `rgba(61, 139, 255, ${0.5 - 0.3 * (data.attackRestTime / attactTime)})`
                                : `rgba(90, 90, 90, ${0.5 - 0.3 * (data.attackRestTime / attactTime)})`;
                    nowLineWidth = fix(0.5);
                    setStyle(now);
                    let str = '';
                    str += `M${fix(data.y - Y + playerRadius * Math.cos(-data.attackTheta - theta))} ${fix(data.x - X + playerRadius * Math.sin(-data.attackTheta - theta))} `;
                    str += `A${fix(playerRadius)},${fix(playerRadius)} 0 ${theta >= Math.PI / 2 ? 1 : 0},1 ${fix(data.y - Y + playerRadius * Math.cos(-data.attackTheta + theta))},${fix(data.x - X + playerRadius * Math.sin(-data.attackTheta + theta))}`;
                    str += `L${fix(data.y - Y + knifeRadius * Math.cos(-data.attackTheta + theta))} ${fix(data.x - X + knifeRadius * Math.sin(-data.attackTheta + theta))} `;
                    str += `A${fix(knifeRadius)},${fix(knifeRadius)} 0 ${theta >= Math.PI / 2 ? 1 : 0},0 ${fix(data.y - Y + knifeRadius * Math.cos(-data.attackTheta - theta))},${fix(data.x - X + knifeRadius * Math.sin(-data.attackTheta - theta))}`;
                    str += `L${fix(data.y - Y + playerRadius * Math.cos(-data.attackTheta - theta))} ${fix(data.x - X + playerRadius * Math.sin(-data.attackTheta - theta))} `;
                    str += `Z`;
                    now.setAttribute('d', str);
                    if (data.attackRestTime <= lastTime) {
                        let tag = data.attackRestTime / lastTime;
                        let Theta = (data.attackTheta - theta) * tag + (data.attackTheta + theta) * (1 - tag);
                        let line = SVG.create('line');
                        nowLineWidth = fix(2);
                        nowFillColor = 'white';
                        nowStrokeColor = 'white';
                        setStyle(line);
                        line.setAttribute('x1', `${fix(data.y - Y + Math.cos(Theta) * playerRadius)}`);
                        line.setAttribute('x2', `${fix(data.y - Y + Math.cos(Theta) * knifeRadius)}`);
                        line.setAttribute('y1', `${fix(data.x - X - Math.sin(Theta) * playerRadius)}`);
                        line.setAttribute('y2', `${fix(data.x - X - Math.sin(Theta) * knifeRadius)}`);
                        g.appendChild(line);
                    }
                }
                else if (data.id === playerIndex) {
                    tmpSet.add(data.id);
                    if(!svgAttackMap.has(data.id)) svgAttackMap.set(data.id, SVG.create('path')), svg.appendChild(svgAttackMap.get(data.id));
                    let now = svgAttackMap.get(data.id);
                    nowLineWidth = fix(0.5);
                    nowStrokeColor = 'rgba(79, 194, 230, 0.6)';
                    nowFillColor = 'rgba(79, 194, 230, 0.3)';
                    setStyle(now);
                    let nowTheta = -Math.atan2(nowMouseX - nowHeight / 2, nowMouseY - nowWidth / 2);
                    let str = '';
                    str += `M${fix(data.y - Y + playerRadius * Math.cos(-nowTheta - theta))} ${fix(data.x - X + playerRadius * Math.sin(-nowTheta - theta))} `;
                    str += `A${fix(playerRadius)},${fix(playerRadius)} 0 ${theta >= Math.PI / 2 ? 1 : 0},1 ${fix(data.y - Y + playerRadius * Math.cos(-nowTheta + theta))},${fix(data.x - X + playerRadius * Math.sin(-nowTheta + theta))}`;
                    str += `L${fix(data.y - Y + knifeRadius * Math.cos(-nowTheta + theta))} ${fix(data.x - X + knifeRadius * Math.sin(-nowTheta + theta))} `;
                    str += `A${fix(knifeRadius)},${fix(knifeRadius)} 0 ${theta >= Math.PI / 2 ? 1 : 0},0 ${fix(data.y - Y + knifeRadius * Math.cos(-nowTheta - theta))},${fix(data.x - X + knifeRadius * Math.sin(-nowTheta - theta))}`;
                    str += `L${fix(data.y - Y + playerRadius * Math.cos(-nowTheta - theta))} ${fix(data.x - X + playerRadius * Math.sin(-nowTheta - theta))} `;
                    str += `Z`;
                    now.setAttribute('d', str);
                }
                else return;
            });
            deleteList = [];
            for(let i of svgAttackMap) {
                if(!tmpSet.has(i[0])) deleteList.push(i[0]);
            }
            for(let i of deleteList) svgAttackMap.get(i).remove(), svgAttackMap.delete(i);
            tmpSet.clear();
            players.forEach(data => {
                tmpSet.add(data.id);
                if(!svgHPMap.has(data.id)) {
                    svgHPMap.set(data.id, {inner: SVG.create('rect'), border: SVG.create('rect')});
                    svg.appendChild(svgHPMap.get(data.id).border);
                    svg.appendChild(svgHPMap.get(data.id).inner);
                }
                let now = svgHPMap.get(data.id);
                nowLineWidth = 0;
                nowFillColor = 'red';
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
            for(let i of svgHPMap) {
                if(!tmpSet.has(i[0])) deleteList.push(i[0]);
            }
            for(let i of deleteList) svgHPMap.get(i).inner.remove(), svgHPMap.get(i).border.remove(), svgHPMap.delete(i);
            tmpSet.clear();
            players.forEach(data => {
                tmpSet.add(data.id);
                if(!svgNameMap.has(data.id)) svgNameMap.set(data.id, SVG.create('text')), svg.appendChild(svgNameMap.get(data.id));
                let now = svgNameMap.get(data.id);
                nowFillColor = 'black';
                now.setAttribute('font-size', `${fix(fontSize)}`);
                now.setAttribute('text-anchor', `middle`);
                now.setAttribute('dominant-baseline', `middle`);
                now.setAttribute('x', `${fix(data.y - Y)}`);
                now.setAttribute('y', `${fix(data.x - X + HPdis + playerRadius + nameDis + HPheight + fontSize / 2)}`);
                now.innerHTML = data.id;
            });
            deleteList = [];
            for(let i of svgNameMap) {
                if(!tmpSet.has(i[0])) deleteList.push(i[0]);
            }
            for(let i of deleteList) svgNameMap.get(i).remove(), svgNameMap.delete(i);
            standingBox.innerHTML = '';
            for (let i = 0; i < 10; i++) {
                if (i < standing.length) {
                    standingBox.innerHTML += `${i + 1}.${standing[i]} ${Math.floor(players[players.findIndex(data => data.id === standing[i])].score)}分<br/>`;
                }
                else break;
            }
            if (alive && tag) {
                standingBox.innerHTML += `<hr/>${standing.findIndex(data => data === playerIndex) + 1}.${playerIndex} ${Math.floor(players[players.findIndex(data => data.id === playerIndex)].score)}分<br />`;
                if(Date.now() < deadMsgToTime) standingBox.innerHTML += deadMsg;
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
        frame.addEventListener('click', ({ offsetX: y, offsetY: x }) => {
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
                    if(key === 'arrowup') key = 'w';
                    if(key === 'arrowdown') key = 's';
                    if(key === 'arrowleft') key = 'a';
                    if(key === 'arrowright') key = 'd';
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
                    else return;
                    data.preventDefault();
                },
                keyupListener: function (data) {
                    let key = data.key.toLowerCase();
                    if(key === 'arrowup') key = 'w';
                    if(key === 'arrowdown') key = 's';
                    if(key === 'arrowleft') key = 'a';
                    if(key === 'arrowright') key = 'd';
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
            if (data[0] === 'force_quit') {
                alert('您已被移出房间，原因: ' + data[1]);
                document.body.className = '';
                window.removeEventListener('resize', updateSize);
                io.removeEventListener('message', x);
                frame.removeEventListener('keydown', keydownListener);
                frame.removeEventListener('keyup', keyupListener);
                running = 0;
                resolve(CONTINUE_TAG);
            }
            else if (data[0] === 'game_update') {
                FORTY.update(data[1]);
            }
            else if (data[0] === 'player_lose') {
                let { killerID, deadID } = data[1];
                if (deadID === playerIndex) {
                    document.body.className = '';
                    window.removeEventListener('resize', updateSize);
                    io.removeEventListener('message', x);
                    frame.removeEventListener('keydown', keydownListener);
                    frame.removeEventListener('keyup', keyupListener);
                    running = 0;
                    alive = 0;
                    send(['leave', null]);
                    resolve({type: DIE, data: killerID});
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
                else if(killerID === playerIndex) {
                    deadMsg = `<strong>你击杀了${deadID}!</strong>`;
                    deadMsgToTime = Date.now() + 2000;
                }
            }
        });
    });
}
async function endInterface(data) {
    if (data === CONTINUE_TAG) return null;
    else if(data.type === DIE) {
        HTML.clearBody();
        let frame = HTML.create('div', 'frame end-interface-die');
        frame.appendChild(HTML.create('h1', 'killer', `你被${data.data}击杀了`));
        let btn = HTML.create('button', 'restart-die', '确定');
        frame.appendChild(btn);
        document.body.appendChild(frame);
        await new Promise(resolve => btn.addEventListener('click', resolve));
    }
    else return;
}
function loadSettings() {
    if(localStorage.fortySettings === undefined) return;
    let data = JSON.parse(localStorage.fortySettings);
    for(let i in data) if(i in SETTINGS) SETTINGS[i] = data[i];
}
async function run() {
    let tag = 0;
    io.addEventListener('close', () => {
        alert(tag ? '连接断开' : '连接失败');
    });
    await new Promise(resolve => io.addEventListener('open', resolve));
    tag = 1;
    let tmp = null;
    while (1) {
        await endInterface(await gameInterface(await readyInterface(await joinInterface(await chooseInterface(tmp)))));
    }
}
loadSettings();
run();