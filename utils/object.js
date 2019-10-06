module.exports.findValueIndex=function findIndex(object,value){
	for(let key in object){
		if(object[key]===value){
			return key;
		}
	}
}
module.exports.size=function size(object){
	return Object.keys(object).length;
}