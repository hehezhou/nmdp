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
    RATIO: 5,
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
        ele.className = className;
        ele.innerHTML = inner;
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
        'RATIO': {text: '画质: ', btnList: [{text: '流畅', value: 1}, {text: '低', value: 2.5}, {text: '中', value: 5}, {text: '高', value: 10}]},
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
async function gameInterface(msg) {
    if (msg === CONTINUE_TAG) return CONTINUE_TAG;
    HTML.clearBody();
    let { data, type } = msg;
    let height = data.map_height, width = data.map_width;
    let nowWidth, nowHeight, alive = 1;
    let ratio = Math.min(height / SETTINGS.LITTLEMAPSIZE, width / SETTINGS.LITTLEMAPSIZE);
    let canvas = HTML.create('canvas', 'map'), frame = HTML.create('div', 'frame game-interface-ffa');
    let littleMap = HTML.create('canvas', 'little-map');
    littleMap.height = Math.ceil(height / ratio), littleMap.width = Math.ceil(width / ratio);
    HTML.setPixelated(littleMap);
    littleMap.style.height = `${SETTINGS.LITTLEMAPSIZE}px`;
    littleMap.style.width = `${SETTINGS.LITTLEMAPSIZE}px`;
    frame.style.display = 'none';
    let deadMsg = '', deadMsgToTime = 0;
    let standingBox = HTML.create('div', 'standing');
    let cxt = canvas.getContext('2d');
    document.body.appendChild(canvas);
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
        canvas.width = nowWidth * SETTINGS.RATIO;
        canvas.height = nowHeight * SETTINGS.RATIO;
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    let FORTY = new GAME({ data });
    let playerIndex = data.id;
    let X = 0, Y = 0;
    const playerRadius = SETTINGS.PLAYERRADIUS, knifeRadius = 40, theta = Math.PI / 6, lastTime = 0.1, HPheight = 4, HPwidth = 20, fontSize = 6, HPdis = 3, attactTime = 1, nameDis = 3;
    const lineDis = 100, lineWidth = 4;
    return await new Promise(resolve => {
        let running = 1;
        let nowMouseX = 0, nowMouseY = 0;
        requestAnimationFrame(function x() {
            let tag = 0;
            let littlecxt = littleMap.getContext('2d');
            cxt.clearRect(0 * SETTINGS.RATIO, 0 * SETTINGS.RATIO, nowWidth * SETTINGS.RATIO, nowHeight * SETTINGS.RATIO);
            littlecxt.clearRect(0, 0, width, height);
            littlecxt.fillStyle = 'rgba(128, 128, 128, 0.5)';
            littlecxt.fillRect(0, 0, littleMap.width, littleMap.height);
            let { players, standing } = FORTY.getNowMap();
            players.forEach(data => {
                if (data.id === playerIndex) X = data.x - nowHeight / 2, Y = data.y - nowWidth / 2, tag = 1;
                littlecxt.fillStyle = data.id === playerIndex ? 'red' : 'black';
                littlecxt.fillRect(Math.floor((data.y) / ratio) - 2.5, Math.floor((width + data.x)) / ratio - 2.5, 5, 5);
            });
            cxt.fillStyle = 'rgb(128, 128, 128)';
            for(let i = Math.floor(X / lineDis) * lineDis - X; i < nowHeight; i += lineDis) {
                if(i + X > 0 || i + X < -width) continue;
                if(i + lineWidth / 2 <= 0 || i - lineWidth / 2 >= nowHeight) continue;
                cxt.fillRect((0 - Y - lineWidth / 2) * SETTINGS.RATIO, (i - lineWidth / 2) * SETTINGS.RATIO, (width + lineWidth) * SETTINGS.RATIO, lineWidth * SETTINGS.RATIO);
            }
            for(let i = Math.floor(Y / lineDis) * lineDis - Y; i < nowWidth; i += lineDis) {
                if(i + Y < 0 || i + Y > height) continue;
                if(i + lineWidth / 2 <= 0 || i - lineWidth / 2 >= nowWidth) continue;
                cxt.fillRect((i - lineWidth / 2) * SETTINGS.RATIO, (-height - X - lineWidth / 2) * SETTINGS.RATIO, lineWidth * SETTINGS.RATIO, (height + lineWidth) * SETTINGS.RATIO);
            }
            players.forEach(data => {
                cxt.strokeStyle = 'black';
                cxt.lineWidth = 0.5 * SETTINGS.RATIO;
                cxt.fillStyle = data.color;
                cxt.beginPath();
                cxt.arc((data.y - Y) * SETTINGS.RATIO, (data.x - X) * SETTINGS.RATIO, playerRadius * SETTINGS.RATIO, 0, 2 * Math.PI);
                cxt.closePath();
                cxt.fill();
                cxt.stroke();
            });
            players.forEach(data => {
                if (data.onattack) {
                    cxt.strokeStyle = data.attackRestTime <= lastTime ? 
                        'rgba(255, 56, 56, 0.8)' 
                        : data.id === playerIndex ? 
                            'rgba(61, 139, 255, 0.8)' 
                            : 'rgba(90, 90, 90, 0.8)';
                    cxt.fillStyle =
                        data.attackRestTime <= lastTime ?
                            'rgba(255, 56, 56, 0.5)'
                            : data.id === playerIndex ?
                                `rgba(61, 139, 255, ${0.5 - 0.3 * (data.attackRestTime / attactTime)})`
                                : `rgba(90, 90, 90, ${0.5 - 0.3 * (data.attackRestTime / attactTime)})`;
                    cxt.lineWidth = 0.5 * SETTINGS.RATIO;
                    cxt.beginPath();
                    cxt.arc((data.y - Y) * SETTINGS.RATIO, (data.x - X) * SETTINGS.RATIO, playerRadius * SETTINGS.RATIO, -data.attackTheta - theta, -data.attackTheta + theta, false);
                    cxt.arc((data.y - Y) * SETTINGS.RATIO, (data.x - X) * SETTINGS.RATIO, knifeRadius * SETTINGS.RATIO, -data.attackTheta + theta, -data.attackTheta - theta, true);
                    cxt.closePath();
                    cxt.fill();
                    cxt.stroke();
                    if (data.attackRestTime <= lastTime) {
                        let tag = data.attackRestTime / lastTime;
                        let Theta = (data.attackTheta - theta) * tag + (data.attackTheta + theta) * (1 - tag);
                        cxt.strokeStyle = 'white';
                        cxt.lineWidth = 2 * SETTINGS.RATIO;
                        cxt.beginPath();
                        cxt.moveTo((data.y - Y + Math.cos(Theta) * playerRadius) * SETTINGS.RATIO, (data.x - X - Math.sin(Theta) * playerRadius) * SETTINGS.RATIO);
                        cxt.lineTo((data.y - Y + Math.cos(Theta) * knifeRadius) * SETTINGS.RATIO, (data.x - X - Math.sin(Theta) * knifeRadius) * SETTINGS.RATIO);
                        cxt.closePath();
                        cxt.stroke();
                    }
                }
                else if (data.id === playerIndex) {
                    cxt.lineWidth = 0.5 * SETTINGS.RATIO;
                    cxt.strokeStyle = 'rgba(79, 194, 230, 0.6)';
                    cxt.fillStyle = 'rgba(79, 194, 230, 0.3)';
                    let nowTheta = -Math.atan2(nowHeight / 2 - nowMouseX, nowMouseY - nowWidth / 2);
                    cxt.beginPath();
                    cxt.arc((data.y - Y) * SETTINGS.RATIO, (data.x - X) * SETTINGS.RATIO, playerRadius * SETTINGS.RATIO, nowTheta - theta, nowTheta + theta, false);
                    cxt.arc((data.y - Y) * SETTINGS.RATIO, (data.x - X) * SETTINGS.RATIO, knifeRadius * SETTINGS.RATIO, nowTheta + theta, nowTheta - theta, true);
                    cxt.closePath();
                    cxt.fill();
                    cxt.stroke();
                }
                else return;
            });
            cxt.lineWidth = 0.4 * SETTINGS.RATIO;
            players.forEach(data => {
                cxt.fillStyle = 'red';
                cxt.strokeStyle = 'black';
                cxt.fillRect((data.y - Y - HPwidth / 2) * SETTINGS.RATIO, (data.x - X + HPdis + playerRadius) * SETTINGS.RATIO, Math.max(0, HPwidth * data.HP / data.maxHP * SETTINGS.RATIO), HPheight * SETTINGS.RATIO);
                cxt.strokeRect((data.y - Y - HPwidth / 2) * SETTINGS.RATIO, (data.x - X + HPdis + playerRadius) * SETTINGS.RATIO, HPwidth * SETTINGS.RATIO, HPheight * SETTINGS.RATIO);
                cxt.fillStyle = 'black';
                cxt.font = `${fontSize * SETTINGS.RATIO}px 微软雅黑`;
                cxt.font
                cxt.textAlign = 'center';
                cxt.textBaseline = 'top';
                cxt.fillText(data.id, (data.y - Y) * SETTINGS.RATIO, (data.x - X + HPdis + playerRadius + nameDis + HPheight) * SETTINGS.RATIO);
            });
            standingBox.innerHTML = '';
            for (let i = 0; i < 10; i++) {
                if (i < standing.length) {
                    standingBox.innerHTML += `${i + 1}.${standing[i]} ${Math.floor(players[players.findIndex(data => data.id === standing[i])].score)}分<br/>`;
                }
                else break;
            }
            if (alive && tag) {
                standingBox.innerHTML += `<hr/>${players.findIndex(data => data.id === playerIndex) + 1}.${playerIndex} ${Math.floor(players[players.findIndex(data => data.id === playerIndex)].score)}分<br />`;
                if(Date.now() < deadMsgToTime) standingBox.innerHTML += deadMsg;
            }
            if (running) requestAnimationFrame(x);
        });
        function pos({ x, y }) {
            return { x: x / canvas.offsetHeight * canvas.height / SETTINGS.RATIO, y: y / canvas.offsetWidth * canvas.width / SETTINGS.RATIO };
        }
        canvas.addEventListener('mousemove', ({ offsetX: y, offsetY: x }) => {
            ({ x, y } = pos({ x, y }));
            nowMouseX = Math.floor(x), nowMouseY = Math.floor(y);
        });
        canvas.addEventListener('click', ({ offsetX: y, offsetY: x }) => {
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
                canvas.removeEventListener('keydown', keydownListener);
                canvas.removeEventListener('keyup', keyupListener);
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
                    canvas.removeEventListener('keydown', keydownListener);
                    canvas.removeEventListener('keyup', keyupListener);
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