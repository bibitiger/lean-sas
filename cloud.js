/**
 * @Author   bibitiger
 * @DateTime 2016-05-30T15:13:19+0800
 * @description define cloud functions for 呼吸康test by avoscloud
 */

var AV = require('leanengine');

/**
 * 一个简单的云代码方法
 */
AV.Cloud.define('hello', function(request, response) {
	console.log("func hello "+JSON.stringify(request.params));
	if(request.user){
		console.log("session token " + request.sessionToken);
		console.log("user is "+request.user.getUsername());
	}else{
		console.log("user is nil");
	}

  	response.success('Hello world!');
});

/**
 * @Author   bibitiger
 * @DateTime 2016-05-30T15:13:19+0800
 * @description for client to request a doctor due with report, if by now no useful doc will return response with "no useful doctor"
 */
AV.Cloud.define('RquestDoctor', function(request, response) {
	var docs = new AV.Query('Doctor');
	docs.find({
		success: function(listDoc){
			var sum = 0;
			for (var i = 0; i < listDoc.length; ++i) {
				console.log(JSON.stringify(listDoc[i]));
			}
			var loc = Math.round(Math.random()*listDoc.length);

			console.log("doc cnt is " + JSON.stringify(listDoc.length));
			// response.success("doc cnt is " + JSON.stringify(listDoc.length));

			console.log(JSON.stringify(listDoc[loc]));
			response.success(listDoc[loc]);
		},
		error: function(e){
			console.log(JSON.stringify(e));
			response.error(e);
		}
	})
});


module.exports = AV.Cloud;
