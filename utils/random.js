module.exports.randomInteger=function randomInteger(max){
	return Math.floor(Math.random()*max);
};
module.exports.randomReal=function randomReal(min,max){
	return min+Math.random()*(max-min);
}