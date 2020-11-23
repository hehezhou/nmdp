const { EventEmitter } = require('events');
/**
 * Event: `end` 游戏结束
 */
module.exports = class Game extends EventEmitter {
	/**
	 * @param {object} settings 设置
	 */
	constructor(settings) { super(settings); }
	/**
	 * 询问玩家能否加入游戏
	 * @param {string} id 玩家 ID
	 * @returns {boolean} 玩家能否加入游戏
	 */
	canJoin(id) {
		throw new Error('no canJoin method');
	}
	/**
	 * 玩家加入游戏
	 * @param {string} id 玩家 ID
	 * @param {(data:object)=>void} callback 该玩家的输出回调函数
	 */
	join(id, callback) { }
	/**
	 * 玩家离开游戏
	 * @param {string} id 玩家 ID
	 */
	leave(id) { }
	/**
	 * 玩家给出输入
	 * @param {string} id 玩家 ID
	 * @param {any} input 输入
	 */
	input(id, input) { }
	/**
	 * 将当前时间设为 `timeStamp`
	 * @param {number} timeStamp 时间戳
	 */
	setTime(timeStamp) { }
	/**
	 * 序列化
	 * @returns {string} 序列化结果
	 */
	serialization() {
		throw new Error('no serialization method');
	}
	/**
	 * 反序列化，不保存玩家连接的 `WebSocket`
	 * @param {string} data 序列化结果
	 * @returns {Game} 游戏对象
	 */
	static unserialization(data) {
		throw new Error('no unserialization method');
	}
};