module.exports=class V{
	constructor(x=0,y=0){
		this.x=x;
		this.y=y;
	}
	clone({x,y}){
		return new V(x,y);
	}
	addM({x,y}){
		this.x+=x;
		this.y+=y;
	}
	add({x,y}){
		return new V(this.x+x,this.y+y);
	}
	subM({x,y}){
		this.x-=x;
		this.y-=y;
	}
	sub({x,y}){
		return new V(this.x-x,this.y-y);
	}
	mulM(a){
		this.x*=a;
		this.y*=a;
	}
	mul(a){
		return new V(this.x*a,this.y*a);
	}
	get sqrlen(){
		return this.x**2+this.y**2;
	}
	get len(){
		return Math.sqrt(this.sqrlen);
	}
	get angle(){
		let angle=Math.atan2(this.y,this.x);
		return angle>=0?angle:angle+2*Math.PI;
	}
	static fromAngle(angle){
		return new V(Math.cos(angle),Math.sin(angle));
	}
};