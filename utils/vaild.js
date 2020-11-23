function formatMinMax(range) {
	return typeof range === 'number'
		? {
			min: range,
			max: range,
		}
		: range;
}

class InvalidError extends Error {
	constructor(message = '') {
		super(message);
	}
}
module.exports.InvaildError = InvalidError;

module.exports.integer = function integer(input, options = {}) {
	const { min = -Infinity, max = Infinity, hint = 'input', allows = [] } = options;
	if ((typeof input === 'number'
		&& Number.isInteger(input)
		&& input >= min
		&& input <= max) || allows.includes(input)) {
		return input;
	}
	else {
		throw new InvalidError(`${hint} must be an integer between ${min} and ${max}`);
	}
};
module.exports.real = function real(input, options = {}) {
	const { min = -Infinity, max = Infinity, hint = 'input', allows = [] } = options;
	if ((typeof input === 'number'
		&& !Number.isNaN(input)
		&& input >= min
		&& input <= max) || allows.includes(input)) {
		return input;
	}
	else {
		throw new InvalidError(`${hint} must be an number between ${min} and ${max}`);
	}
};
module.exports.array = function array(input, options = {}) {
	const { length = {}, hint = 'input' } = options;
	const { min = 0, max = Infinity } = formatMinMax(length);
	if (input instanceof Array
		&& input.length >= min
		&& input.length <= max) {
		return input;
	}
	else {
		throw new InvalidError(`${hint} must be an array with length between ${min} and ${max}`);
	}
};
module.exports.string = function string(input, options = {}) {
	const { length = {}, hint = 'input' } = options;
	const { min = 0, max = Infinity } = formatMinMax(length);
	if (typeof input === 'string'
		&& input.length >= min
		&& input.length <= max) {
		return input;
	}
	else {
		throw new InvalidError(`${hint} must be an string with length between ${min} and ${max}`);
	}
};
module.exports.boolean = function boolean(input, options = {}) {
	const { hint = 'input' } = options;
	if (typeof input !== 'boolean') {
		throw new InvalidError(`${hint} must be an boolean`);
	}
	return input;
};
module.exports.object = function object(input, options = {}) {
	const { hint = 'input' } = options;
	if (typeof input !== 'object') {
		throw new InvalidError(`${hint} must be an object`);
	}
	return input;
};