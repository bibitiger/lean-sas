var AV = require('leanengine');

/**
 * 一个简单的云代码方法
 */
AV.Cloud.define('hello', function(request, response) {
	console.log("func hello "+request.toJson());
  	response.success('Hello world!');
});

module.exports = AV.Cloud;
