const promisify=require('../utils/promisify.js');
const fs=require('fs');
const crypto=require('crypto');
const vaild=require('../utils/vaild.js');
const SESSION_TOKEN_EXPIRE_TIME=60*1000;
class User{
	constructor(){
		this.sessions=new Map();
		this.ops=0;
	}
	async init(){
		this.salt=await promisify(fs.readFile)('./user/salt.dat',{encoding:'utf-8'});
		this.users=new Set((await promisify(fs.readFile)('./user/users.dat',{encoding:'utf-8'})).split('\n').filter(h=>h.length===64));
	}
	register(username,password){
		throw new Error('No way!');
	}
	encode(username,password){
		if(username.includes('\n')){
			throw new Error('Why?');
		}
		if(password.includes('\n')){
			throw new Error('Why?');
		}
		let hash=crypto.createHmac('sha256',this.salt);
		hash.update(username);
		hash.update('\n');
		hash.update(password);
		return hash.digest('hex');
	}
	clean(){
		this.ops+=2;
		if(this.ops>=this.sessions.size){
			this.ops=0;
			let now=Date.now();
			let deletes=[];
			this.sessions.forEach(({expire},token)=>{
				if(now>=expire){
					deletes.push(token);
				}
			});
			deletes.forEach(token=>{
				this.sessions.delete(token);
			});
		}
	}
	login(username,password){
		let nm=vaild.string(username,{length:{min:3,max:20},hint:'username'});
		let pw=vaild.string(password,{length:{min:6,max:64},hint:'password'});
		let x=this.encode(nm,pw);
		if(!this.users.has(x)){
			throw new Error('username or password is wrong');
		}
		let g=[];
		crypto.randomBytes(32).forEach(x=>g.push((x>>4).toString(16),(x&0xf).toString(16)));
		let token=g.join('');
		this.sessions.set(token,{
			username:nm,
			expire:Date.now()+SESSION_TOKEN_EXPIRE_TIME,
		});
		this.clean();
		return token;
	}
	getSession(token){
		this.clean();
		let session=this.sessions.get(token);
		if(session===undefined){
			return undefined;
		}
		if(Date.now()>=session.expire){
			this.sessions.delete(token);
			return undefined;
		}
		return session;
	}
	startExpire(token){
		let session=this.getSession(token);
		if(session!==undefined){
			session.expire=Date.now()+SESSION_TOKEN_EXPIRE_TIME;
		}
	}
	stopExpire(token){
		let session=this.getSession(token);
		if(session!==undefined){
			session.expire=Infinity;
		}
	}
	getUsername(token){
		let session=this.getSession(token);
		if(session===undefined){
			throw new Error('Why?');
		}
		return session.username;
	}
};
module.exports=User;