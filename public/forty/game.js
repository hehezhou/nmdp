"use strict";
/** receive
 * ['game_start', {map_height, map_width, id}]
 * PlayerData: {
 *     pos: Vector;
 *     speed: Vector;
 *     targetSpeed: Vector;
 *     timeBeforeAttacking: Vector;
 * }
 * ['game_update', {map:{players: Map<ID, PlayerData>}}]
 * ['player_lose', {playerID, killerID}]
 */

/** send
 * ['attack', theta]
 * ['move', -1 ~ 7];
 */
/**
 * 3  2  1
 * 4 -1  0
 * 5  6  7
 */
const io = new WebSocket(`ws://${location.hostname}:1926`);
const CONTINUE_TAG = Symbol('continue_tag'), JOIN_AUTO_FFA = Symbol('join_auto_ffa'), GAME_CONTINUE = Symbol('game_continue');

const W = 1, S = 2, A = 4, D = 8;
const moveList = [-1, 2, 6, -1, 4, 3, 5, 4, 0, 1, 7, 0, -1, 2, 6, -1];

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
};

async function chooseInterface(tag) {
    const typeList = {
        '重新连接': { check: () => Boolean(localStorage.fortyLastRoomId), type: GAME_CONTINUE, },
        '经典 FFA': { check: () => true, type: JOIN_AUTO_FFA, },
    };
    HTML.clearBody();
    let frame = HTML.create('div', 'frame choose-interface');
    return await new Promise(resolve => {
        frame.appendChild(HTML.create(`h1`, 'welcome', 'Welcome to FORTY!!'));
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
    async function gameContinue() {
        let p = HTML.create('p', 'join');
        frame.appendChild(p);
        document.body.appendChild(frame);
        return await new Promise(resolve => {
            let tmp = addWait(p, '正在重新连接');
            send(['join', localStorage.fortyLastRoomId]);
            localStorage.removeItem('fortyLastRoomId');
            io.addEventListener('message', function x(msg) {
                let data = JSON.parse(msg.data);
                if (data[0] === 'join_success') localStorage.fortyLastRoomId = roomId = data[1], resolve(type);
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
    let nowWidth, nowHeight, alive = 1;
    let canvas = HTML.create('canvas'), frame = HTML.create('div', 'frame game-interface-ffa');
    frame.style.display = 'none';
    let standingBox = HTML.create('div', 'standing');
    let cxt = canvas.getContext('2d');
    document.body.appendChild(canvas);
    document.body.appendChild(frame);
    document.body.appendChild(ranking);
    document.body.className = 'game';
    function updateSize() {
        nowWidth = window.innerWidth;
        nowHeight = window.innerHeight;
        let d = (nowWidth * nowHeight + 0.01) / (1920 * 969) * 2;
        d = d ** 0.5;
        nowWidth = Math.ceil(nowWidth / d);
        nowHeight = Math.ceil(nowHeight / d);
        canvas.width = nowWidth;
        canvas.height = nowHeight;
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    let FORTY = new GAME({ data });
    let playerIndex = data.id;
    let X = 0, Y = 0, killTag;
    const playerRadius = 5, knifeRadius = 40, theta = Math.PI / 6, lastTime = 0.1, HPheight = 4, HPwidth = 12, HPdis = 3, attactTime = 1;
    await new Promise(resolve => {
        let running = 1;
        let nowMouseX = 0, nowMouseY = 0;
        requestAnimationFrame(function x() {
            cxt.clearRect(0, 0, nowWidth, nowHeight);
            let { players, standing } = FORTY.getNowMap();
            players.forEach(data => {
                if (data.id === playerIndex) X = data.x - nowHeight / 2, Y = data.y - nowWidth / 2;
            });
            players.forEach(data => {
                cxt.strokeStyle = 'black';
                cxt.lineWidth = 1;
                cxt.fillStyle = data.color;
                if(data.id === playerIndex && killTag) {
                    killTag--;
                    cxt.lineWidth = 2;
                    cxt.strokeStyle = 'white';
                }
                cxt.beginPath();
                cxt.arc(data.y - Y, data.x - X, playerRadius, 0, 2 * Math.PI);
                cxt.closePath();
                cxt.fill();
                cxt.stroke();
            });
            players.forEach(data => {
                if (data.onattack) {
                    cxt.strokeStyle = data.attackRestTime <= lastTime ? 'rgba(255, 56, 56, 0.8)' : data.id === playerIndex ? 'rgba(61, 139, 255, 0.8)' : 'rgba(90, 90, 90, 0.8)';
                    cxt.fillStyle =
                        data.attackRestTime <= lastTime ?
                            'rgba(255, 56, 56, 0.5)'
                            : data.id === playerIndex ?
                                `rgba(61, 139, 255, ${0.5 - 0.3 * (data.attackRestTime / attactTime)})`
                                : `rgba(90, 90, 90, ${0.5 - 0.3 * (data.attackRestTime / attactTime)})`;
                    cxt.lineWidth = 1;
                    if (data.attackRestTime <= lastTime) {
                        let tag = data.attackRestTime / lastTime;
                        let Theta = (data.attackTheta - theta) * tag + (data.attackTheta + theta) * (1 - tag);
                        cxt.strokeStyle = 'white';
                        cxt.lineWidth = 2;
                        cxt.beginPath();
                        cxt.moveTo(data.y - Y + Math.cos(Theta) * playerRadius, data.x - X - Math.sin(Theta) * playerRadius);
                        cxt.lineTo(data.y - Y + Math.cos(Theta) * knifeRadius, data.x - X - Math.sin(Theta) * knifeRadius);
                        cxt.closePath();
                        cxt.stroke();
                    }
                }
                else if (data.id === playerIndex) {
                    cxt.lineWidth = 1;
                    cxt.strokeStyle = 'rgba(79, 194, 230, 0.6)';
                    cxt.fillStyle = 'rgba(79, 194, 230, 0.3)';
                    let nowTheta = Math.atan2(nowHeight / 2 - nowMouseX, nowMouseY - nowHeight);
                    cxt.beginPath();
                    cxt.arc(data.y - Y, data.x - X, playerRadius, nowTheta - theta, nowTheta + theta, false);
                    cxt.arc(data.y - Y, data.x - X, knifeRadius, nowTheta + theta, nowTheta - theta, true);
                    cxt.closePath();
                    cxt.fill();
                    cxt.stroke();
                }
                else return;
            });
            cxt.lineWidth = 2;
            players.forEach(data => {
                cxt.fillStyle = 'red';
                cxt.fillRect(data.y - Y - HPwidth / 2, data.x - X + HPdis + playerRadius, HPwidth * data.HP / data.maxHP, HPheight);
                cxt.strokeRect(data.y - Y - HPwidth / 2, data.x - X + HPdis + playerRadius, HPwidth, HPheight);
            });
            standingBox.innerHTML = '';
            for (let i = 0; i < 10; i++) {
                if (i < standing.length) {
                    standingBox.innerHTML += `${i + 1}.${standing[i]} ${players[standing[i]].score}<br/>`;
                }
                else {
                    standing.innerHTML += '<br/>';
                }
            }
            if (players[playerIndex]) {
                standing.innerHTML += `<hr/>${standing.indexOf(playerIndex) + 1}.${playerIndex} ${players[playerIndex].score}`;
            }
            if (running) requestAnimationFrame(x);
        });
        function pos({ x, y }) {
            return { x: x / canvas.offsetHeight * canvas.height, y: y / canvas.offsetWidth * canvas.width };
        }
        canvas.addEventListener('mousemove', ({ offsetX: y, offsetY: x }) => {
            ({ x, y } = pos({ x, y }));
            nowMouseX = Math.floor(x), nowMouseY = Math.floor(y);
        });
        canvas.addEventListener('click', ({ offsetX: y, offset: x }) => {
            ({ x, y } = pos({ x, y }));
            nowMouseX = x = Math.floor(x), nowMouseY = y = Math.floor(y);
            x += X, y += Y;
            if (alive && FORTY.check(playerIndex)) {
                send(['attack', Math.atan2(nowHeight / 2 - y + Y, x - X - nowWidth / 2)])
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
                if (newD != now && alive) send(['move', newD]);
            }
            return {
                keydownListener: function (data) {
                    if (data.key === 'w') {
                        w = 1;
                        updatedirect();
                    }
                    else if (data.key === 's') {
                        s = 1;
                        updatedirect();
                    }
                    else if (data.key === 'a') {
                        a = 1;
                        updatedirect();
                    }
                    else if (data.key === 'd') {
                        d = 1;
                        updatedirect();
                    }
                    else return;
                    data.preventDefault();
                },
                keyupListener: function (data) {
                    if (data.key === 'w') {
                        w = 0;
                        updatedirect();
                    }
                    else if (data.key === 's') {
                        s = 0;
                        updatedirect();
                    }
                    else if (data.key === 'a') {
                        a = 0;
                        updatedirect();
                    }
                    else if (data.key === 'd') {
                        d = 0;
                        updatedirect();
                    }
                    else return;
                    data.preventDefault();
                },
            };
        })();
        canvas.addEventListener('keydown', keydownListener);
        canvas.addEventListener('keyup', keyupListener);
        io.addEventListener('message', function x(msg) {
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
            else if(data[0] === 'player_lose') {
                let {killerID, playerID} = data[1];
                if(killerID === playerIndex) killTag = 20;
                else if(playerID === playerIndex) {
                    alive = 0;
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
            }
        });
    });
}
function endInterface(data) {
    if (data === CONTINUE_TAG) return null;
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
        tmp = await endInterface(await gameInterface(await readyInterface(await joinInterface(await chooseInterface(tmp)))));
    }
}
run();