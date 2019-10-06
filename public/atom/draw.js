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
    'bridge': function (ctx, color, { x: y, y: x }, { n, e, w, s }) {
        
        let cnt = 0;
        if (n) cnt++;
        if (e) cnt++;
        if (w) cnt++;
        if (s) cnt++;
        ctx.clearRect(x, y, 50, 50);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        if (cnt >= 2) {
            if (n) {
                ctx.beginPath();
                ctx.moveTo(x + 22.5, y + 0);
                ctx.lineTo(x + 22.5, y + 23);
                ctx.moveTo(x + 27.5, y + 0);
                ctx.lineTo(x + 27.5, y + 23);
                ctx.closePath();
                ctx.stroke();
            }
            else {
                if (cnt === 3) {
                    ctx.beginPath();
                    ctx.moveTo(x + 25, y + 10);
                    ctx.lineTo(x + 17.5, y + 17.5);
                    ctx.moveTo(x + 25, y + 10);
                    ctx.lineTo(x + 32.5, y + 17.5);

                    ctx.moveTo(x + 25, y + 5);
                    ctx.lineTo(x + 18, y + 12);
                    ctx.moveTo(x + 25, y + 5);
                    ctx.lineTo(x + 32, y + 12);

                    ctx.moveTo(x + 22.5, y + 22);
                    ctx.lineTo(x + 22.5, y + 12);
                    ctx.moveTo(x + 27.5, y + 22);
                    ctx.lineTo(x + 27.5, y + 12);
                    ctx.closePath();
                    ctx.stroke();
                }
                else {
                    ctx.beginPath();
                    ctx.moveTo(x + 22, y + 22.5);
                    ctx.lineTo(x + 28, y + 22.5);
                    ctx.closePath();
                    ctx.stroke();
                }
            }
            if (s) {
                ctx.beginPath();
                ctx.moveTo(x + 22.5, y + 50);
                ctx.lineTo(x + 22.5, y + 27);
                ctx.moveTo(x + 27.5, y + 50);
                ctx.lineTo(x + 27.5, y + 27);
                ctx.closePath();
                ctx.stroke();
            }
            else {
                if (cnt === 3) {
                    ctx.beginPath();
                    ctx.moveTo(x + 25, y + 40);
                    ctx.lineTo(x + 17.5, y + 32.5);
                    ctx.moveTo(x + 25, y + 40);
                    ctx.lineTo(x + 32.5, y + 32.5);

                    ctx.moveTo(x + 25, y + 45);
                    ctx.lineTo(x + 18, y + 38);
                    ctx.moveTo(x + 25, y + 45);
                    ctx.lineTo(x + 32, y + 38);

                    ctx.moveTo(x + 22.5, y + 28);
                    ctx.lineTo(x + 22.5, y + 38);
                    ctx.moveTo(x + 27.5, y + 28);
                    ctx.lineTo(x + 27.5, y + 38);
                    ctx.closePath();
                    ctx.stroke();
                }
                else {
                    ctx.beginPath();
                    ctx.moveTo(x + 22, y + 27.5);
                    ctx.lineTo(x + 28, y + 27.5);
                    ctx.closePath();
                    ctx.stroke();
                }
            }
            if (w) {
                ctx.beginPath();
                ctx.moveTo(x + 0, y + 22.5);
                ctx.lineTo(x + 23, y + 22.5);
                ctx.moveTo(x + 0, y + 27.5);
                ctx.lineTo(x + 23, y + 27.5);
                ctx.closePath();
                ctx.stroke();
            }
            else {
                if (cnt === 3) {
                    ctx.beginPath();
                    ctx.moveTo(x + 10, y + 25);
                    ctx.lineTo(x + 17.5, y + 17.5);
                    ctx.moveTo(x + 10, y + 25);
                    ctx.lineTo(x + 17.5, y + 32.5);

                    ctx.moveTo(x + 5, y + 25);
                    ctx.lineTo(x + 12, y + 18);
                    ctx.moveTo(x + 5, y + 25);
                    ctx.lineTo(x + 12, y + 32);

                    ctx.moveTo(x + 22, y + 22.5);
                    ctx.lineTo(x + 12, y + 22.5);
                    ctx.moveTo(x + 22, y + 27.5);
                    ctx.lineTo(x + 12, y + 27.5);
                    ctx.closePath();
                    ctx.stroke();
                }
                else {
                    ctx.beginPath();
                    ctx.moveTo(x + 22.5, y + 22);
                    ctx.lineTo(x + 22.5, y + 28);
                    ctx.closePath();
                    ctx.stroke();
                }
            }
            if (e) {
                ctx.beginPath();
                ctx.moveTo(x + 50, y + 22.5);
                ctx.lineTo(x + 27, y + 22.5);
                ctx.moveTo(x + 50, y + 27.5);
                ctx.lineTo(x + 27, y + 27.5);
                ctx.closePath();
                ctx.stroke();
            }
            else {
                if (cnt == 3) {
                    ctx.beginPath();
                    ctx.moveTo(x + 40, y + 25);
                    ctx.lineTo(x + 32.5, y + 17.5);
                    ctx.moveTo(x + 40, y + 25);
                    ctx.lineTo(x + 32.5, y + 32.5);

                    ctx.moveTo(x + 45, y + 25);
                    ctx.lineTo(x + 38, y + 18);
                    ctx.moveTo(x + 45, y + 25);
                    ctx.lineTo(x + 38, y + 32);

                    ctx.moveTo(x + 28, y + 22.5);
                    ctx.lineTo(x + 38, y + 22.5);
                    ctx.moveTo(x + 28, y + 27.5);
                    ctx.lineTo(x + 38, y + 27.5);
                    ctx.closePath();
                    ctx.stroke();
                }
                else {
                    ctx.beginPath();
                    ctx.moveTo(x + 27.5, y + 22);
                    ctx.lineTo(x + 27.5, y + 28);
                    ctx.closePath();
                    ctx.stroke();
                }
            }
        }
        else if (cnt === 1) {
            if (n) {
                ctx.beginPath();
                ctx.moveTo(x + 25, y + 40);
                ctx.lineTo(x + 17.5, y + 32.5);
                ctx.moveTo(x + 25, y + 40);
                ctx.lineTo(x + 32.5, y + 32.5);

                ctx.moveTo(x + 25, y + 45);
                ctx.lineTo(x + 18, y + 38);
                ctx.moveTo(x + 25, y + 45);
                ctx.lineTo(x + 32, y + 38);

                ctx.moveTo(x + 22.5, y + 0);
                ctx.lineTo(x + 22.5, y + 38);
                ctx.moveTo(x + 27.5, y + 0);
                ctx.lineTo(x + 27.5, y + 38);
                ctx.closePath();
                ctx.stroke();
            }
            if (s) {
                ctx.beginPath();
                ctx.moveTo(x + 25, y + 10);
                ctx.lineTo(x + 17.5, y + 17.5);
                ctx.moveTo(x + 25, y + 10);
                ctx.lineTo(x + 32.5, y + 17.5);

                ctx.moveTo(x + 25, y + 5);
                ctx.lineTo(x + 18, y + 12);
                ctx.moveTo(x + 25, y + 5);
                ctx.lineTo(x + 32, y + 12);

                ctx.moveTo(x + 22.5, y + 50);
                ctx.lineTo(x + 22.5, y + 12);
                ctx.moveTo(x + 27.5, y + 50);
                ctx.lineTo(x + 27.5, y + 12);
                ctx.closePath();
                ctx.stroke();
            }
            if (w) {
                ctx.beginPath();
                ctx.moveTo(x + 40, y + 25);
                ctx.lineTo(x + 32.5, y + 17.5);
                ctx.moveTo(x + 40, y + 25);
                ctx.lineTo(x + 32.5, y + 32.5);

                ctx.moveTo(x + 45, y + 25);
                ctx.lineTo(x + 38, y + 18);
                ctx.moveTo(x + 45, y + 25);
                ctx.lineTo(x + 38, y + 32);

                ctx.moveTo(x + 0, y + 22.5);
                ctx.lineTo(x + 38, y + 22.5);
                ctx.moveTo(x + 0, y + 27.5);
                ctx.lineTo(x + 38, y + 27.5);
                ctx.closePath();
                ctx.stroke();
            }
            if (e) {
                ctx.beginPath();
                ctx.moveTo(x + 10, y + 25);
                ctx.lineTo(x + 17.5, y + 17.5);
                ctx.moveTo(x + 10, y + 25);
                ctx.lineTo(x + 17.5, y + 32.5);

                ctx.moveTo(x + 5, y + 25);
                ctx.lineTo(x + 12, y + 18);
                ctx.moveTo(x + 5, y + 25);
                ctx.lineTo(x + 12, y + 32);

                ctx.moveTo(x + 50, y + 22.5);
                ctx.lineTo(x + 12, y + 22.5);
                ctx.moveTo(x + 50, y + 27.5);
                ctx.lineTo(x + 12, y + 27.5);
                ctx.closePath();
                ctx.stroke();
            }
        }
        else if (cnt === 0) {
            ctx.beginPath();
            ctx.moveTo(x + 15, y + 15);
            ctx.lineTo(x + 35, y + 35);
            ctx.moveTo(x + 15, y + 35);
            ctx.lineTo(x + 35, y + 15);
            ctx.closePath();
            ctx.stroke();
        }
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
    'born': function (ctx, color, { x: y, y: x}) {
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