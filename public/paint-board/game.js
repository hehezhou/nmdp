'use strict';
const io = new WebSocket(`wss://${location.host}/wss/`);
const SUCCESS = 1, LOST = 0;
const roomId = "paint1";
const colorList = [
    { r: 255, g: 255, b: 255 },
    { r: 192, g: 192, b: 192 },
    { r: 128, g: 128, b: 128 },
    { r: 64, g: 64, b: 64 },
    { r: 0, g: 0, b: 0 },
    { r: 255, g: 0, b: 0 },
    { r: 255, g: 128, b: 128 },
    { r: 255, g: 192, b: 192 },
    { r: 128, g: 64, b: 0 },
    { r: 255, g: 128, b: 0 },
    { r: 128, g: 128, b: 0 },
    { r: 255, g: 255, b: 0 },
    { r: 128, g: 255, b: 0 },
    { r: 0, g: 255, b: 0 },
    { r: 0, g: 255, b: 128 },
    { r: 0, g: 128, b: 128 },
    { r: 0, g: 255, b: 255 },
    { r: 192, g: 255, b: 255 },
    { r: 0, g: 128, b: 255 },
    { r: 0, g: 0, b: 255 },
    { r: 128, g: 128, b: 255 },
    { r: 128, g: 0, b: 255 },
    { r: 255, g: 0, b: 255 },
    { r: 255, g: 0, b: 128 },
    { r: 128, g: 0, b: 64 },
    { r: 64, g: 0, b: 0 },
    { r: 252, g: 239, b: 227 },
];
const maxDelta = 5;
const initColor = 0;
function send(x) {
    io.send(JSON.stringify(x));
}
const record = ((x, id, f) => ((message) => {
    if (!f) {
        document.body.appendChild(x);
        f = true;
    }
    x.innerText = message;
    if (id !== null) {
        clearTimeout(id);
    }
    id = setTimeout(() => {
        x.innerText = '';
        id = null;
    }, 5000);
}))(document.createElement('p'), null, false);
async function work() {
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
    send(['join', roomId]);
    if (await new Promise(function (resolve, reject) {
        io.addEventListener('message', function x(rec) {
            let data = JSON.parse(rec.data);
            if (!(['join_success', 'join_fail'].includes(data[0]))) return;
            if (data[0] !== 'join_success') {
                record('加入房间失败,原因: ' + data[1]);
                io.removeEventListener('message', x);
                resolve(LOST);
            }
            io.removeEventListener('message', x);
            resolve(SUCCESS);
        });
    }));
    let nowColor = initColor;
    let paint = await new Promise(async (resolve, reject) => {
        let array = await new Promise(function (resolve, reject) {
            io.addEventListener('message', function x(rec) {
                let data = JSON.parse(rec.data);
                if (data[0] === 'board') {
                    io.removeEventListener('message', x);
                    function cut(array, width) {
                        let result = [];
                        for (let i = 0; i < array.length; i += width) {
                            result.push(Array.from(array.slice(i, i + width)).map(x => parseInt(x, 36)));
                        }
                        return result;
                    }
                    resolve(cut(data[1].board, data[1].width));
                }
            });
        });
        let n, m, paint;
        n = array.length;
        m = array[0].length;
        let sumDelta;
        function canvaBox(height, width) {
            let box = document.createElement('div');
            let canvas = document.createElement('canvas');
            const toPx = value => value.toFixed(0) + 'px';
            canvas.height = height;
            box.style.height = toPx(height);
            box.style.width = toPx(width);
            canvas.width = width;
            box.style.overflow = 'hidden';
            canvas.style.position = 'relative';
            if (navigator.userAgent.indexOf('Firefox') > -1) canvas.style.imageRendering = 'crisp-edges';
            else canvas.style.imageRendering = 'pixelated';
            const RATIO = 2;
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
                    this._ratio = value;
                    canvas.style.width = toPx(value * width);
                },
                get x() {
                    return this._x;
                },
                set x(value) {
                    this._x = limit(0, value, height * (this._ratio - 1));
                    canvas.style.top = toPx(-this._x);
                },
                get y() {
                    return this._y;
                },
                set y(value) {
                    this._y = limit(0, value, width * (this._ratio - 1));
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
            control.ratio = 1;
            control.x = 0;
            control.y = 0;
            function fixPos({ x, y }) {
                let progress = control.ratio * width / canvas.offsetWidth;
                return {
                    x: x * progress,
                    y: y * progress,
                };
            }
            canvas.addEventListener('wheel', (event) => {
                let { offsetY: x, offsetX: y, deltaY, shiftKey } = event;
                if (shiftKey) {
                    return;
                }
                event.preventDefault();
                ({ x, y } = fixPos({ x, y }));
                let ratio = limit(1 / control.ratio, deltaY < 0 ? RATIO : 1 / RATIO, 64 / control.ratio);
                control.transition = true;
                control.ratio *= ratio;
                control.x += (ratio - 1) * x;
                control.y += (ratio - 1) * y;
            });
            canvas.addEventListener('mousemove', ({ buttons, movementY: x, movementX: y }) => {
                sumDelta += Math.abs(x) + Math.abs(y);
                ({ x, y } = fixPos({ x, y }));
                if (sumDelta <= maxDelta) return;
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
        }
        let canva = canvaBox(n, m), cxt = canva.canvas.getContext('2d');
        canva.box.style.border = '3px solid black';
        canva.canvas.addEventListener('mousedown', () => { sumDelta = 0; });
        document.body.appendChild(canva.box);
        paint = function ({ x, y, color }) {
            array[x][y] = color;
            let col = colorList[color];
            cxt.fillStyle = `rgb(${col.r},${col.g},${col.b})`;
            cxt.fillRect(y, x, 1, 1);
        }
        function init() {
            let imgData = cxt.createImageData(m, n);
            for (let i = 0; i < n; i++)
                for (let j = 0; j < m; j++) {
                    let id = (i * m + j) * 4;
                    ({ r: imgData.data[id], g: imgData.data[id + 1], b: imgData.data[id + 2] } = colorList[array[i][j]]);
                    imgData.data[id + 3] = 255;
                }
            cxt.putImageData(imgData, 0, 0);
        }
        init();
        canva.canvas.addEventListener('click', async function ({ offsetX: y, offsetY: x }) {
            ({ x, y } = canva.pos({ x, y }));
            x = Math.floor(x);
            y = Math.floor(y);
            event.preventDefault();
            if (sumDelta > maxDelta) return;
            send(['paint', { x, y, color: nowColor }]);
            await new Promise((resolve, reject) => {
                io.addEventListener('message', function x(rec) {
                    let data = JSON.parse(rec.data);
                    if (['paint_success', 'paint_fail'].includes(data[0])) {
                        io.removeEventListener('message', x);
                        if (data[0] === 'paint_success') resolve(SUCCESS);
                        else record("绘画失败,原因: " + data[1]), resolve(LOST);
                    }
                });
            });
        });
        resolve(paint)
    });
    (() => {
        function __gid(id) {
            return `_g_${id}`;
        }
        let div = document.createElement('div');
        colorList.forEach(function (data, index) {
            let btn = document.createElement('button');
            btn.id = __gid(index);
            btn.classList.add(index === nowColor ? 'nowColor' : 'color');
            btn['style']['background-color'] = `rgb(${data.r},${data.g},${data.b})`;
            btn.addEventListener('click', function () {
                document.getElementById(__gid(nowColor)).classList.remove('nowColor');
                document.getElementById(__gid(nowColor)).classList.add('color');
                nowColor = index;
                btn.classList.remove('color');
                btn.classList.add('nowColor');
            });
            div.appendChild(btn);
            document.body.appendChild(div);
        });
    })();
    io.addEventListener('message', (rec) => {
        let data = JSON.parse(rec.data);
        if (data[0] === 'update') {
            paint(data[1]);
        }
    });
    /**
     * @param {number} height
     * @param {number} width
     * @returns {{box:HTMLDivElement,canvas:HTMLCanvasElement,control:{transition:boolean,x:number,y:number,ratio:number}}}
     */

}
work();