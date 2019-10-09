const DRAW = {
    'mountain': function (ctx, color, { x, y }) {
        ctx.clearRect(x, y, 50, 50);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + 0, y + 42);
        ctx.lineTo(x + 17, y + 10);
        ctx.lineTo(x + 32, y + 37);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + 27, y + 29);
        ctx.lineTo(x + 35, y + 19);
        ctx.lineTo(x + 50, y + 42);
        ctx.stroke();
    },
    'bridge': function (ctx, color, { x: y, y: x }, ins) {
        const WIDTH = 5;
        const AH = 12;
        const AW = 5;
        const LW = 0.5;
        const C = 25;
        const L = 15;
        ctx.clearRect(x, y, 50, 50);
        ctx.strokeStyle = '#000000';
        ctx.fillStyle = color;
        ctx.lineWidth = LW * 2;
        ctx.setTransform(1, 0, 0, -1, x + C, y + C);
        if (!ins.n && !ins.w && !ins.s && !ins.e) {
            ctx.beginPath();
            ctx.moveTo(-L, -L);
            ctx.lineTo(L, L);
            ctx.moveTo(L, -L);
            ctx.lineTo(-L, L);
            ctx.closePath();
            ctx.stroke();
        }
        else {
            let dirs = ['n', 'w', 's', 'e'];
            let revDirs = ['s', 'e', 'n', 'w'];
            let [[xx, xy], [yx, yy]] = [[1, 0], [0, 1]];
            function moveTo(x, y) {
                ctx.moveTo(x * xx + y * yx, x * xy + y * yy);
            }
            function lineTo(x, y) {
                ctx.lineTo(x * xx + y * yx, x * xy + y * yy);
            }
            function turn() {
                ([[xx, xy], [yx, yy]] = [[-xy, xx], [-yy, yx]]);
            }
            ctx.beginPath();
            moveTo(WIDTH, WIDTH);
            for (let i = 0; i < 4; i++) {
                if (ins[dirs[i]]) {
                    lineTo(WIDTH, C);
                    lineTo(-WIDTH, C);
                    lineTo(-WIDTH, WIDTH);
                }
                else if (ins[revDirs[i]]) {
                    lineTo(WIDTH, WIDTH + AH);
                    lineTo(0, 2 * WIDTH + AH);
                    lineTo(-WIDTH, WIDTH + AH);
                    lineTo(-WIDTH, WIDTH);
                }
                else {
                    lineTo(-WIDTH, WIDTH);
                }
                turn();
            }
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            for (let i = 0; i < 4; i++) {
                if (ins[dirs[i]]) {
                    moveTo(WIDTH + LW, WIDTH);
                    lineTo(WIDTH + LW, C);
                    moveTo(-WIDTH - LW, C);
                    lineTo(-WIDTH - LW, WIDTH);
                }
                else if (ins[revDirs[i]]) {
                    moveTo(WIDTH + LW, WIDTH);
                    lineTo(WIDTH + LW, WIDTH + AH);
                    moveTo(WIDTH + AW, WIDTH + AH - AW);
                    lineTo(0, 2 * WIDTH + AH);
                    lineTo(-WIDTH - AW, WIDTH + AH - AW);
                    moveTo(-WIDTH - LW, WIDTH + AH);
                    lineTo(-WIDTH - LW, WIDTH);
                }
                else {
                    moveTo(WIDTH + LW, WIDTH + LW);
                    lineTo(-WIDTH - LW, WIDTH + LW);
                }
                turn();
            }
            ctx.stroke();
        }
        ctx.setTransform();
    },
    'tower': function (ctx, color, { x: y, y: x }) {
        ctx.clearRect(x, y, 50, 50);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();

        ctx.moveTo(x + 25, y + 42);
        ctx.lineTo(x + 25, y + 35);
        ctx.moveTo(x + 8, y + 25);
        ctx.lineTo(x + 15, y + 25);
        ctx.moveTo(x + 25, y + 8);
        ctx.lineTo(x + 25, y + 15);
        ctx.moveTo(x + 42, y + 25);
        ctx.lineTo(x + 35, y + 25);

        ctx.moveTo(x + 42, y + 25);
        ctx.arc(x + 25, y + 25, 17, 0, 2 * Math.PI);

        ctx.moveTo(x + 35, y + 25);
        ctx.arc(x + 25, y + 25, 10, 0, 2 * Math.PI);

        ctx.closePath();
        ctx.stroke();
    },
    'water': function (ctx, color, { x: y, y: x }) {
        ctx.clearRect(x, y, 50, 50);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();

        ctx.arc(x + 25 - 12.5, y + 25 + Math.sqrt(3) * 12.5, 25, 4 * Math.PI / 3, 5 * Math.PI / 3, false);
        ctx.arc(x + 25 + 12.5, y + 25 - Math.sqrt(3) * 12.5, 25, -4 * Math.PI / 3, -5 * Math.PI / 3, true);

        ctx.stroke();
    },
    'born': function (ctx, color, { x: y, y: x }) {
        ctx.clearRect(x, y, 50, 50);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + 25 + 0, y + 25 - 20);
        ctx.lineTo(x + 25 - 4.49, y + 25 - 6.18);
        ctx.lineTo(x + 25 - 19.02, y + 25 - 6.18);
        ctx.lineTo(x + 25 - 7.27, y + 25 + 2.36);
        ctx.lineTo(x + 25 - 11.76, y + 25 + 16.18);
        ctx.lineTo(x + 25, y + 25 + 7.64);
        ctx.lineTo(x + 25 + 11.76, y + 25 + 16.18);
        ctx.lineTo(x + 25 + 7.27, y + 25 + 2.36);
        ctx.lineTo(x + 25 + 19.02, y + 25 - 6.18);
        ctx.lineTo(x + 25 + 4.49, y + 25 - 6.18);
        ctx.lineTo(x + 25 + 0, y + 25 - 20);
        ctx.closePath();
        ctx.stroke();
    }
}