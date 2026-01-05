var parse = require('./parser');

module.exports = function(opts, buffer, cb){
	// 检查buffer是否为ArrayBuffer或TypedArray
	var isArrayBuffer = buffer instanceof ArrayBuffer;
	var isTypedArray = buffer && buffer.buffer instanceof ArrayBuffer;

	if(!isArrayBuffer && !isTypedArray){
		return cb(new Error("Data required"));
	}

	// 如果是TypedArray，获取其ArrayBuffer
	if(isTypedArray) {
		buffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
	}

	// 检查buffer长度
	if(buffer.byteLength < 10){
		return cb(new Error("Data required"));
	}

	if (typeof opts === "string") {
		const u = new URL(opts);
		opts = {
			protocol: u.protocol,
			hostname: u.hostname,
			port: u.port,
			pathname: u.pathname,
		}
	}
	if(!opts.port) opts.port = 631;
	if(!opts.headers) opts.headers = {};
	opts.headers['Content-Type'] = 'application/ipp';
	opts.method = "POST";
	if (opts.protocol==="ipp:") opts.protocol="http:";
	if (opts.protocol==="ipps:") opts.protocol="https:";
	// 构建请求URL
	var requestUrl = opts.protocol + '//' + opts.hostname + ':' + opts.port + opts.pathname;

	// 使用wx.request进行请求
	wx.request({
		url: requestUrl,
		method: 'POST',
		header: opts.headers,
		data: buffer,
		responseType: 'arraybuffer',
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
				// wx.request返回的data是ArrayBuffer
				let responseArrayBuffer;
				if (res.data instanceof ArrayBuffer) {
					responseArrayBuffer = res.data;
				} else if (typeof res.data === 'string') {
					// 如果是字符串，转换为ArrayBuffer
					const encoder = new TextEncoder();
					responseArrayBuffer = encoder.encode(res.data).buffer;
				} else {
					// 其他情况，尝试转换
					try {
						const str = JSON.stringify(res.data);
						const encoder = new TextEncoder();
						responseArrayBuffer = encoder.encode(str).buffer;
					} catch(e) {
						cb(new Error("Unable to convert response data to ArrayBuffer"));
						return;
					}
				}

				const response = parse(responseArrayBuffer);
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
