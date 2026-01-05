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

	// 使用wx.request进行请求
	wx.request({
		url: requestUrl,
		method: 'POST',
		header: opts.headers,
		data: buffer,
		success: function(res) {
			// 处理100 Continue的情况
			if(res.statusCode === 100) {
				if(opts.headers['Expect'] !== '100-Continue' || typeof opts.continue !== "function"){
					cb(new IppResponseError(res.statusCode));
				} else {
					console.log("100 Continue");
					// 执行continue回调
					opts.continue();
				}
				return;
			}

			// 处理200 OK的情况
			if(res.statusCode === 200) {
				// wx.request返回的data可能是ArrayBuffer或字符串，需要转换为Buffer
				let responseBuffer;
				if (res.data instanceof ArrayBuffer) {
					responseBuffer = Buffer.from(res.data);
				} else if (typeof res.data === 'string') {
					responseBuffer = Buffer.from(res.data, 'binary');
				} else if (Buffer.isBuffer(res.data)) {
					responseBuffer = res.data;
				} else {
					// 如果是其他类型，尝试转换
					responseBuffer = Buffer.from(JSON.stringify(res.data));
				}

				const response = parse(responseBuffer);
				delete response.operation;
				cb(null, response);
				return;
			}

			// 其他状态码
			cb(new IppResponseError(res.statusCode));
			console.log(res.statusCode, "response");
		},
		fail: function(err) {
			cb(err);
		}
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
