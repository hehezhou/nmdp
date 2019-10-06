const vaild = 
(() => {
	function formatMinMax(range) {
		return typeof range === 'number'
			? {
				min: range,
				max: range,
			}
			: range;
	}
	let ans = {};
	ans.integer = function integer(input, options = {}) {
		const { min = -Infinity, max = Infinity, hint = 'input', allows = [] } = options;
		if (typeof input === 'string') {
			input = Number(input);
		}
		if (typeof input === 'number'
			&& (Number.isInteger(input)
				&& input >= min
				&& input <= max) || allows.includes(input)) {
			return input;
		}
		else {
			throw new Error(`${hint} must be an integer between ${min} and ${max}`);
		}
	}
	ans.array = function array(input, options = {}) {
		const { length = {}, hint = 'input' } = options;
		const { min = 0, max = Infinity } = formatMinMax(length);
		if (!(input instanceof Array) && ('length' in input)) {
			input = Array.from(input);
		}
		if (input instanceof Array
			&& input.length >= min
			&& input.length <= max) {
			return input;
		}
		else {
			throw new Error(`${hint} must be an array with length between ${min} and ${max}`);
		}
	}
	ans.string = function string(input, options = {}) {
		const { length = {}, hint = 'input' } = options;
		const { min = 0, max = Infinity } = formatMinMax(length);
		if (typeof input === 'number') {
			input = input.toString();
		}
		if (typeof input === 'string'
			&& input.length >= min
			&& input.length <= max) {
			return input;
		}
		else {
			throw new Error(`${hint} must be an string with length between ${min} and ${max}`);
		}
	}
	ans.boolean = function boolean(input, options = {}) {
		const { hint = 'input' } = options;
		if (typeof input === 'string') {
			input = ['false', 'true'].indexOf(input);
		}
		if (typeof input === 'number') {
			if (input === 0)
				input = false;
			else if (input === 1)
				input = true;
		}
		if (typeof input !== 'boolean') {
			throw new Error(`${hint} must be an boolean`);
		}
		return input;
	}
	ans.object = function object(input, options = {}) {
		const { hint = 'input' } = options;
		if (typeof input !== 'object') {
			throw new Error(`${hint} must be an object`);
		}
		return input;
	}
	return ans;
})();