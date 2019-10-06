const fs = require('fs');
const http = require('http');
const path = require('path');
new RegExp('/^\\/$/');
const ableList = [
	/^\/$/,
	/^\/(paint-board|area-single|mosiyuan|area|atom|forty)(\/(([a-zA-Z_]+\.[a-zA-Z_]+)|)|)$/,
	/^\/lib\/([a-zA-Z_]+\.[a-zA-Z_]+)/,
	/^\/index\.html$/,
	/^\/?$/,
	/^\/sources\/(images)\/[a-zA-Z_]+\.[a-zA-Z_]+$/,
];
const regexp1 = /^\/(paint-board|area-single|mosiyuan|area|atom|forty)$/, regexp2 = /^\/(((paint-board|area-single|mosiyuan|area|atom|forty)\/)?)?$/;
const typeList = {
	'.css': { 'Content-Type': 'text/css;charset=utf-8' },
	'.html': { 'Content-Type': 'text/html;charset=utf-8' },
	'.js': { 'Content-Type': 'text/javascript;charset=utf-8' },
	'.ico': { 'Content-Type': 'image/x-icon;charset=utf-8' },
	'.png': { 'Content-Type': 'image/png;charset=utf-8' },
	'.cpp': { 'Content-Type': 'text/x-c;charset=utf-8' },
	'': { 'Content-Type': 'text/plain;charset=utf-8' },
};
module.exports = class WebServer {
	constructor() {
		this.server = http.createServer(async function (req, res) {
			let url = req.url.trim(), tag = 0;
			for (let i = 0; i < ableList.length; i++) {
				if (ableList[i].test(url)) { tag = 1; break; }
			}
			if (tag === 0) {
				res.writeHead(404, `404 not found`);
				res.end();
				return;
			}
			if (regexp1.test(url)) url += '/';
			if (regexp2.test(url)) url += 'index.html';
			url = './public' + url;
			fs.readFile(url, (err, data) => {
				if (err) res.writeHead(404, `404 not found`), res.end();
				else {
					for (let i in typeList) {
						if (url.indexOf(i) !== -1) {
							res.writeHead(200, typeList[i]);
							break;
						}
					}
					res.write(data);
					res.end();
				}
			});
		});
	}
	listen(port) {
		this.server.listen(port);
		return this;
	}
}