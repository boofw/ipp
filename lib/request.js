var url = require('url'),
	parse = require('./parser');

module.exports = function(opts, buffer, cb){
	var streamed = typeof buffer === "function";
	//All IPP requires are POSTs- so we must have some data.
	//  10 is just a number I picked- this probably should have something more meaningful
	if(!Buffer.isBuffer(buffer) || buffer.length<10){
		return cb(new Error("Data required"));
	}
	if(typeof opts === "string")
		opts = url.parse(opts);
	if(!opts.port) opts.port = 631;

	if(!opts.headers) opts.headers = {};
	opts.headers['Content-Type'] = 'application/ipp';
	opts.method = "POST";
	
	if(opts.protocol==="ipp:")
		opts.protocol="http:";

	if(opts.protocol==="ipps:")
		opts.protocol="https:";

	// 构建请求URL
	var requestUrl = opts.protocol + '//' + (opts.hostname || opts.host) + ':' + opts.port;
	if(opts.path) requestUrl += opts.path;

	// 使用fetch进行请求
	fetch(requestUrl, {
		method: 'POST',
		headers: opts.headers,
		body: buffer
	})
	.then(async function(res) {
		// 处理100 Continue的情况
		if(res.status === 100) {
			if(opts.headers['Expect'] !== '100-Continue' || typeof opts.continue !== "function"){
				cb(new IppResponseError(res.status));
			} else {
				console.log("100 Continue");
				// 执行continue回调
				opts.continue();
			}
			return;
		}

		// 处理200 OK的情况
		if(res.status === 200) {
			// 读取响应体
			const arrayBuffer = await res.arrayBuffer();
			const responseBuffer = Buffer.from(arrayBuffer);
			const response = parse(responseBuffer);
			delete response.operation;
			cb(null, response);
			return;
		}

		// 其他状态码
		cb(new IppResponseError(res.status));
		console.log(res.status, "response");
	})
	.catch(function(err) {
		cb(err);
	});
};

function IppResponseError(statusCode, message) {
  this.name = 'IppResponseError';
  this.statusCode = statusCode;
  this.message = message || 'Received unexpected response status ' + statusCode + ' from the printer';
  this.stack = (new Error()).stack;
}
IppResponseError.prototype = Object.create(Error.prototype);
IppResponseError.prototype.constructor = IppResponseError;
