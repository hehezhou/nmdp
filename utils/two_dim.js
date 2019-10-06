module.exports.map=function map(array,callback){
	return array.map((line,index1)=>line.map((value,index2)=>callback(value,index1,index2,array)));
}
module.exports.forEach=function forEach(array,callback){
	array.forEach((line,index1)=>line.forEach((value,index2)=>callback(value,index1,index2,array)));
}
module.exports.build=function build(height,width,callback){
	let result=[];
	for(let x=0;x<height;x++){
		let line=[];
		for(let y=0;y<width;y++){
			line.push(callback(x,y));
		}
		result.push(line);
	}
	return result;
}
module.exports.cut=function cut(array,width){
	let result=[];
	for(let i=0;i<array.length;i+=width){
		result.push(array.slice(i,i+width));
	}
	return result;
}
module.exports.flat=function flat(array){
	let result=[];
	array.forEach(line=>{
		result.push(...line);
	});
	return result;
}