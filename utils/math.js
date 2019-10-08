module.exports.mid=function mid(a,b,c){
	return a<b?b<c?b:a<c?c:a:a<c?a:b<c?c:b;
};