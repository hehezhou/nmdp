// p.on('afterattackreach', (player, data) => {
// 	const W = 20;
// 	const H1 = 30;
// 	const H2 = 50;
// 	const A = Math.PI / 6;
// 	const R21 = 30;
// 	const R22 = 45;
// 	const R3 = 13;
// 	let special_shape = {
// 		1: (new Shape())
// 			.line(new V(H1, W / 2))
// 			.line(new V(H2, W / 2))
// 			.line(new V(H2, -W / 2))
// 			.line(new V(H1, -W / 2))
// 			.line(new V(H1, 0)),
// 		2: (new Shape())
// 			.line(V.fromAngle(A, R22))
// 			.arc({
// 				dest: V.fromAngle(-A, R22),
// 				circleCenter: new V(0, 0),
// 				isClockwise: true,
// 			})
// 			.line(V.fromAngle(-A, R21))
// 			.arc({
// 				dest: V.fromAngle(A, R21),
// 				circleCenter: new V(0, 0),
// 				isClockwise: false,
// 			}),
// 		3: (new Shape())
// 			.arc({
// 				dest: new V(2 * R3, 0),
// 				circleCenter: new V(R3, 0),
// 				isClockwise: false,
// 			})
// 			.arc({
// 				dest: new V(0, 0),
// 				circleCenter: new V(R3, 0),
// 				isClockwise: false,
// 			})
// 	}[this.part];
// 	player.modifyShapeTransform(special_shape);
// 	let { target } = data;
// 	if (special_shape.include(target.pos)) {
// 		let hited = (this._combo_hited.get(target) || 0) + 1;
// 		this._combo_hited.set(target, hited);
// 		if (hited === 3) {
// 			player.dealDamage(target, 80, { bloodSucking: 5 / 8 });
// 		}
// 	}
// });