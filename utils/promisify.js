const isError = result => result instanceof Error;
function promisify(f,thisArg) {
	return (...args) => new Promise((resolve, reject) => {
		const callback=(...results)=>{
			if (results.some(isError)) {
				reject(results.find(isError));
			}
			resolve(results.find(result => result !== null && result !== undefined));
		};
		f.call(thisArg,...args,callback);
	});
};
module.exports=promisify;