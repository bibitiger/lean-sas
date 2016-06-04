/**
 * @Author   bibitiger
 * @DateTime 2016-05-30T15:13:19+0800
 * @description define cloud functions for 呼吸康test by avoscloud
 */

var AV = require('leanengine');
var uuid = require('node-uuid');

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
				return;
			} else {
				console.log("current patient is " + JSON.stringify(listPatient[0]));

				//check out target report with current patient
				var reports = new AV.Query('Reports');
				reports.equalTo('idPatient', listPatient[0]);
				reports.equalTo('objectId', request.params.report);
				reports.include('Doctor');
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
									var loc = Math.round(Math.random()*(listDoc.length-1));
									console.log("chose doc is " + JSON.stringify(listDoc[loc]));

									if(listReport[0].get('Doctor')){
										response.error("this report has been assigned to a doctor");
										return;
									}

									//get user who create doctorPub
									console.log("chose user is " + JSON.stringify(listDoc[loc].get('CreateBy')));
									//set doctor to report and set report InCheck to 'true'
									listReport[0].fetchWhenSave(true);
									listReport[0].set('Doctor', listDoc[loc]);
									listReport[0].set('CheckState', "WaitDoc");
									listReport[0].set('CheckId', uuid.v1());
									listReport[0].set('CheckStateChangeTime', new Date());

									//set acl to doc and patient
									var groupACL = new AV.ACL();
									groupACL.setPublicReadAccess(true);
									groupACL.setReadAccess(request.user, true);
									groupACL.setWriteAccess(request.user, true);
									listReport[0].setACL(groupACL);


									console.log("test");
									//save report to server
									listReport[0].save().then(function(report){
										console.log("now report is " + JSON.stringify(report));
										console.log("doc user id is " + listDoc[loc].get('CreateBy').get('objectId'));
										var history = AV.Object.new('ReportCheckHistory');
										history.set('Report', report);
										history.set('Note', "requst by user " + request.user.get('objectId'));
										history.set('CheckId', report.get('CheckId'));
										history.set('Doctor', listDoc[loc]);
										history.set('state', "AssignedToDoc");
										history.save().then(function(history){
											//push msg to doc
											AV.Push.send({
												channels: [listDoc[loc].get('CreateBy').get('objectId')],
												data: {
													alert: 'new report'
												}
											});

											//success
											response.success(listDoc[loc]);
										},
										function(e){
											response.error(e);
										});
										
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
});

/**
 * @Author   bibitiger
 * @DateTime 2016-06-01T15:07:50+0800
 * @description for client to Login with Weixin
 */
AV.Cloud.define('WXLogin', function(request, response) {
	var openId = request.params.openId;
	var access_token = request.params.access_token;
	var expires_in = request.params.expires_in;

	// console.log('test:' + openId + access_token + expires_in);

	// var authData = {'openid': openId,'access_token': access_token,'expires_in': expires_in};
	var data = {};


	AV.User._logInWith('WeiXin', {
	  'authData': {
		    'uid': openId,
		    'access_token': access_token,
		    'expires_in': expires_in
		  }
	}).then(function(user) {
	  //返回绑定后的用户
	    console.log('user:' + user);
	    var query = new AV.Query('Patients');
	    query.equalTo('user', user);
	    query.find().then(function(results) {
	        
	        if(results.length < 1){
	                console.log('lenght0');
	                var Patient = AV.Object.extend('Patients');
	    
	                var patient = new Patient();
	                // patient.set('objectId',user.id);
	                patient.set('user',user)
	                
	                // 新建一个 ACL 实例
	                var acl = new AV.ACL();
	                acl.setPublicReadAccess(true);
	                acl.setWriteAccess(user,true);
	                  // 将 ACL 实例赋予 patient 对象
	                patient.setACL(acl);
	                
	                patient.save().then(function(patient) {
	                    // 成功保存之后，执行其他逻辑.
	                    
	                    data['profileId'] = patient.id;
	                    data['user'] = user;
	                    data['sessionToken'] = user._sessionToken;
	                    data['userId'] = user.id;
	                    
	                    response.success(data);
	                }, function(err) {
	                    // 失败之后执行其他逻辑
	                    // error 是 AV.Error 的实例，包含有错误码和描述信息.
	                    console.log('Failed to create new object, with error message: ' + err.message);
	                    response.error(err);
	                });
	        }else{
	            console.log('lenght1');
	            var profile = results[0];
	            
	            data['userId'] = user.id;
	            data['profileId'] = profile.id;
	            data['sessionToken'] = user._sessionToken;
	            data['user'] = user;
	            //...
	            response.success(data);   
	        }
	    }, function(error) {
	        console.log('Error: ' + error.code + ' ' + error.message);
	        response.error(error);
	        
	    });

	}, function(error) {
	  console.log(error);
	  response.error(error);
	});
});

/**
 * @Author   bibitiger
 * @DateTime 2016-06-01T15:07:50+0800
 * @description for client to Login with phone
 */
AV.Cloud.define('login', function(request, response) {
	var phoneNumber = request.params.phoneNumber;
	var password = request.params.password;

	// console.log(phoneNumber + '---' + password);

	var data = {};

	AV.User.logInWithMobilePhone(phoneNumber, password).then(function(user) {
	  //登录成功
	    var query = new AV.Query('Patients');
	    query.equalTo('user', user);
	    query.find().then(function(results) {
	        
	        if(results.length > 0){
	                var profile = results[0];
	                
	                data['userId'] = user.id;
	                data['profileId'] = profile.id;
	                data['sessionToken'] = user._sessionToken;
	                data['user'] = user;
	                //...
	                response.success(data);            
	        }else{
	                var Patient = AV.Object.extend('Patients');
	                var patient = new Patient();
	                patient.set('user',user)
	                
	                 // 新建一个 ACL 实例
	                var acl = new AV.ACL();
	                acl.setPublicReadAccess(true);
	                acl.setWriteAccess(user,true);
	                  // 将 ACL 实例赋予 patient 对象
	                patient.setACL(acl);
	            
	                patient.save().then(function(patient) {
	                    
	                    data['userId'] = user.id;
	                    data['profileId'] = patient.id;
	                    data['sessionToken'] = user._sessionToken;
	                    data['user'] = user;
	                    //...
	                    response.success(data); 
	                }, function(err) {
	                    
	                    console.log('Failed to create new object, with error message: ' + err.message);
	                    response.error(err);
	                });
	        }

	    }, function(error) {
	        console.log('Error: ' + error.code + ' ' + error.message);
	    });
	  
	}, function(err) {
	  //登录失败
	  response.error(err);
	});
});

/**
 * @Author   bibitiger
 * @DateTime 2016-06-01T15:07:50+0800
 * @description 
 */
AV.Cloud.define('phoneCheckCode', function(request, response) {

	var phoneNumber = request.params.phoneNumber;

	var query = new AV.Query(AV.User);
	query.equalTo('mobilePhoneNumber', phoneNumber); 
	query.find().then(function(results) {
	  if(results.length > 0){
	      response.error('该手机号已被注册');
	  }else{
	     
	    AV.Cloud.requestSmsCode(phoneNumber).then(function() {
	      //发送成功
	      response.success(phoneNumber);
	    }, function(err) {
	      //发送失败
	        response.error(err);
	    });
	 
	  }
	}, function(err) {
	  //发送失败
	    response.error(err);
	});
});

/**
 * @Author   bibitiger
 * @DateTime 2016-06-01T15:07:50+0800
 * @description 
 */
AV.Cloud.define('register', function(request, response) {
	//登录或者注册使用同一个接口

	var phoneNumber = request.params.phoneNumber;
	var password = request.params.password;
	var checkCode = request.params.checkCode;


	var data = {};

	var user = new AV.User();
	user.signUpOrlogInWithMobilePhone({
	  mobilePhoneNumber: request.params.phoneNumber,
	  smsCode: request.params.checkCode,
	  password: request.params.password,
	}).then(function(user) {
	    var Patient = AV.Object.extend('Patients');
	    var patient = new Patient();
	    patient.set('user',user)
	    
	     // 新建一个 ACL 实例
	    var acl = new AV.ACL();
	    acl.setPublicReadAccess(true);
	    acl.setWriteAccess(user,true);
	      // 将 ACL 实例赋予 patient 对象
	    patient.setACL(acl);

	    patient.save().then(function(patient) {
	        
	        response.success(user);
	    }, function(err) {
	        
	        console.log('Failed to create new object, with error message: ' + err.message);
	        response.error(err);
	    });
	    
	}, function(error) {
	  // 失败
	  console.log(error);
	  response.error(error);
	});
});

/**
 * @Author   bibitiger
 * @DateTime 2016-06-01T15:07:50+0800
 * @description 
 */
AV.Cloud.define('boundWX', function(request, response) {

	var sessionToken = request.params.token;
	var openId = request.params.openId;
	var access_token = request.params.access_token;
	var expires_in = request.params.expires_in;

	var query = new AV.Query(AV.User);
	query.equalTo('WXOpenId', openId); 
	query.find().then(function(results) {
	  if(results.length > 0){
	      response.error('该微信已被其他账号绑定');
	  }else{
	        AV.User.become(sessionToken).then(function (user) {
	          // The current user is changed.
	            user._linkWith('WeiXin', {
	                'authData': {
	                'uid': openId,
	                'access_token': access_token,
	                'expires_in': expires_in
	                }
	            }).then(function(user) {
	              //返回绑定后的用户
	              console.log(user);
	              
	              user.set('WXOpenId', openId);
	              user.save().then(function (user){
	                response.success(user);
	              }, function (error){
	                response.error(error);
	              });
	            }, function(error) {
	              console.log(error);
	              response.error(error);
	            });
	        }, function (error) {
	          // Login failed.
	            response.error(error);
	        });     
	  }
	}, function(err) {
	  //发送失败
	    response.error(err);
	});




});

/**
 * @Author   bibitiger
 * @DateTime 2016-06-01T15:07:50+0800
 * @description 
 */
AV.Cloud.define('boundPhone', function(request, response) {
	var sessionToken = request.params.token;
	var phoneNumber = request.params.phoneNumber;

	var query = new AV.Query(AV.User);
	query.equalTo('mobilePhoneNumber', phoneNumber); 
	query.find().then(function(results) {
	  if(results.length > 0){
	      response.error('该手机号已绑定其他账号');
	  }else{
	        AV.User.become(sessionToken).then(function (user) {
	          // The current user is changed.
	          
	            user.set('mobilePhoneNumber',phoneNumber);
	            user.save().then(function() {
	              // 成功
	              user.set('mobilePhoneVerified',true);
	              user.save().then(function() {
	                response.success(user);
	              }, function (error){
	                response.error(error);
	            });
	        
	            }, function (error){
	                response.error(error);
	            });
	        }, function (error) {
	          // Login failed.
	            response.error(error);
	        });
	  }
	}, function(err) {
	  //发送失败
	    response.error(err);
	});

});

/**
 * @Author   bibitiger
 * @DateTime 2016-06-01T15:07:50+0800
 * @description 
 */
AV.Cloud.define('refuseReportByDoc', function(request, response) {
	//findReport with report id & doc
	findReportByReportAndDoc(request.params.report, request.user, {
		success: function(report){
			console.log("refuseReportByDoc refuse report is " + JSON.stringify(report));

			if(report.get('CheckState') != "WaitDoc"){
				response.error("report state error");
			}

			var doc = report.get('Doctor');
			var checkId = report.get('CheckId');

			report.fetchWhenSave(true);
			report.unset('Doctor');
			report.unset('CheckState');
			report.unset('CheckId');
			report.set('CheckStateChangeTime', new Date());

			var groupACL = new AV.ACL();
			console.log("patient user is " + JSON.stringify(report.get('idPatient').get('user')));
			groupACL.setReadAccess(report.get('idPatient').get('user'), true);
			groupACL.setWriteAccess(report.get('idPatient').get('user'), true);
			groupACL.setPublicReadAccess(true);
			report.setACL(groupACL);

			report.save().then(function(report){
				var history = AV.Object.new('ReportCheckHistory');
				console.log(JSON.stringify(history));
				history.set('Report', report);
				history.set('Note', "refuse by doctor " + doc.get('objectId'));
				history.set('CheckId', checkId);
				history.set('Doctor', doc);
				history.set('state', "RefuseByDoc");
				console.log(JSON.stringify(history));
				history.save().then(function(history){
					AV.Push.send({
						channels: [report.get('idPatient').get('user').get('objectId')],
						data: {
							alert: "report " + report.get('objectId') + " refuse by doctor"
						}
					});
					console.log(JSON.stringify(history));
					response.success(history);
				}, function(e){
					console.log(JSON.stringify(e));
					response.error(e);
				});
			}, function(e){
				console.log(JSON.stringify(e));
				response.error(e);
			});
		},
		error: function(e){
			console.log(JSON.stringify(e));
			response.error(e);
		}
	})
});

/**
 * @Author   bibitiger
 * @DateTime 2016-06-01T15:07:50+0800
 * @description 
 */
AV.Cloud.define('confirmReportByDoc', function(request, response) {
	//findReport with report id & doc
	findReportByReportAndDoc(request.params.report, request.user, {
		success: function(report){
			console.log("confirmReportByDoc confirm report is " + JSON.stringify(report));
			console.log("user is " + report.get('idPatient').get('user').get('objectId'));

			if(report.get('CheckState') != "WaitDoc"){
				response.error("report state error");
			}

			var doc = report.get('Doctor');
			var checkId = report.get('CheckId');

			report.fetchWhenSave(true);
			report.set('CheckState', "InCheck");
			report.set('Conversation', request.params.conversation);
			report.set('CheckStateChangeTime', new Date());

			var groupACL = new AV.ACL();
			console.log("patient user is " + JSON.stringify(report.get('idPatient').get('user')));
			groupACL.setReadAccess(report.get('idPatient').get('user'), true);
			groupACL.setWriteAccess(report.get('idPatient').get('user'), true);
			groupACL.setReadAccess(request.user, true);
			groupACL.setWriteAccess(request.user, true);
			report.setACL(groupACL);

			report.save().then(function(report){
				var history = AV.Object.new('ReportCheckHistory');
				history.set('Report', report);
				history.set('Note', "comfirm by doctor " + doc.get('objectId'));
				history.set('CheckId', checkId);
				history.set('Doctor', doc);
				history.set('state', "BeginCheck");
				history.set('Conversation', request.params.conversation);
				history.save().then(function(history){
					console.log("history success");
					AV.Push.send({
						channels: [report.get('idPatient').get('user').get('objectId')],
						data: {
							alert: "report " + report.get('objectId') + " begin check"
						}
					});
					console.log(JSON.stringify(history));
					response.success(history);
				}, function(e){
					console.log(JSON.stringify(e));
					response.error(e);
				});
			}, function(e){
				console.log(JSON.stringify(e));
				response.error(e);
			});
		},
		error: function(e){
			console.log(JSON.stringify(e));
			response.error(e);
		}
	})
});

/**
 * @Author   bibitiger
 * @DateTime 2016-06-02T18:23:03+0800
 * @description 
 */
AV.Cloud.define('RefuseReportByUser', function(request, response) {
	var Findinfo = createFindReportInfo("Patients", "user", "cant find patient", "idPatient");
	findReportByReportAndEntity.call(Findinfo, request.params.report, request.user, {
		success: function(report){
			console.log("RefuseReportByUser confirm report is " + JSON.stringify(report));
			console.log("user is " + report.get('idPatient').get('user').get('objectId'));

			if(report.get('CheckState') != "WaitDoc"){
				response.error("report state error");
			}

			var doc = report.get('Doctor');
			var checkId = report.get('CheckId');

			report.fetchWhenSave(true);
			report.unset('CheckState');
			report.unset('CheckId');
			report.unset('Doctor');
			report.set('CheckStateChangeTime', new Date());

			var groupACL = new AV.ACL();
			console.log("doc user is " + JSON.stringify(doc.get('CreateBy')));
			groupACL.setPublicReadAccess(true);
			groupACL.setReadAccess(request.user, true);
			groupACL.setWriteAccess(request.user, true);
			report.setACL(groupACL);

			report.save().then(function(report){
				var history = AV.Object.new('ReportCheckHistory');
				history.set('Report', report);
				console.log(JSON.stringify(request.user.get('objectId')));
				history.set('Note', "refuse by patient " + request.user.get('objectId'));
				console.log("222222222222");
				history.set('CheckId', checkId);
				history.set('Doctor', doc);
				history.set('state', "RefuseByPatient");
				console.log("111111111111");
				history.save().then(function(history){
					console.log("history success");
					AV.Push.send({
						channels: [doc.get('CreateBy').get('objectId')],
						data: {
							alert: "report " + report.get('objectId') + " refuse by patient"
						}
					});
					console.log(JSON.stringify(history));
					response.success(history);
				}, function(e){
					console.log(JSON.stringify(e));
					response.error(e);
				});
			}, function(e){
				console.log(JSON.stringify(e));
				response.error(e);
			});
		},
		error: function(e){
			console.log(JSON.stringify(e));
			response.error(e);
		}
	})
});

/**
 * @Author   bibitiger
 * @DateTime 2016-06-02T18:23:03+0800
 * @description 
 */
AV.Cloud.define('CloseCheckByDoc', function(request, response) {
	var Findinfo = createFindReportInfo("DoctorPub", "CreateBy", "cant find Doctor", "Doctor");
	findReportByReportAndEntity.call(Findinfo, request.params.report, request.user, {
		success: function(report){
			console.log("CloseCheckByDoc report is " + JSON.stringify(report));
			console.log("user is " + report.get('idPatient').get('user').get('objectId'));

			if(report.get('CheckState') != "InCheck"){
				response.error("report state error");
				return;
			}

			var doc = report.get('Doctor');
			var checkId = report.get('CheckId');
			var curState = report.get('CheckState');
			var patient = report.get('idPatient');

			report.fetchWhenSave(true);
			var groupACL = new AV.ACL();
			report.unset('CheckState');
			report.set('CheckStateChangeTime', new Date());
			//report.unset('CheckId');
			report.unset('Doctor');
			groupACL.setPublicReadAccess(true);
			groupACL.setReadAccess(patient.get('user'), true);
			groupACL.setWriteAccess(patient.get('user'), true);

			report.setACL(groupACL);

			report.save().then(function(report){
				var history = AV.Object.new('ReportCheckHistory');
				history.set('Report', report);
				history.set('Note', "close by doctor " + request.user.get('objectId'));
				history.set('CheckId', checkId);
				history.set('Doctor', doc);
				history.set('state', "CloseByDoc");
				history.set('Conversation', request.params.conversation);
				history.save().then(function(history){
					AV.Push.send({
						channels: [patient.get('user').get('objectId')],
						data: {
							alert: "report " + report.get('objectId') + " close by doctor"
						}
					});
					console.log(JSON.stringify(history));
					response.success(history);
				}, function(e){
					console.log(JSON.stringify(e));
					response.error(e);
				});
			}, function(e){
				console.log(JSON.stringify(e));
				response.error(e);
			});
		},
		error: function(e){
			console.log(JSON.stringify(e));
			response.error(e);
		}
	})
});

/**
 * @Author   bibitiger
 * @DateTime 2016-06-02T18:23:03+0800
 * @description 
 */
AV.Cloud.define('CloseCheckByUser', function(request, response) {
	var Findinfo = createFindReportInfo("Patients", "user", "cant find Patient", "idPatient");
	findReportByReportAndEntity.call(Findinfo, request.params.report, request.user, {
		success: function(report){
			console.log("CloseCheckByUser report is " + JSON.stringify(report));
			console.log("user is " + report.get('idPatient').get('user').get('objectId'));

			if(report.get('CheckState') != "InCheck"){
				response.error("report state error");
				return;
			}

			var doc = report.get('Doctor');
			var checkId = report.get('CheckId');
			var curState = report.get('CheckState');
			var patient = report.get('idPatient');

			report.fetchWhenSave(true);
			var groupACL = new AV.ACL();
			report.unset('CheckState');
			report.set('CheckStateChangeTime', new Date());
			//report.unset('CheckId');
			report.unset('Doctor');
			groupACL.setPublicReadAccess(true);
			groupACL.setReadAccess(patient.get('user'), true);
			groupACL.setWriteAccess(patient.get('user'), true);

			report.setACL(groupACL);

			report.save().then(function(report){
				var history = AV.Object.new('ReportCheckHistory');
				history.set('Report', report);
				history.set('Note', "close by patient " + request.user.get('objectId'));
				history.set('CheckId', checkId);
				history.set('Doctor', doc);
				history.set('state', "CloseByPatient");
				history.set('Conversation', request.params.conversation);
				history.save().then(function(history){
					AV.Push.send({
						channels: [doc.get('CreateBy').get('objectId')],
						data: {
							alert: "report " + report.get('objectId') + " close by patient"
						}
					});
					console.log(JSON.stringify(history));
					response.success(history);
				}, function(e){
					console.log(JSON.stringify(e));
					response.error(e);
				});
			}, function(e){
				console.log(JSON.stringify(e));
				response.error(e);
			});
		},
		error: function(e){
			console.log(JSON.stringify(e));
			response.error(e);
		}
	})
});

/**
 * @Author   bibitiger
 * @DateTime 2016-06-02T18:23:03+0800
 * @description check report checking, 20 sec interval loop, if it is time to close or refuse
 */
AV.Cloud.define('CheckCheckingForCloseOrRefuse', function(request, response) {
	console.log("CheckCheckingForCloseOrRefuse begin");
	var reportsCheck = new AV.Query('Reports');
	reportsCheck.equalTo('CheckState', "InCheck");

	var reportsWait = new AV.Query('Reports');
	reportsWait.equalTo('CheckState', "WaitDoc");

	var reports = AV.Query.or(reportsCheck, reportsWait);
	reports.include(['Doctor.CreateBy']);
	reports.include(['idPatient.user']);
	reports.select('CheckId', 'Doctor' , 'CheckStateChangeTime', 'idPatient', 'CheckState');
	var now = new Date();
	var nowDate = now.getTime();
	console.log("now is " + JSON.stringify(now));

	reports.find().then(function(listReport){
		console.log(listReport.length.toString());
		var arrayReport = new Array();
		var arrayHistory = new Array();
		var arrayPush = new Array();
		var needClose = false;
		var historyNote = "";
		var historyState = "";
		for (var i = 0; i < listReport.length; i++) {
			var checkId = listReport[i].get("CheckId");
			var reportDate = listReport[i].get('CheckStateChangeTime');
			if(!reportDate) continue;
			var conversation = listReport[i].get('Conversation');
			var doc = listReport[i].get('Doctor');
			if(listReport[i].get('CheckState') == "WaitDoc"){
				var interval = Math.floor((nowDate - reportDate)/(1000*60));
				console.log(interval.toString());
				if(interval >= 10){
					console.log("report " + JSON.stringify(listReport[i].get('objectId')) + " refuse change time is " + JSON.stringify(reportDate));
					needClose = true;
					historyNote = "refuse by system";
					historyState = "RefuseBySys";
				}
			} else if (listReport[i].get('CheckState') == "InCheck"){
				var interval = Math.floor((nowDate - reportDate)/1000*3600);
				console.log(interval.toString());
				if(interval >= 24){
					console.log("report " + JSON.stringify(listReport[i].get('objectId')) + " close change time is " + JSON.stringify(reportDate));
					needClose = true;
					historyNote = "close by system";
					historyState = "CloseBySys";
				}
			}

			if(needClose){
				listReport[i].fetchWhenSave(true);
				var groupACL = new AV.ACL();
				listReport[i].unset('CheckState');
				listReport[i].set('CheckStateChangeTime', new Date());
				//report.unset('CheckId');
				listReport[i].unset('Doctor');
				groupACL.setPublicReadAccess(true);
				groupACL.setReadAccess(listReport[i].get('idPatient').get('user'), true);
				groupACL.setWriteAccess(listReport[i].get('idPatient').get('user'), true);
				listReport[i].setACL(groupACL);

				arrayReport.push(listReport[i]);
				console.log("test1");

				var history = AV.Object.new('ReportCheckHistory');
				history.set('Report', listReport[i]);
				history.set('Note', historyNote);
				history.set('CheckId', checkId);
				history.set('Doctor', doc);
				history.set('state', historyState);
				if(conversation){
					history.set('Conversation', conversation);
				}
				arrayHistory.push(history);

				arrayPush.push(listReport[i].get('idPatient').get('user').get('objectId'));
				arrayPush.push(doc.get("CreateBy").get('objectId'));
			}
		};

		if(arrayReport.length){
			AV.Object.saveAll(arrayReport).then(function(arrayReport){
				AV.Object.saveAll(arrayHistory).then(function(arrayHistory){
					AV.Push.send({
						channels: arrayPush,
						data: {
							alert: "report has " + historyNote
						}
					});
					response.success();
				}, function(e){
					console.log(JSON.stringify(e));
					response.error(e);
				})
			},function(e){
				console.log(JSON.stringify(e));
				response.error(e);
			})
		} else {
			response.success();
		}

	},
	function(e){
		console.log(JSON.stringify(e));
		response.error(e);
	})
});

/**
 * @Author   bibitiger
 * @DateTime 2016-06-02T18:23:03+0800
 * @description 
 */
AV.Cloud.define('CommentByUser', function(request, response) {
	console.log("CheckCheckingForCloseOrRefuse begin");
	var reportsCheck = new AV.Query('Reports');
	reportsCheck.equalTo('CheckState', "InCheck");

	var reportsWait = new AV.Query('Reports');
	reportsWait.equalTo('CheckState', "WaitDoc");

	var reports = AV.Query.or(reportsCheck, reportsWait);
	reports.include(['Doctor.CreateBy']);
	reports.include(['idPatient.user']);
	reports.select('CheckId', 'Doctor' , 'CheckStateChangeTime', 'idPatient', 'CheckState');
});

/**
 * @Author   bibitiger
 * @DateTime 2016-06-02T18:23:03+0800
 * @description 
 */
AV.Cloud.define('CommentByDoctor', function(request, response) {
});

/**
 * create a info for find report ,used by findReportByReportAndEntity
 *
 * @method createFindReportInfo
 *
 *
 * @DateTime 2016-06-03T11:03:30+0800
 *
 *
 * @author bibitiger
 *
 * maintain the elegant code comments
 *
 * @param {string} entityType [description]
 * @param {string} entityDepend [description]
 * @param {string} entityFindError [description]
 * @param {string} reportDepend [description]
 *
 * @return {object} [description]
 */
function createFindReportInfo(entityType, entityDepend, entityFindError, reportDepend){
	var info = {};
	info.entityType = entityType;
	info.entityDepend = entityDepend;
	info.entityFindError = entityFindError;
	info.reportDepend = reportDepend;
	return info;
};

/**
 * use it like :
 * var info = createFindReportInfo("DoctorPub", "CreateBy", "cant find doc", "Doctor");
 * findReportByReportAndEntity.call(info, request.params.report, request.user, {
 * success: function(report){
 * },
 * error: function(error){
 * }
 * })
 *
 * @method findReportByReportAndEntity
 *
 *
 * @DateTime 2016-06-03T11:05:39+0800
 *
 *
 * @author bibitiger
 *
 * maintain the elegant code comments
 *
 * @param {[type]} reportId [description]
 * @param {[type]} entity [description]
 * @param {[type]} options [description]
 *
 * @return {[type]} [description]
 */
function findReportByReportAndEntity(reportId, entity, options){
	var entitys = new AV.Query(this.entityType);
	entitys.equalTo(this.entityDepend, entity);
	reportDepend = this.reportDepend;
	entitys.find({
		success: function(listEntity){
			console.log(listEntity.length.toString());
			if(listEntity.length != 1){
				if(options.error){
					for (var i = 0; i < listEntity.length; ++i) {
						console.log(JSON.stringify(listDoc[i]));
					}
					options.error.call(this, new AV.Error(AV.Error.INTERNAL_SERVER_ERROR, this.entityFindError));
				}
			} else {
				var reports = new AV.Query('Reports');
				console.log(reportDepend);
				console.log(JSON.stringify(listEntity[0]));
				console.log(reportId);
				reports.equalTo(reportDepend, listEntity[0]);
				reports.equalTo('objectId', reportId);
				reports.include(['idPatient.user']);
				reports.include(['Doctor.CreateBy']);
				reports.find({
					success: function(listReport){
						console.log(listReport.length.toString());
						if(listReport.length != 1){
							if(options.error){
								options.error.call(this, new AV.Error(AV.Error.INTERNAL_SERVER_ERROR, "cant find report"));
							}
						} else {
							if(options.success){
								options.success.call(this, listReport[0]);
							}
						}
					},
					error: function(e){
						console.log(JSON.stringify(e));
						if(options.error){
							options.error.call(this, e);
						}
					}
				})
			}
		},
		error: function(e){
			if(options.error){
				options.error.call(this, e);
			}
		}
	});
}

/**
 *
 * @DateTime 2016-06-01T23:51:50+0800
 *
 * @author bibitiger
 *
 * maintain the elegant code comments
 * @param {string} reportId reportId
 * @param {AV.object} doc _User
 * @param {[type]} options [description]
 * @return {[type]}
 */
function findReportByReportAndDoc(reportId, doc, options){
	var doctors = new AV.Query('DoctorPub');
	doctors.equalTo('CreateBy', doc);
	doctors.find({
		success: function(listDoc){
			if(listDoc.length != 1){
				if(options.error){
					for (var i = 0; i < listDoc.length; ++i) {
						console.log(JSON.stringify(listDoc[i]));
					}
					options.error.call(this, new AV.Error(AV.Error.INTERNAL_SERVER_ERROR, "cant find doc"));
				}
			} else {
				var reports = new AV.Query('Reports');
				reports.equalTo('Doctor', listDoc[0]);
				reports.equalTo('objectId', reportId);
				reports.include(['idPatient.user']);
				reports.include('Doctor');
				reports.find({
					success: function(listReport){
						if(listReport.length != 1){
							if(options.error){
								options.error.call(this, new AV.Error(AV.Error.INTERNAL_SERVER_ERROR, "cant find report"));
							}
						} else {
							if(options.success){
								options.success.call(this, listReport[0]);
							}
						}
					},
					error: function(e){
						console.log(JSON.stringify(e));
						if(options.error){
							options.error.call(this, e);
						}
					}
				})
			}
		},
		error: function(e){
			if(options.error){
				options.error.call(this, e);
			}
		}
	});
};


module.exports = AV.Cloud;
