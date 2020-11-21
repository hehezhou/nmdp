try {
    new WebSocket(`ws://${location.host}/ws/`);
}
catch (e) {

}
function __gid({ x, y }) {
    return `g_${x}_${y}`;
}
function __xy(gid) {
    let [g, x, y] = gid.split('_');
    if (g !== 'g') {
        return null;
    }
    [x, y] = [x, y].map(a => parseInt(a));
    return { x, y };
}
let __g_x, __g_y;
function clearGrid() {
    document.getElementById('board').innerHTML = '';
}
/**
 * Build a grid
 * @param {Number} n 
 * @param {Number} m 
 */
function buildGrid(n, m) {
    [__g_x, __g_y] = [n, m];
    let e = document.getElementById('board');
    for (let i = 0; i < n; i++) {
        let el = document.createElement('div');
        el.classList.add('line');
        for (let j = 0; j < m; j++) {
            let ele = document.createElement('div');
            ele.id = __gid({ x: i, y: j });
            ele.classList.add('grid');
            el.appendChild(ele);
        }
        e.appendChild(el);
    }
}
/**
 * x:line y:col
 * @param {{x : Number, y : Number}} param0
 * @param {String} color
 */
function setColor({ x, y }, color) {
    document.getElementById(__gid({ x, y })).style.backgroundColor = color;
}
const pauseButton = document.getElementById("pause-button"), restartButton = document.getElementById("restart-button"), enterButton = document.getElementById('qwq');
function checkBtn() {
    if (document.getElementById('qaq').children.length > 0) {
        enterButton.style.display = 'inline-block';
    }
    else {
        enterButton.style.display = 'none';
    }
}
function once(ele, name, fn) {
    let f = (e) => {
        if (!fn(e)) {
            ele.removeEventListener(name, f);
        }
    };
    ele.addEventListener(name, f);
}
/**
 * returns result
 * @param {String} hint
 * @param {String?} def  
 * @returns {Promise<String>}
 */
function input(hint, def = '') {
    return new Promise((resolve, reject) => {
        let inputer = document.createElement('tr');
        let h = document.createElement('td');
        h.innerHTML = hint;
        let td = document.createElement('td');
        let input = document.createElement('input');
        input.value = def;
        inputer.appendChild(h);
        td.appendChild(input);
        inputer.appendChild(td);
        document.getElementById('qaq').appendChild(inputer);
        once(document.getElementById('qwq'), 'click', () => {
            resolve(input.value);
            inputer.remove();
            checkBtn();
        });
        checkBtn();
    });
}

/**
 * @param {String} hint
 * @returns {Promise<{x,y,fill}>}
 */
function inputXY(hint) {
    return new Promise((resolve) => {
        let h = document.createElement('p');
        h.innerHTML = hint;
        document.body.appendChild(h);
        let board = document.getElementById('board');
        once(board, 'click', e => {
            let result = __xy(e.path[0].id);
            if (result === null) {
                return true;
            }
            result.fill = e.ctrlKey;
            h.remove();
            resolve(result);
        });
    });
}
/**
 * 
 * @param {{x: Number,y: Number}} pos 
 * @param {'Top'|'Bottom'|'Left'|'Right'} der 
 * @param {String} color 
 */
function setBorder(pos, der, color) {
    // if(['Left','Top'].includes(der))return;
    document.getElementById(__gid(pos)).style['border' + der] = `1px ${color} solid`;
}
function clearBorder(pos, der) {
    document.getElementById(__gid(pos)).style['border' + der] = 'none';
}

function randFloat(l, r) {
    return l + Math.random() * (r - l);
}

function randInt(l, r) {
    return l + Math.floor(Math.random() * (r - l));
}
function getPlayerColor(id) {
    let a = ['red', 'blue', 'green'];
    if (id >= a.length) {
        let r, g, b;
        do {
            r = randInt(0, 256);
            g = randInt(0, 256);
            b = randInt(0, 256);
        } while (Math.max(r, g, b) < 64);
        return `rgb(${r},${g},${b})`;
    }
    else {
        return a[id];
    }
}

function getEmptyColor() {
    return '#eeeeee';
}

async function getInt(hint, def = '') {
    let x = parseInt(await input(hint, def));
    if (isNaN(x)) {
        throw new Error(`${x} is NaN`);
    }
    return x;
}

const GRID_EMPTY = -1;

function clone(obj) {
    if (typeof obj !== 'object') {
        return obj;
    }
    if (obj instanceof Array) {
        return obj.map(clone);
    }
    return JSON.parse(JSON.stringify(obj));
}

function HUMAN(grid, playerIndex, colorList) {
    return inputXY(`请选择要扩张的格子`);
}

let update;

function genAI(difficulty) {
    function AI(grid, playerIndex, colorList) {
        return new Promise((resolve, reject) => {
            let n = grid.length;
            let m = grid[0].length;
            let x, y;
            let dist, own;
            function inBound({ x, y }) {
                return x >= 0 && x < n && y >= 0 && y < m;
            }
            function adj({ x, y }) {
                return [
                    { x: x + 1, y },
                    { x: x - 1, y },
                    { x, y: y + 1 },
                    { x, y: y - 1 }
                ].filter(inBound);
            }
            function at({ x, y }) {
                return grid[x][y];
            }
            function isEmpty(pos) {
                return at(pos) === GRID_EMPTY;
            }
            function isOwn(pos) {
                return at(pos) === playerIndex;
            }
            function isOK(pos) {
                return isEmpty(pos) && adj(pos).some(isOwn);
            }
            function neighbour({ x, y }) {
                return [
                    { x: x, y: y - 1 },
                    { x: x, y: y + 1 },
                    { x: x - 1, y: y },
                    { x: x + 1, y: y }
                ].filter(function ({ x, y }) {
                    return x >= 0 && x < n && y >= 0 && y < m;
                });
            }
            function bfs() {
                dist = Array(n);
                for (let i = 0; i < n; i++) {
                    dist[i] = Array(m);
                    for (let j = 0; j < m; j++) dist[i][j] = -1;
                }
                own = Array(n);
                for (let i = 0; i < n; i++) {
                    own[i] = Array(m);
                    for (let j = 0; j < m; j++) own[i][j] = grid[i][j];
                }
                let head = 0, tail = -1, que = [];
                for (let i = 0; i < n; i++)
                    for (let j = 0; j < m; j++) {
                        if (grid[i][j] !== -1 && grid[i][j] !== playerIndex) que.push({ x: i, y: j }), tail++ , dist[i][j] = 0;
                    }
                for (let i = 0; i < n; i++)
                    for (let j = 0; j < m; j++) {
                        if (grid[i][j] === playerIndex) que.push({ x: i, y: j }), tail++ , dist[i][j] = 0;
                    }
                while (head <= tail) {
                    let list = neighbour(que[head]).filter(function (pos) {
                        return dist[pos.x][pos.y] === -1;
                    });
                    for (let pos of list) {
                        dist[pos.x][pos.y] = dist[que[head].x][que[head].y] + 1;
                        own[pos.x][pos.y] = own[que[head].x][que[head].y];
                        que.push(pos);
                        tail++;
                    }
                    head++;
                }
            };
            function transfer(pos) {
                return { x: pos.x - pos.y + m - 1, y: pos.x + pos.y };
            }
            let map1 = Array(n + m), map2 = Array(n + m);
            function calc(map, tag) {
                for (let i = 0; i < n + m; i++) {
                    map[i] = Array(n + m);
                    for (let j = 0; j < n + m; j++) map[i][j] = 0;
                }
                for (let i = 0; i < n; i++)
                    for (let j = 0; j < m; j++) {
                        if (dist[i][j] === 0 || own[i][j] == playerIndex) continue;
                        let lx, rx, ly, ry;
                        let pos = { x: i, y: j }, tpos = transfer(pos), d = dist[i][j] + tag;
                        d = Math.round(d + randFloat(-d * difficulty, 5 * d * difficulty));
                        lx = tpos.x - d, rx = tpos.x + d;
                        ly = tpos.y - d, ry = tpos.y + d;
                        if (lx > rx || ly > ry) continue;
                        if (lx < 0) lx = 0;
                        if (ly < 0) ly = 0;
                        if (rx < 0) rx = 0;
                        if (ry < 0) ry = 0;
                        if (lx >= n + m - 1) lx = n + m - 2;
                        if (ly >= n + m - 1) ly = n + m - 2;
                        if (rx >= n + m - 1) rx = n + m - 2;
                        if (ry >= n + m - 1) ry = n + m - 2;
                        map[lx][ly] += 1;
                        map[rx + 1][ry + 1] += 1;
                        map[lx][ry + 1] -= 1;
                        map[rx + 1][ly] -= 1;
                    }
                for (let i = 0; i < n + m - 1; i++)
                    for (let j = 0; j < n + m - 1; j++) map[i][j + 1] += map[i][j];
                for (let i = 0; i < n + m - 1; i++)
                    for (let j = 0; j < n + m - 1; j++) map[i + 1][j] += map[i][j];
            }
            bfs();
            calc(map1, -1);
            bfs();
            calc(map2, 0);
            let _max1 = -1e9, _max2 = -1e9, _max3 = -1e9;
            for (let i = 0; i < n; i++)
                for (let j = 0; j < m; j++) {
                    if (!isOK({ x: i, y: j })) continue;
                    let tpos = transfer({ x: i, y: j });
                    let X = tpos.x, Y = tpos.y;
                    let score1 = map1[X][Y], score2 = map2[X][Y], score3 = Math.random();
                    if (score1 > _max1) {
                        _max1 = score1, _max2 = score2, _max3 = score3;
                        x = i, y = j;
                    }
                    else if (score1 === _max1 && score2 > _max2) {
                        _max1 = score1, _max2 = score2, _max3 = score3;
                        x = i, y = j;
                    }
                    else if (score1 === _max1 && score2 === _max2 && score3 > _max3) {
                        _max1 = score1, _max2 = score2, _max3 = score3;
                        x = i, y = j;
                    }
                }
            resolve({ x, y, fill: _max1 === 0 && _max2 === 0 });
        });
    }
    return AI;
}
/**
 * getVarName({qwq}) returns 'qwq'
 */
function getVarName(obj) {
    for (let i in obj) {
        return i;
    }
}

/**
 * set new hint.
 * @param {String} hint 
 */
let __g_h = null;
function setHint(hint) {
    if (hint) {
        if (__g_h === null) {
            __g_h = document.createElement('p');
            document.body.appendChild(__g_h);
        }
        __g_h.innerHTML = hint;
    }
    else {
        if (__g_h) {
            __g_h.remove();
            __g_h = null;
        }
    }
}

let __g_c = {
    n: 20,
    m: 20,
    playerCnt: 3,
    humanCnt: 1,
    difficulty: 100
};
const lengthOf__g_c = 5;
let running, restart, difficulty;
function pauseReady() {
    pauseButton.innerHTML = "暂停";
    running = 1;
}
function showPause() {
    pauseButton.style.display = "inline-block";
}
function hidePause() {
    pauseButton.style.display = "none";
}
function restartReady() {
    restart = 0;
}
function showRestart() {
    restartButton.style.display = "inline-block";
}
function hideRestart() {
    restartButton.style.display = "none";
}
async function work() {
    pauseReady();
    restartReady();
    hideRestart();
    hidePause();
    setHint('');
    clearGrid();
    let { encode, decode } = (() => {
        const t = 94;
        const e = { 33: 33, 34: 34, 35: 35, 36: 36, 37: 37, 38: 38, 39: 39, 40: 40, 41: 41, 42: 42, 43: 43, 44: 44, 45: 45, 46: 46, 47: 47, 48: 48, 49: 49, 50: 50, 51: 51, 52: 52, 53: 53, 54: 54, 55: 55, 56: 56, 57: 57, 58: 58, 59: 59, 60: 60, 61: 61, 62: 62, 63: 63, 64: 64, 65: 65, 66: 66, 67: 67, 68: 68, 69: 69, 70: 70, 71: 71, 72: 72, 73: 73, 74: 74, 75: 75, 76: 76, 77: 77, 78: 78, 79: 79, 80: 80, 81: 81, 82: 82, 83: 83, 84: 84, 85: 85, 86: 86, 87: 87, 88: 88, 89: 89, 90: 90, 91: 91, 92: 92, 93: 93, 94: 94, 95: 95, 96: 96, 97: 97, 98: 98, 99: 99, 100: 100, 101: 101, 102: 102, 103: 103, 104: 104, 105: 105, 106: 106, 107: 107, 108: 108, 109: 109, 110: 110, 111: 111, 112: 112, 113: 113, 114: 114, 115: 115, 116: 116, 117: 117, 118: 118, 119: 119, 120: 120, 121: 121, 122: 122, 123: 123, 124: 124, 125: 125, 126: 126 };
        const i = { 33: 33, 34: 34, 35: 35, 36: 36, 37: 37, 38: 38, 39: 39, 40: 40, 41: 41, 42: 42, 43: 43, 44: 44, 45: 45, 46: 46, 47: 47, 48: 48, 49: 49, 50: 50, 51: 51, 52: 52, 53: 53, 54: 54, 55: 55, 56: 56, 57: 57, 58: 58, 59: 59, 60: 60, 61: 61, 62: 62, 63: 63, 64: 64, 65: 65, 66: 66, 67: 67, 68: 68, 69: 69, 70: 70, 71: 71, 72: 72, 73: 73, 74: 74, 75: 75, 76: 76, 77: 77, 78: 78, 79: 79, 80: 80, 81: 81, 82: 82, 83: 83, 84: 84, 85: 85, 86: 86, 87: 87, 88: 88, 89: 89, 90: 90, 91: 91, 92: 92, 93: 93, 94: 94, 95: 95, 96: 96, 97: 97, 98: 98, 99: 99, 100: 100, 101: 101, 102: 102, 103: 103, 104: 104, 105: 105, 106: 106, 107: 107, 108: 108, 109: 109, 110: 110, 111: 111, 112: 112, 113: 113, 114: 114, 115: 115, 116: 116, 117: 117, 118: 118, 119: 119, 120: 120, 121: 121, 122: 122, 123: 123, 124: 124, 125: 125, 126: 126 };
        return {
            encode: function (obj) {
                let str = JSON.stringify(obj);
                str = str.split('').map((x) => x.charCodeAt() - 33);
                let len = str.length;
                for (let i = len - 1; i > 0; i--) {
                    str[i] = (str[i] - str[i - 1] + t) % t;
                }
                str = str.map((x) => String.fromCharCode(e[x + 33])).join('');
                return str;
            },
            decode: function (str) {
                str = str.split('').map((x) => i[x.charCodeAt()] - 33);
                let len = str.length;
                for (let i = 1; i < len; i++) str[i] = (str[i - 1] + str[i]) % t;
                str = str.map((x) => String.fromCharCode(x + 33)).join('');
                return JSON.parse(str);
            }
        }
    })();
    let n, m, playerCnt, humanCnt, round = 0, nowPlayer = 0, saveRound = 20;
    let playerColor, emptyColor, restCnt, isAlive, borderColor = 'rgba(0,0,0,0.4)';
    let map;
    update =
        /**
         * update border
         * @param {{x: Number, y: Number}} pos 
         * @param {Array<Array<Number>>} grid 
         */
        function (pos, grid) {
            const rev = {
                Top: "Bottom",
                Bottom: "Top",
                Left: "Right",
                Right: "Left",
            }
            let list = (function ({ x, y }) {
                return [
                    { x: x - 1, y: y, tag: "Top" },
                    { x: x + 1, y: y, tag: "Bottom" },
                    { x: x, y: y - 1, tag: "Left" },
                    { x: x, y: y + 1, tag: "Right" }
                ];
            })(pos);
            function inBound({ x, y }) {
                return x >= 0 && x < n && y >= 0 && y < m;
            }
            for (let i of list) {
                if (!inBound(i)) {
                    setBorder(pos, i.tag, borderColor);
                }
                else if (grid[i.x][i.y] == grid[pos.x][pos.y]) {
                    clearBorder(pos, i.tag);
                    clearBorder(i, rev[i.tag]);
                }
                else {
                    setBorder(pos, i.tag, borderColor);
                    setBorder(i, rev[i.tag], borderColor);
                }
            }
        }
    /**
     * 0: only save init data
     * 1: save the map
     * @param {0|1} type 
     */
    function save(type) {
        let obj = { init: __g_c, tag: type };
        if (type) {
            obj.information = { n, m, playerCnt, humanCnt, difficulty, restCnt, isAlive, playerColor, emptyColor, round, nowPlayer };
            obj.map = map;
        }
        localStorage.setItem('game-area-save', JSON.stringify({ areaMapData: obj }));
    }
    function load(data) {
        if (data.init === undefined) return 0;
        __g_c = data.init;
        if (data.tag) {
            ({ n, m, playerCnt, humanCnt, difficulty, restCnt, isAlive, playerColor, emptyColor, round, nowPlayer } = data.information);
            map = JSON.parse(JSON.stringify(data.map));
            return 1;
        }
        return 0;
    }
    let saveData;
    let isSaveData = true;
    try {
        ({ areaMapData: saveData } = JSON.parse(localStorage.getItem('game-area-save')) || {});
    }
    catch (e) {
        saveData = undefined;
        isSaveData = false;
    }
    if (isSaveData && saveData !== undefined && load(saveData)) {
        function init() {
            buildGrid(n, m);
            for (let i = 0; i < n; i++)
                for (let j = 0; j < m; j++) {
                    if (map[i][j] == GRID_EMPTY) setColor({ x: i, y: j }, emptyColor);
                    else setColor({ x: i, y: j }, playerColor[map[i][j]]);
                    update({ x: i, y: j }, map);
                }
            // await new Promise((resolve) => requestAnimationFrame(resolve));
        }
        init();
    }
    else {
        save(0);
        do {
            try {
                [n, m, playerCnt, humanCnt, difficulty] = await Promise.all([
                    getInt("行数", __g_c.n),
                    getInt("列数", __g_c.m),
                    getInt("总玩家数", __g_c.playerCnt),
                    getInt("人类玩家数", __g_c.humanCnt),
                    getInt("AI难度(1-100)", __g_c.difficulty)
                ]);
            }
            catch (e) {
                continue;
            }
        } while (
            !(n > 0 && m > 0
                && playerCnt > 1 && playerCnt <= n * m
                && humanCnt >= 0 && humanCnt <= playerCnt
                && difficulty >= 1 && difficulty <= 100)
        );
        map = Array(n);
        for (let i = 0; i < n; i++) {
            map[i] = new Array(m);
        }
        for (let i = 0; i < n; i++)
            for (let j = 0; j < m; j++) map[i][j] = GRID_EMPTY;
        playerColor = new Array(playerCnt), emptyColor = getEmptyColor();
        for (let i = 0; i < playerCnt; i++) {
            playerColor[i] = getPlayerColor(i);
        }
        function init() {
            buildGrid(n, m);
            for (let i = 0; i < n; i++)
                for (let j = 0; j < m; j++) setColor({ x: i, y: j }, emptyColor);
            for (let i = 0; i < playerCnt; i++) {
                let x, y;
                while (x = randInt(0, n), y = randInt(0, m), map[x][y] != GRID_EMPTY);
                map[x][y] = i;
                setColor({ x, y }, playerColor[i]);
            }
        }
        init();
        restCnt = playerCnt;
        isAlive = new Array(playerCnt);
        isAlive.fill(true);
    }
    __g_c = { n, m, playerCnt, humanCnt, difficulty };
    function equal(x, y, val) {
        return x >= 0 && x < n && y >= 0 && y < m && map[x][y] === val;
    }
    function alive(id) {
        for (let x = 0; x < n; x++)
            for (let y = 0; y < m; y++) {
                if (map[x][y] === id) {
                    if (equal(x - 1, y, GRID_EMPTY) || equal(x + 1, y, GRID_EMPTY) || equal(x, y - 1, GRID_EMPTY) || equal(x, y + 1, GRID_EMPTY)) return true;
                }
            }
        return false;
    }
    function goisOK(x, y, id) {
        if (!equal(x, y, GRID_EMPTY)) return false;
        return equal(x - 1, y, id) || equal(x + 1, y, id) || equal(x, y - 1, id) || equal(x, y + 1, id);
    }
    function fillisOK(pos, playerIndex) {
        function inBound({ x, y }) {
            return x >= 0 && x < n && y >= 0 && y < m;
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
            let gg = false;
            adj(pos).forEach((npos) => {
                let type = grid[npos.x][npos.y];
                if (type === GRID_EMPTY) {
                    grid[npos.x][npos.y] = playerIndex;
                    queue.push(npos);
                }
                else if (type !== playerIndex) {
                    gg = true;
                }
            });
            if (gg) {
                return false;
            }
        }
        return queue;
    }
    function playerString(id) {
        return `<span style="color:${playerColor[id]};">玩家 ${id + 1}</span>`;
    }
    let commandQueue = [];
    for (let i = 0; i < playerCnt; i++) {
        commandQueue.push([]);
    }
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < m; j++) update({ x: i, y: j }, map);
    }
    showPause();
    showRestart();
    function die(playerId) {
        return new Promise(async (resolve, reject) => {
            if (document.getElementById("dieEffect").checked) {
                setHint(`${playerString(playerId)} 失败了！`);
                let SYM_GG = Symbol('GG');
                for (let _ = 0; _ < 3; _++) {
                    for (let i = 0; i < n; i++)
                        for (let j = 0; j < m; j++) {
                            if (map[i][j] === playerId) {
                                map[i][j] = SYM_GG;
                                setColor({ x: i, y: j }, emptyColor);
                            }
                        }
                    for (let _ = 0; _ < 5; _++) await new Promise((resolve) => requestAnimationFrame(resolve));
                    for (let i = 0; i < n; i++)
                        for (let j = 0; j < m; j++) {
                            if (map[i][j] === SYM_GG) {
                                map[i][j] = playerId;
                                setColor({ x: i, y: j }, playerColor[playerId]);
                            }
                        }
                    for (let _ = 0; _ < 5; _++) await new Promise((resolve) => requestAnimationFrame(resolve));
                }
            }
            for (let i = 0; i < n; i++)
                for (let j = 0; j < m; j++) {
                    if (map[i][j] === playerId) {
                        map[i][j] = GRID_EMPTY;
                        update({ x: i, y: j }, map);
                        setColor({ x: i, y: j }, emptyColor);
                    }
                }
            restCnt -= 1;
            isAlive[playerId] = false;
            for (let i = 0; i < playerCnt; i++) {
                commandQueue[i] = [];
            }
            resolve(0);
        });
    };
    let saveCnt = -1;
    async function run() {
        if (!isAlive[nowPlayer]) { return 0; }
        await new Promise((resolve) => requestAnimationFrame(resolve));
        saveCnt = (saveCnt + 1) % saveRound;
        if (saveCnt === 0 || nowPlayer <= humanCnt) save(1);
        if (!alive(nowPlayer)) {
            await die(nowPlayer);
            save(1);
            if (restCnt === 1) {
                let winnerID = isAlive.findIndex(x => x);
                hideRestart();
                hidePause();
                setHint(`${playerString(winnerID)} 于第 ${round} 轮获得胜利！`);
                save(0);
                let r;
                do {
                    r = await input(`再来一局？（Y/N）`, 'Y');
                } while (!['Y', 'N'].includes(r));
                if (r === 'Y') {
                    work();
                }
                return 1;
            }
            return 0;
        }
        setHint(`第 ${round} 轮<br>还有 ${restCnt} 人存活<br>行动者：${playerString(nowPlayer)}`);

        let x, y, fill;
        let player = nowPlayer < humanCnt ? HUMAN : genAI((100 - difficulty) / 100);
        do {
            if (commandQueue[nowPlayer].length > 0) {
                ({ x, y } = commandQueue[nowPlayer].shift());
                fill = false;
            }
            else {
                ({ x, y, fill } = await player(clone(map), nowPlayer, clone(playerColor)));
            }
            if (restart === 1) break;
            if (goisOK(x, y, nowPlayer)) {
                if (fill) {
                    let result = fillisOK({ x, y }, nowPlayer);
                    if (result) {
                        commandQueue[nowPlayer] = result;
                        continue;
                    }
                }
                break;
            }
        } while (true);
        if (restart === 1) {
            save(0);
            work();
            return 1;
        }
        if (running === 0) { nowPlayer--; return 0; }
        map[x][y] = nowPlayer;
        setColor({ x, y }, playerColor[nowPlayer]);
        update({ x, y }, map);
        return 0;
    }
    for (; ; round++) {
        for (; nowPlayer < playerCnt; nowPlayer++) {
            if (await run()) return 0;
        }
        nowPlayer = 0;
    }
}

function pauseAddEvent() {
    pauseButton.addEventListener("click", function () {
        if (running === 0) {
            running = 1;
            pauseButton.innerHTML = "暂停";
        }
        else {
            running = 0;
            pauseButton.innerHTML = "继续";
        }
    });
}
function restartAddEvent() {
    restartButton.addEventListener("click", function () {
        restart = 1;
        let ele = document.getElementById(__gid({ x: 0, y: 0 }));
        if (ele) ele.click();
    });
}

document.addEventListener('keydown', function (event) {
    if (event.ctrlKey || event.shiftKey || event.altKey) {
        return;
    }
    if (event.key === ' ' && pauseButton.style.display !== 'none') {
        event.preventDefault();
        pauseButton.click();
    }
    if (event.key === 'r' && restartButton.style.display !== 'none') {
        restartButton.click();
    }
    if (event.key === 'Enter' && enterButton.style.display !== 'none') {
        event.preventDefault();
        enterButton.click();
    }
});

restartAddEvent();
pauseAddEvent();
work();