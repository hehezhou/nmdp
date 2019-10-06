makeObject=function makeObject(callback){
	let result={};
	callback((key,value)=>result[key]=value);
	return result;
}
makeArray=function makeArray(callback){
	let result=[];
	callback((...values)=>result.push(...values));
	return result;
}
makeSet=function makeSet(callback){
	let result=new Set();
	callback(value=>result.add(value));
	return result;
}