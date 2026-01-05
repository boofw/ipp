

var tag = require('./tags');


function msg(host, operation, id){
	var buffer = new ArrayBuffer(1024);
	var dataView = new DataView(buffer);
	var position = 0;

	// 扩展缓冲区的辅助函数
	function ensureCapacity(length){
		if (position + length > buffer.byteLength) {
			var newBuffer = new ArrayBuffer(Math.max(buffer.byteLength * 2, position + length));
			var newView = new DataView(newBuffer);
			// 复制现有数据
			for (var i = 0; i < position; i++) {
				newView.setUint8(i, dataView.getUint8(i));
			}
			buffer = newBuffer;
			dataView = newView;
		}
	}

	function write1(val){
		ensureCapacity(1);
		dataView.setUint8(position, val);
		position+=1;
	}
	function write2(val){
		ensureCapacity(2);
		dataView.setUint16(position, val, false); // false表示大端序
		position+=2;
	}
	function write4(val){
		ensureCapacity(4);
		dataView.setUint32(position, val, false); // false表示大端序
		position+=4;
	}
	function write(str){
		// 计算UTF-8编码的字节长度
		var encoder = new TextEncoder();
		var bytes = encoder.encode(str);
		var length = bytes.length;

		write2(length);
		ensureCapacity(length);

		// 写入字节
		for (var i = 0; i < length; i++) {
			dataView.setUint8(position + i, bytes[i]);
		}
		position += length;
	}
	function attr(tag, name, values){
		write1(tag);
		write(name);
		for(var i=0;i<values.length;i++){
			write(values[i]);
		}
	}
	//http://tools.ietf.org/html/rfc2910#section-3.1.1
	//	-----------------------------------------------
	//	|                  version-number             |   2 bytes  - required
	//	-----------------------------------------------
	//	|               operation-id (request)        |
	//	|                      or                     |   2 bytes  - required
	//	|               status-code (response)        |
	//	-----------------------------------------------
	//	|                   request-id                |   4 bytes  - required
	//	-----------------------------------------------
	//	|                 attribute-group             |   n bytes - 0 or more
	//	-----------------------------------------------
	//	|              end-of-attributes-tag          |   1 byte   - required
	//	-----------------------------------------------
	//	|                     data                    |   q bytes  - optional
	//	-----------------------------------------------

	write2(0x0200);//version 2.0
	write2(operation);
	write4(id);//request-id

	//the required stuff...
	write1(tag['operation-attributes-tag']);//0x01
	attr(tag.charset, 'attributes-charset', ['utf-8']);
	attr(tag.naturalLanguage, 'attributes-natural-language', ['en-us']);
	attr(tag.uri, 'printer-uri', ['ipp://'+host]);

	write1(0x03);//end

	// 返回实际使用的ArrayBuffer
	var resultBuffer = new ArrayBuffer(position);
	var resultView = new DataView(resultBuffer);
	for (var i = 0; i < position; i++) {
		resultView.setUint8(i, dataView.getUint8(i));
	}
	return resultBuffer;
}

module.exports = msg;
