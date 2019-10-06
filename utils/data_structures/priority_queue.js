class PriorityQueue {
	/** 
	 * @param {<T>(a:T,b:T)=>boolean} compare 比较函数。若 `a` 优先于 `b` 返回 `true`，否则返回 `false`
	 * @param {any[]} initList 初始列表
	 */
	constructor(compare = (a, b) => a < b, initList = []) {
		this.compare = compare;
		let l = initList.length;
		this.list = new Array(l);
		let x = (l - 2) >> 1;
		for (let i = l - 1; i !== x; i--) {
			this.list[i] = initList[i];
		}
		for (let i = x; i !== -1; i--) {
			this.fall(i, initList[i]);
		}
	}
	fall(now, value) {
		while (true) {
			let ls = (now << 1) + 1;
			let rs = ls + 1;
			if (ls >= this.list.length) {
				break;
			}
			let lv = this.list[ls];
			if (rs < this.list.length) {
				let rv = this.list[rs];
				if (this.compare(lv, value) || this.compare(rv, value)) {
					if (this.compare(lv, rv)) {
						this.list[now] = lv;
						now = ls;
					}
					else {
						this.list[now] = rv;
						now = rs;
					}
				}
				else {
					break;
				}
			}
			else {
				if (this.compare(lv, value)) {
					this.list[now] = lv;
					now = ls;
				}
				else {
					break;
				}
			}
		};
		this.list[now] = value;
	}
	/**
	 * @param {any} value 将元素插入优先队列
	 */
	push(value) {
		let now = this.list.length;
		while (now !== 0) {
			let fa = (now - 1) >> 1;
			let node = this.list[fa];
			if (this.compare(value, node)) {
				this.list[now] = node;
				now = fa;
			}
			else {
				break;
			}
		}
		this.list[now] = value;
	}
	/**
	 * @returns {any} 返回优先级最高的元素
	 */
	top() {
		return this.list[0];
	}
	/**
	 * 删除优先级最高的元素
	 */
	pop() {
		if(this.list.length===1){
			this.list.pop();
		}
		else{
			this.fall(0, this.list.pop());
		}
	}
};
module.exports = PriorityQueue;