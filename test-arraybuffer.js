// 测试ArrayBuffer版本的IPP库
var ipp = require('./ipp.js');

// 测试1: 创建一个简单的ArrayBuffer数据
console.log('=== 测试1: 创建ArrayBuffer数据 ===');
var testData = new Uint8Array([
	0x02, 0x00, // version 2.0
	0x00, 0x0B, // Get-Printer-Attributes
	0x00, 0x00, 0x00, 0x01, // reqid
	0x01, // operation-attributes-tag
	0x47, 0x00, 0x12, // attributes-charset
	0x61, 0x74, 0x74, 0x72, 0x69, 0x62, 0x75, 0x74, 0x65, 0x73, 0x2d, 0x63, 0x68, 0x61, 0x72, 0x73, 0x65, 0x74, // "attributes-charset"
	0x00, 0x05, // length 5
	0x75, 0x74, 0x66, 0x2d, 0x38, // "utf-8"
	0x48, 0x00, 0x1b, // attributes-natural-language
	0x61, 0x74, 0x74, 0x72, 0x69, 0x62, 0x75, 0x74, 0x65, 0x73, 0x2d, 0x6e, 0x61, 0x74, 0x75, 0x72, 0x61, 0x6c, 0x2d, 0x6c, 0x61, 0x6e, 0x67, 0x75, 0x61, 0x67, 0x65, // "attributes-natural-language"
	0x00, 0x02, // length 2
	0x65, 0x6e, // "en"
	0x03 // end-of-attributes-tag
]);

var arrayBuffer = testData.buffer;

console.log('测试ArrayBuffer解析:');
try {
	var result = ipp.parse(arrayBuffer);
	console.log('解析成功:', JSON.stringify(result, null, 2));
} catch (e) {
	console.error('解析失败:', e.message);
}

// 测试2: 序列化测试
console.log('\n=== 测试2: 序列化测试 ===');
var msg = {
	version: '2.0',
	operation: 'Get-Printer-Attributes',
	id: 1,
	'operation-attributes-tag': {
		'attributes-charset': 'utf-8',
		'attributes-natural-language': 'en'
	}
};

try {
	var serialized = ipp.serialize(msg);
	console.log('序列化成功，返回ArrayBuffer，长度:', serialized.byteLength);

	// 验证序列化结果
	var parsed = ipp.parse(serialized);
	console.log('验证序列化结果:', JSON.stringify(parsed, null, 2));
} catch (e) {
	console.error('序列化失败:', e.message);
}

// 测试3: message.js 测试
console.log('\n=== 测试3: message.js 测试 ===');
var message = require('./lib/message.js');
var msgResult = message('localhost', 0x000B, 1);
console.log('message() 返回ArrayBuffer，长度:', msgResult.byteLength);
console.log('message() 返回类型:', msgResult.constructor.name);

// 测试4: 检查是否还有Buffer引用
console.log('\n=== 测试4: 检查Buffer使用 ===');
console.log('ArrayBuffer支持:', typeof ArrayBuffer !== 'undefined');
console.log('DataView支持:', typeof DataView !== 'undefined');
console.log('TextEncoder支持:', typeof TextEncoder !== 'undefined');
console.log('TextDecoder支持:', typeof TextDecoder !== 'undefined');

console.log('\n=== 所有测试完成 ===');
