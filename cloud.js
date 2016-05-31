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

	//check out current patient
	var patients = new AV.Query('Patients');
	patients.equalTo('user', request.user);
	patients.find({
		success: function(listPatient){
			if(listPatient.length != 1){
				console.log("cant find patient");
				for (var i = 0; i < listPatient.length; ++i) {
					console.log(JSON.stringify(listPatient[i]));
				}
				response.error("cant find patient");
			} else {
				console.log("current patient is " + JSON.stringify(listPatient[0]));

				//check out target report with current patient
				var reports = new AV.Query('Reports');
				reports.equalTo('idPatient', listPatient[0]);
				reports.equalTo('objectId', request.params.report);
				reports.find({
					success: function(listReport){
						if(listReport.length != 1){
							console.log("reports cnt is " + JSON.stringify(listReport.length));
							response.error("cant find report");
							for (var i = 0; i < listReport.length; ++i) {
								console.log(JSON.stringify(listReport[i]));
							}
						} else {
							console.log("current report is " + JSON.stringify(listReport[0]));

							//check out target doctor
							var docs = new AV.Query('DoctorPub');
							docs.include('CreateBy');
							docs.find({
								success: function(listDoc){
									var loc = Math.round(Math.random()*listDoc.length);
									console.log("chose doc is " + JSON.stringify(listDoc[loc]));

									//get user who create doctorPub
									console.log("chose user is " + JSON.stringify(listDoc[loc].get('CreateBy')));
									//set doctor to report and set report InCheck to 'true'
									listReport[0].fetchWhenSave(true);
									listReport[0].set('Doctor', listDoc[loc]);
									listReport[0].set('InCheck', true);

									//set acl to doc and patient
									var groupACL = new AV.ACL();
									groupACL.setReadAccess(listDoc[loc].get('CreateBy'), true);
									groupACL.setWriteAccess(listDoc[loc].get('CreateBy'), true);
									groupACL.setReadAccess(request.user, true);
									groupACL.setWriteAccess(request.user, true);
									listReport[0].setACL(groupACL);


									console.log("test");
									//save report to server
									listReport[0].save().then(function(report){
										console.log("now report is " + JSON.stringify(report));
										//success
										response.success(listDoc[loc]);
									}, function(e){
										response.error(e);
									});
									
								}, 
								error: function(e){
									response.error(e);
								}
							})
						}
					},
					error: function(e){
						response.error(e);
					}
				});
			}
		}, 
		error: function(e){
			console.log(JSON.stringify(e));
			response.error(e);
		}
	});


	// var docs = new AV.Query('Doctor');
	// docs.find({
	// 	success: function(listDoc){
	// 		var reportid = request.params.report;
	// 		console.log("report id is " + reportid);

	// 		if(request.user){
	// 			console.log("session token " + request.sessionToken);
	// 			console.log("user is "+request.user.getUsername());
	// 		}else{
	// 			response.error("this function need user info");
	// 		}

	// 		var reports = new AV.Query('Reports');
	// 		reports.count().then(function(cnt){
	// 			console.log("reports cnt is " + JSON.stringify(cnt));
	// 		}, function(e){
	// 			console.log(JSON.stringify(e));
	// 		})
			
	// 		reports.equalTo('objectId', reportid);
	// 		reports.equalTo('idPatient', request.user);
	// 		reports.find().then(function(report){
	// 			console.log(JSON.stringify(report));
	// 		}, function(e){
	// 			console.log("can not find report with id " + reportid);
	// 			//response.error("can not find report with id " + reportid);
	// 		});

	// 		// var sum = 0;
	// 		// for (var i = 0; i < listDoc.length; ++i) {
	// 		// 	console.log(JSON.stringify(listDoc[i]));
	// 		// }
	// 		var loc = Math.round(Math.random()*listDoc.length);

	// 		console.log("doc cnt is " + JSON.stringify(listDoc.length));
	// 		// response.success("doc cnt is " + JSON.stringify(listDoc.length));

	// 		console.log(JSON.stringify(listDoc[loc]));
	// 		//response.success(listDoc[loc]);
	// 	},
	// 	error: function(e){
	// 		console.log(JSON.stringify(e));
	// 		response.error(e);
	// 	}
	// })
});


module.exports = AV.Cloud;
