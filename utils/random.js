module.exports.randomInteger = function randomInteger(a1, a2) {
	if (a2 === undefined) {
		return Math.floor(Math.random() * a1);
	}
	else {
		return Math.floor(a1 + Math.random() * (a2 - a1));
	}
};
module.exports.randomReal = function randomReal(min, max) {
	return min + Math.random() * (max - min);
}
module.exports.randomPick = function randomPick(iterable) {
	let result;
	let weight = -Infinity;
	for (const element of iterable) {
		let elementWeight = Math.random();
		if (elementWeight > weight) {
			result = element;
			weight = elementWeight;
		}
	}
	return result;
}
module.exports.noiseGen = function noiseGen(seed = Math.random(), cnt = 5, r = 1.1) {
	const C = seed * 1000;
	function np(x) {
		let result = 0;
		for (let i = 1; i <= cnt; i++) {
			let p = r ** i;
			result += Math.sin(x * p) / p;
		}
		return result / (1 - 1 / r ** cnt);
	}
	function noise(x, y) {
		let result = 0;
		for (let i = 0; i < cnt; i++) {
			let angle = i / cnt * 2 * Math.PI;
			let ca = Math.cos(angle);
			let sa = Math.sin(angle);
			let xx = x * ca - y * sa;
			let yy = y * ca + x * sa;
			result += np(C + np(C + xx / (2 * Math.PI)) * 2 + yy / (2 * Math.PI));
		}
		return result / cnt;
	}
	return noise;
}