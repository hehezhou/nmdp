module.exports.randomInteger = function randomInteger(max) {
	return Math.floor(Math.random() * max);
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