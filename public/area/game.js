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
 * ['game_start', {player_index, player_list, height, width}]
 * ['game_update', {round:number, turn:number, map: map[][],losers:number[] }] 不断更新
 * ['decide_success', {x, y}]
 * ['decide_fail', reason]
 * ['queue_success', length]
 * ['queue_fail', reason]
 * ['game_end', rank]
 * ['player_lose', id] 玩家输了
 */

/**
 * send
 * ['set_ready_state', isReady]
 * ['decide', {x, y}]
 * ['queue_clear', null]
 * ['queue_pop', cnt]
 */
(() => {
    const io = new WebSocket(`wss://${location.host}/wss/`);
    const SUCCESS = 1, LOST = 0, gameType = 'area';
    const GRID_EMPTY = -1, GRID_BLOCK = -2, GRID_MIST = -3, maxQueueLen = 5, Ratio = 20;
    const JOIN_AUTO_FFA = Symbol('joinAutoFFA'), GAME_CONTINUE = Symbol('gameContinue'), SINGLE = Symbol('single');
    const future = {};
    let roomId;
    let playerList, playerIndex, map, height, width, round, turn, readyMap, alive, reFill;
    let canvas, nowRound;
    const COLOR = {
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
        ],
        emptyColor: { r: 233, g: 233, b: 233 },
        blockColor: future,
        mistColor: future,
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
            return `rgb(${r},${g},${b})`;
        },
        getColor: function ({ x, y }) {
            let fill;
            if (map[x][y] === GRID_EMPTY) fill = readyMap[x][y] ? this.colorMix(this.emptyColor, this.colorList[playerIndex]) : this.emptyColor;
            else if (map[x][y] === GRID_BLOCK) fill = this.blockColor;
            else if (map[x][y] === GRID_MIST) fill = this.mistColor;
            else fill = this.colorList[map[x][y]];
            return fill;
        },
        rePaint: function (pos = { x: -1, y: -1 }) {
            let { x, y } = pos;
            let ctx = canvas.getContext('2d');
            if (x === -1 && y === -1) {
                let imgData = ctx.createImageData(width, height);
                for (let i = 0; i < height; i++)
                    for (let j = 0; j < width; j++) {
                        let id = (i * width + j) * 4;
                        let fill = this.getColor({ x: i, y: j });
                        ({ r: imgData.data[id], g: imgData.data[id + 1], b: imgData.data[id + 2] } = fill);
                        imgData.data[id + 3] = 255;
                    }
                ctx.putImageData(imgData, 0, 0);
            }
            else {
                let fill = this.getColor(pos);
                ctx.fillStyle = `rgb(${fill.r},${fill.g},${fill.b})`;
                ctx.fillRect(y, x, 1, 1);
            }
        },
        /**
         * @param {number} height
         * @param {number} width
         * @param {{minRatio?:number,maxRatio?:number,ratio?:number,defaultRatio?:number}} options
         * @returns {{box:HTMLDivElement,canvas:HTMLCanvasElement,control:{transition:boolean,x:number,y:number,ratio:number},pos:({x:number,y:number})=>({x:number,y:number})}}
         */
        canvaBox: function (height, width, options = {}) {
            const {
                minRatio = 1,
                maxRatio = 64,
                ratio: setRatio = 2,
                defaultRatio = minRatio,
            } = options;
            if (defaultRatio < minRatio || defaultRatio > maxRatio) {
                throw new Error('defaultRatio must between minRatio and maxRatio');
            }
            let box = document.createElement('div');
            let canvas = document.createElement('canvas');
            canvas.height = height;
            canvas.width = width;
            box.style.height = toPx(height * defaultRatio);
            box.style.width = toPx(width * defaultRatio);
            box.style.overflow = 'hidden';
            canvas.style.position = 'relative';
            if (navigator.userAgent.indexOf('Firefox') > -1) canvas.style.imageRendering = 'crisp-edges';
            else canvas.style.imageRendering = 'pixelated';
            function limit(min, value, max) {
                return value < min ? min
                    : (value > max ? max
                        : value);
            }
            let control = {
                _ratio: 1,
                _x: 0,
                _y: 0,
                _a: false,
                get ratio() {
                    return this._ratio;
                },
                set ratio(value) {
                    this._ratio = limit(minRatio, value, maxRatio);
                    canvas.style.width = toPx(this._ratio * width);
                },
                get x() {
                    return this._x;
                },
                set x(value) {
                    this._x = limit(0, value, height * (this._ratio - defaultRatio));
                    canvas.style.top = toPx(-this._x);
                },
                get y() {
                    return this._y;
                },
                set y(value) {
                    this._y = limit(0, value, width * (this._ratio - defaultRatio));
                    canvas.style.left = toPx(-this._y);
                },
                get transition() {
                    return this._a;
                },
                set transition(value) {
                    if (this._a === value) {
                        return;
                    }
                    this._a = value;
                    if (this._a) {
                        canvas.style.transition = 'width 0.2s,top 0.2s,left 0.2s';
                    }
                    else {
                        canvas.style.transition = 'none';
                    }
                },
            };
            control.ratio = defaultRatio;
            control.x = 0;
            control.y = 0;
            function fixPos({ x, y }) {
                let fix = control.ratio * width / canvas.offsetWidth;
                return {
                    x: x * fix,
                    y: y * fix,
                };
            }
            canvas.addEventListener('wheel', (event) => {
                let { offsetY: x, offsetX: y, deltaY, shiftKey } = event;
                if (shiftKey) {
                    return;
                }
                event.preventDefault();
                ({ x, y } = fixPos({ x, y }));
                let ratio = limit(minRatio / control.ratio, deltaY < 0 ? setRatio : 1 / setRatio, maxRatio / control.ratio);
                control.transition = true;
                control.ratio *= ratio;
                control.x += (ratio - 1) * x;
                control.y += (ratio - 1) * y;
            });
            canvas.addEventListener('mousemove', ({ buttons, movementY: x, movementX: y }) => {
                ({ x, y } = fixPos({ x, y }));
                if (buttons === 1) {
                    control.transition = false;
                    control.x -= x;
                    control.y -= y;
                }
            });
            function pos({ x, y }) {
                let pos = width / canvas.offsetWidth;
                return {
                    x: x * pos,
                    y: y * pos,
                };
            }
            box.appendChild(canvas);
            return { box, canvas, control, pos };
        },
        getPlayerNameWithColor: function (index) {
            return `<span style="color:${this.toRGBString(this.colorList[index])};"> ${playerList[index]}</span>`;
        }
    };

    const HOVER = {
        empty: -1,
        nowx: -1,
        nowy: -1,
        emptyPos: { x: -1, y: -1 },
        deleteHover: function () {
            if (this.nowx < 0 || this.nowx >= height || this.nowy < 0 || this.nowy >= width) return;
            let ctx = canvas.getContext('2d');
            ctx.fillStyle = COLOR.toRGBString(COLOR.getColor({ x: this.nowx, y: this.nowy }));
            ctx.fillRect(this.nowy, this.nowx, 1, 1);
        },
        addHover: function () {
            if (this.nowx < 0 || this.nowx >= height || this.nowy < 0 || this.nowy >= width) return;
            let ctx = canvas.getContext('2d');
            ctx.fillStyle = COLOR.toRGBString(COLOR.colorMix({ r: 32, g: 32, b: 32 }, COLOR.getColor({ x: this.nowx, y: this.nowy })));
            ctx.fillRect(this.nowy, this.nowx, 1, 1);
        },
        setMouse: function ({ x, y }) {
            if (x === this.nowx && y === this.nowy) return;
            this.deleteHover();
            this.nowx = x;
            this.nowy = y;
            this.addHover();
        },
    };

    const toPx = value => value.toFixed(0) + 'px';
    function send(message) {
        io.send(JSON.stringify(message));
    }
    function boom() {
        setTimeout(() => location.href = location.origin, 200);
    }
    function clone(x) {
        if (typeof x !== "object") return x;
        return JSON.parse(JSON.stringify(x));
    }

    let messageP;
    function record(message) {
        if (messageP.className === 'message') {
            messageP.innerHTML = message;
            if (message) messageP.style.display = 'inline';
            else messageP.style.display = 'none';
        }
        else if (messageP.className === 'message-game') {
            messageP.innerHTML += message + '<br />';
        }
    }
    var COMMAND = {
        head: 0,
        commandQueue: [],
        serverCnt: 0,
        commandUpdate: function () {
            while (this.serverCnt < maxQueueLen && this.serverCnt + this.head < this.commandQueue.length) {
                send(['decide', this.commandQueue[this.head + this.serverCnt]]);
                this.serverCnt++;
            }
        },
        clearQueue: function () {
            this.commandQueue = [];
            this.head = this.serverCnt = 0;
            readyMap.forEach(data => data.fill(0));
            COLOR.rePaint();
            send(['queue_clear', null]);
        },
        popQueue: function () {
            if (this.commandQueue.length === 0) return;
            if (this.serverCnt + this.head === this.commandQueue.length) {
                send(['queue_pop', 1]);
                this.serverCnt--;
            }
            let pos = this.commandQueue[this.commandQueue.length - 1]
            readyMap[pos.x][pos.y] = 0;
            COLOR.rePaint(pos);
            this.commandQueue.pop();
        },
        doneQueue: function () {
            if (this.commandQueue.length === 0) return;
            let pos = this.commandQueue[this.head];
            readyMap[pos.x][pos.y] = 0;
            COLOR.rePaint(pos);
            this.head++;
            this.serverCnt--;
            if (this.serverCnt < 0) this.serverCnt = 0;
        },
        initCommand: function () {
            this.head = 0;
            this.commandQueue = [];
            this.serverCnt = 0;
        },
        addCommand: function (pos) {
            if (readyMap[pos.x][pos.y] || alive[playerIndex] === 0) return;
            readyMap[pos.x][pos.y] = 1;
            COLOR.rePaint(pos);
            this.commandQueue.push(pos);
            this.commandUpdate();
        },
    };
    var LISTENER = {
        queueListener: function (msg) {
            let data = JSON.parse(msg.data);
            if (!(data[0] in ['queue_success', 'queue_fail'])) return;
            if (data[0] === 'queue_fail') record('队列更新失败，原因: ' + data[1]);
            else COMMAND.serverCnt = data[1];
        },
        clearListener: function (event) {
            if (event.key === 'q') {
                event.preventDefault();
                COMMAND.clearQueue();
            }
        },
        decideListener: function (msg) {
            let data = JSON.parse(msg.data);
            if (data[0] !== 'decide_fail' && data[0] !== 'decide_success') return;
            if (data[0] === 'decide_fail') record('决策有误，原因: ' + data[1]), COMMAND.doneQueue();
            else {
                while (COMMAND.head < COMMAND.commandQueue.length && COMMAND.commandQueue[COMMAND.head].x !== data[1].x && COMMAND.commandQueue[COMMAND.head].y !== data[1].y) {
                    COMMAND.doneQueue();
                }
                if (COMMAND.head === COMMAND.commandQueue.length) COMMAND.clearQueue();
                else COMMAND.doneQueue();
            }
            COMMAND.commandUpdate();
        },
        popListener: function (event) {
            if (event.key === 'e') {
                event.preventDefault();
                COMMAND.popQueue();
            }
        },
        clearAllListener: function () {
            io.removeEventListener('message', this.decideListener);
            io.removeEventListener('message', this.queueListener);
            document.removeEventListener('keydown', this.clearListener);
            document.removeEventListener('keydown', this.popListener);
            io.removeEventListener('message', this.clearQueue);
        },
        loseListener: function (msg) {
            let data = JSON.parse(msg.data);
            if (data[0] === 'player_lose') {
                if (data[1] === playerIndex) record(`您阵亡了`);
                else record(`${playerList[data[1]]} 阵亡`);
                alive[data[1]] = 0;
                reFill();
                COMMAND.clearQueue();
            }
        },
        initListener: function () {
            io.addEventListener('message', this.loseListener);
            document.addEventListener('keydown', this.popListener);
            document.addEventListener('keydown', this.clearListener);
            io.addEventListener('message', this.queueListener);
            io.addEventListener('message', this.decideListener);
        }
    };

    function fillCheck(pos) {
        function inBound({ x, y }) {
            return x >= 0 && x < height && y >= 0 && y < width;
        }
        function adj({ x, y }) {
            return [
                { x: x + 1, y },
                { x: x - 1, y },
                { x, y: y + 1 },
                { x, y: y - 1 }
            ].filter(inBound);
        }
        let grid = clone(map);
        if (grid[pos.x][pos.y] !== GRID_EMPTY) {
            return false;
        }
        grid[pos.x][pos.y] = playerIndex;
        let queue = [pos];
        let head = 0;
        while (head < queue.length) {
            let pos = queue[head++];
            let tag = false;
            adj(pos).forEach((npos) => {
                let type = grid[npos.x][npos.y];
                if (type === GRID_EMPTY) {
                    grid[npos.x][npos.y] = playerIndex;
                    queue.push(npos);
                }
                else if (type !== playerIndex) {
                    tag = true;
                }
            });
            if (tag) {
                return false;
            }
        }
        return queue;
    }
    function update(data) {
        ({ map, turn, round } = data);
        for (let i of data.losers) {
            if (alive[i]) {
                alive[i] = 0;
                reFill();
            }
        }
        COLOR.rePaint();
        nowRound.innerHTML = `第${round + 1}轮 <br /> 当前行动: ${playerList[turn]} <br /> 你是: ${playerList[playerIndex]}`;
        if (turn === playerIndex) nowRound.innerHTML += `<br /><strong>轮到你行动了,请尽快做出决策</strong>`;
    }
    /**
     * @param {String} tag 
     * @param {String} inner 
     * @returns {HTMLElement}
     */
    function create(tag, inner = '', className = '') {
        let d = document.createElement(tag);
        d.innerHTML = inner;
        d.className = className;
        return d;
    }
    function clearBody() {
        let list = document.body.children;
        while (list.length) {
            document.body.removeChild(list[list.length - 1]);
            list = document.body.children;
        }
    }
    const typeList = {
        '经典 FFA': { check: () => 1, type: JOIN_AUTO_FFA },
        '单机模式': { check: () => 1, type: SINGLE },
        '重新连接': { check: () => Boolean(localStorage.areaLastRoomId), type: GAME_CONTINUE },
    };
    async function chooseInterface() {
        return await new Promise(resolve => {
            clearBody();
            let frame = create('div', '', 'frame choose-interface');
            frame.appendChild(create('h1', 'Welcome to Area!', 'welcome'));
            let cnt = 0;
            for (let type in typeList) {
                if (!(typeList[type].check())) continue;
                cnt++;
                let btn = create('button', type, 'choose');
                btn.style.gridRow = `${cnt + 1}`;
                btn.addEventListener('click', () => {
                    resolve(typeList[type].type);
                });
                frame.appendChild(btn);
            }
            frame.style.gridTemplateRows = `1fr repeat(${cnt}, 60px) 1fr`;
            document.body.appendChild(frame);
        });
    }
    async function joinInterface(type) {
        clearBody();
        let frame = create('div', '', 'frame join-interface');
        messageP = create('p', '', 'message');
        messageP.style.height = '60px';
        messageP.style.fontSize = '40px';
        messageP.style.border = '0';
        frame.appendChild(messageP);
        document.body.appendChild(frame);
        async function join_auto_FFA() {
            record('正在匹配');
            send(['join_auto', gameType]);
            await new Promise((resolve) => {
                io.addEventListener('message', function x(msg) {
                    let data = JSON.parse(msg.data);
                    if (data[0] !== 'join_success' && data[0] !== 'join_fail') return;
                    if (data[0] === 'join_success') {
                        roomId = data[1];
                        io.removeEventListener('message', x);
                        resolve();
                    }
                    else {
                        setTimeout(alert(data[1]), 200);
                        io.removeEventListener('message', x);
                        resolve();
                        boom();
                    }
                });
            });
        }
        async function game_continue() {
            record('正在重新连接');
            send(['join', localStorage.areaLastRoomId]);
            localStorage.removeItem('areaLastRoomId');
            await new Promise((resolve) => {
                io.addEventListener('message', function x(msg) {
                    let data = JSON.parse(msg.data);
                    if (data[0] !== 'join_success' && data[0] !== 'join_fail') return;
                    if (data[0] === 'join_success') {
                        roomId = data[1];
                        io.removeEventListener('message', x);
                        resolve();
                    }
                    else {
                        setTimeout(alert(data[1]), 200);
                        io.removeEventListener('message', x);
                        resolve();
                        boom();
                    }
                })
            });
        }
        async function game_single() {
            location.href = location.origin + '/area-single';
        }
        if (type === JOIN_AUTO_FFA) await join_auto_FFA();
        else if (type === GAME_CONTINUE) await game_continue();
        else if (type === SINGLE) await game_single();
    }
    let playerMessage, nowAttitude;
    async function readyInterface() {
        clearBody();
        let frame = create('div', '', 'frame ready-interface');
        messageP = create('p', '', 'message');
        frame.appendChild(messageP);
        let countdown = create('h1', '', 'countdown');
        frame.appendChild(countdown);
        playerMessage = create('p', '', 'ready');
        frame.appendChild(playerMessage);
        nowAttitude = false;
        let btn = create('button', '准备提前开始', 'unready');
        frame.appendChild(btn);
        document.body.appendChild(frame);
        btn.addEventListener('click', function () {
            if (nowAttitude === false) {
                nowAttitude = true;
                btn.innerHTML = '取消提前开始';
                send(['set_ready_state', nowAttitude]);
                btn.className = 'ready';
            }
            else {
                nowAttitude = false;
                btn.innerHTML = '准备提前开始';
                send(['set_ready_state', nowAttitude]);
                btn.className = 'unready';
            }
        });
        let tmp;
        await new Promise((resolve) => {
            let start_time = null;
            let tag = 0;
            tmp = setInterval(() => {
                let msg = '';
                if (start_time === null) msg = '对局仍不能开始';
                else msg = `倒计时: ${Math.ceil((start_time - (new Date()).getTime()) / 1000)}s`;
                countdown.innerHTML = msg;
            }, 0);
            io.addEventListener('message', function x(msg) {
                let data = JSON.parse(msg.data);
                if (data[0] === 'ready_state') {
                    if (tag === 0) send(['set_ready_state', nowAttitude]), tag = 1;
                    setPlayerCnt({ playerCnt: data[1].player_count, readyCnt: data[1].ready_count });
                    if (data[1].start_time === null) start_time = null;
                    else start_time = data[1].start_time + (new Date()).getTime();
                }
                else if (data[0] === 'game_start') {
                    localStorage.areaLastRoomId = roomId;
                    playerList = data[1].player_list;
                    playerIndex = data[1].player_index;
                    alive = Array(playerList.length);
                    alive.fill(1);
                    height = data[1].height;
                    width = data[1].width;
                    readyMap = Array(height);
                    for (let i = 0; i < height; i++) {
                        readyMap[i] = Array(width);
                        for (let j = 0; j < width; j++) readyMap[i][j] = 0;
                    }
                    map = clone(readyMap);
                    io.removeEventListener('message', x);
                    resolve();
                }
            });
        });
        clearInterval(tmp);
    }
    function setPlayerCnt({ playerCnt, readyCnt }) {
        playerMessage.innerHTML = `提前开始: ${readyCnt}/${playerCnt}`;
    }
    async function gameInterface() {
        clearBody();
        let frame = create('div', '', 'frame game-interface'), aliveBox = create('div', '', 'alive'), deadBox = create('div', '', 'dead');
        let canva = COLOR.canvaBox(height, width, { minRatio: Ratio, maxRatio: Ratio, ratio: 1, defaultRatio: Ratio });
        canva.box.className = 'canvas';
        canvas = canva.canvas;
        let condition = create('div', '', 'condition');
        nowRound = create('div', '', 'round');
        messageP = create('div', '', 'message-game');

        frame.appendChild(canva.box);
        frame.appendChild(condition);
        frame.appendChild(messageP);
        condition.appendChild(nowRound);
        condition.appendChild(aliveBox);
        condition.appendChild(deadBox);

        frame.style.gridTemplateColumns = `1fr 250px ${width * Ratio + 4}px 250px 1fr`;
        frame.style.gridTemplateRows = `1fr ${height * Ratio + 4}px 1fr`;

        reFill = function () {
            let aliveList = [], deadList = [];
            playerList.forEach((data, index) => {
                data = COLOR.getPlayerNameWithColor(index);
                if (alive[index]) aliveList.push(`${data}`);
                else deadList.push(`${data}`);
            });
            aliveBox.innerHTML = aliveList.join('<br />');
            deadBox.innerHTML = deadList.join('<br />');
        }
        reFill();

        canvas.addEventListener('mouseleave', function () {
            HOVER.setMouse(HOVER.emptyPos);
        });
        canvas.addEventListener('mouseenter', function (event) {
            let { x, y } = canva.pos({ x: event.offsetY, y: event.offsetX });
            x = Math.floor(x), y = Math.floor(y);
            HOVER.setMouse({ x, y });
        });
        canvas.addEventListener('mousemove', function (event) {
            let { x, y } = canva.pos({ x: event.offsetY, y: event.offsetX });
            x = Math.floor(x), y = Math.floor(y);
            HOVER.setMouse({ x, y });
        });
        canvas.addEventListener('click', (event) => {
            let { offsetX: y, offsetY: x } = event;
            event.stopPropagation();
            event.preventDefault();
            ({ x, y } = canva.pos({ x, y }));
            x = Math.floor(x);
            y = Math.floor(y);
            function inBound({ x, y }) {
                return x >= 0 && x < height && y >= 0 && y < width;
            }
            if (inBound({ x, y }) && map[x][y] === GRID_EMPTY && [
                { x, y: y + 1 },
                { x, y: y - 1 },
                { x: x - 1, y: y },
                { x: x + 1, y: y },
            ].filter(inBound).some(({ x, y }) => (map[x][y] === playerIndex || readyMap[x][y]))) {
                let tmp;
                if (event.ctrlKey && (tmp = fillCheck({ x, y }))) {
                    tmp.forEach((data) => COMMAND.addCommand(data));
                }
                else COMMAND.addCommand({ x, y });
            }
        });

        COMMAND.initCommand();
        LISTENER.initListener();

        document.body.appendChild(frame);

        return await new Promise((resolve) => {
            io.addEventListener('message', async function x(msg) {
                let data = JSON.parse(msg.data);
                if (data[0] === 'game_end') {
                    localStorage.removeItem('areaLastRoomId');
                    io.removeEventListener('message', x);
                    LISTENER.clearAllListener();
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    resolve(data[1].indexOf(playerIndex) + 1);
                }
                else if (data[0] === 'game_update') {
                    update(data[1]);
                    HOVER.addHover();
                }
            });
        });
    }
    async function endInterface(rank) {
        clearBody();
        let frame = create('div', '', 'frame end-interface');
        let ranking = create('h1', `你是第${rank}名`, 'rank');
        frame.appendChild(ranking);
        let btn = create('button', '确定', 'restart');
        frame.appendChild(ranking);
        frame.appendChild(btn);
        document.body.appendChild(frame);
        await new Promise((resolve) => {
            btn.addEventListener('click', () => {
                resolve();
            });
        });
    }

    async function work() {
        await joinInterface(await chooseInterface());
        await readyInterface();
        await endInterface(await gameInterface());
    }

    async function run() {
        let tag = 0;
        io.addEventListener('close', () => {
            if(tag === -1) return;
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
        while (1) {
            await work();
        }
    }
    run();
})();