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
 * @description for client to request a doctor due with report, push msg to doctors, make up check obj
 */
AV.Cloud.define('RquestDoctor', function(request, response) {
	console.log("RquestDoctor begin");
	//check out current patient
	var patients = new AV.Query('Patients');
	patients.equalTo('user', request.user);
	patients.find({
		success: function(listPatient){
			if(listPatient.length != 1){
				console.log("RquestDoctor cant find patient");
				for (var i = 0; i < listPatient.length; ++i) {
					console.log(JSON.stringify(listPatient[i])); 
				}
				response.error("cant find patient");
				return;
			} else {
				console.log("RquestDoctor current patient is " + JSON.stringify(listPatient[0]));

				//check out target report with current patient
				var reports = new AV.Query('BaseReports');
				reports.equalTo('CreateBy', listPatient[0]);
				reports.equalTo('objectId', request.params.report);
				reports.include('Check');
				reports.find({
					success: function(listReport){
						if(listReport.length != 1){
							console.log("RquestDoctor reports cnt is " + JSON.stringify(listReport.length));
							response.error("cant find report");
							for (var i = 0; i < listReport.length; ++i) {
								console.log(JSON.stringify(listReport[i]));
							}
							return;
						} else {
							console.log("RquestDoctor current report is " + JSON.stringify(listReport[0]));
							if(listReport[0].get('Check')){
								if("WaitDoc" == listReport[0].get('Check').get('State') || "WaitDocOfficial" == listReport[0].get('Check').get('State') || "InCheck" == listReport[0].get('Check').get('State')){
									console.log("RequestDoctor report has in check, check state is " + JSON.stringify(listReport[0].get('Check').get('State')));
									response.error("report has in check, check state is " + JSON.stringify(listReport[0].get('Check').get('State')));
									return;
								}
							}

							var check = AV.Object.new('Check');
							check.set('ReportId', listReport[0].get('objectId'));
							check.set('StateChangeTime', new Date());
							check.set('State', "WaitDoc");
							check.set('Patient', listPatient[0]);
							if(request.params.note){
								check.set('Note', request.params.note);
							}
							check.save().then(function(check){
								listReport[0].fetchWhenSave(true);
								listReport[0].set('Check', check);
								listReport[0].save().then(function(report){
									var history = AV.Object.new('ReportCheckHistory');
									history.set('Note', "requst by user " + request.user.get('objectId'));
									history.set('Check', check);
									history.set('state', "NoticeDocAccp");
									history.save().then(function(history){
										//push msg to doc
										AV.Push.send({
											channels: ["UserRequstDocForCheck"],
											data: {
												action: "com.zhaoguan.huxikang",
												type: 'ReportCheck',
												checkID: [check.get('objectId')],
												state: "NoticeDocAccp"
												alert: "有新订单来了！"
											}
										});

										//success
										response.success(check);
									},
									function(e){
										response.error(e);
									});
								}, function(e){
									console.log(JSON.stringify(e));
									response.error(e);
									return;
								})
							}, function(e){
								console.log(JSON.stringify(e));
								response.error(e);
								return;
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
	                patient.set('user',user);
	                patient.set('name',user.get('username'));
	                
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
	                    data['name'] = user.get('name');
	                    
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
                data['name'] = profile.get('name');
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
	                data['name'] = profile.get('name');
	                //...
	                response.success(data);            
	        }else{
	                var Patient = AV.Object.extend('Patients');
	                var patient = new Patient();
	                patient.set('user',user)
	                patient.set('name',user.get('username'));
	                
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
	                    data['name'] = user.get('username');
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
AV.Cloud.define('confirmCheckByDoc', function(request, response) {
	console.log("confirmCheckByDoc begin");
	var checks = new AV.Query('Check');
	checks.include(['Patient.user']);
	checks.include(['Doctor.CreateBy']);
	checks.get(request.params.check).then(function(check){
		if(!check){
			console.log("confirmReportByDoc cant find check id is " + request.params.check);
			response.error("cant find check id is " + request.params.check);
			return;
		}

		if(!check.get('Patient')){
			console.log("confirmReportByDoc this check has not patient");
			response.error("this check has not patient");
			return;
		}

		if("WaitDoc" != check.get('State') && "WaitDocOfficial" != check.get('State')){
			console.log("confirmReportByDoc this check state error");
			response.error("this check state error");
			return;
		}

		if(check.get('Doctor')){
			console.log("confirmReportByDoc this check has doctor already");
			response.error("this check has doctor already");
			return;
		}

		if(!request.user){
			console.log("confirmReportByDoc request has not user");
			response.error("request has not user");
			return;
		}

		var doctors = new AV.Query('DoctorPub');
		doctors.equalTo('CreateBy', request.user);
		doctors.find().then(function(listDoc){
			if(listDoc.length != 1){
				console.log("confirmReportByDoc cant find doc");
				response.error("cant find doc");
				return;
			}

			check.fetchWhenSave(true);
			check.set('Doctor', listDoc[0]);
			check.set('State', "InCheck");
			check.set('Conversation', request.params.conversation);
			check.set('StateChangeTime', new Date());
			check.save().then(function(check){
				var history = AV.Object.new('ReportCheckHistory');
				history.set('Note', "accept check by doc " + request.user.get('objectId'));
				history.set('Check', check);
				history.set('state', "BeginCheck");
				history.save().then(function(history){
					//push msg to doc
					AV.Push.send({
						channels: [check.get('Patient').get('user').get('objectId')],
						data: {
							action: "com.zhaoguan.huxikang",
							type: 'ReportCheck',
							checkID: [check.get('objectId')],
							state: "BeginCheck"
						}
					});

					//success
					response.success(check);
					console.log("confirmCheckByDoc success");
				},
				function(e){
					console.log(JSON.stringify(e));
					response.error(e);
				});
			}, function(e){
				console.log(JSON.stringify(e));
				response.error(e);
				return;
			})
		}, function(e){
			console.log(JSON.stringify(e));
			response.error(e);
			return;
		});
	}, function(e){
		console.log(JSON.stringify(e));
		response.error(e);
		return;
	})
	
});

/**
 * @Author   bibitiger
 * @DateTime 2016-06-02T18:23:03+0800
 * @description 
 */
AV.Cloud.define('RefuseCheckByUser', function(request, response) {
	console.log("RefuseCheckByUser begin");
	var checks = new AV.Query('Check');
	checks.include(['Patient.user']);
	checks.include(['Doctor.CreateBy']);
	checks.get(request.params.check).then(function(check){
		if(!check){
			console.log("RefuseCheckByUser cant find check id is " + request.params.check);
			response.error("cant find check id is " + request.params.check);
			return;
		}

		if(!check.get('Patient')){
			console.log("RefuseCheckByUser this check has not patient");
			response.error("this check has not patient");
			return;
		}

		if("WaitDoc" != check.get('State')){
			console.log("RefuseCheckByUser this check state error");
			response.error("this check state error");
			return;
		}

		if(!request.user){
			console.log("RefuseCheckByUser request has not user");
			response.error("request has not user");
			return;
		}

		if(request.user.get('objectId') != check.get('Patient').get('user').get('objectId')){
			console.log("RefuseCheckByUser permission error");
			response.error("permission error");
			return;
		}

		check.fetchWhenSave(true);
		check.set('State', "RefuseByPatient");
		check.set('StateChangeTime', new Date());
		check.save().then(function(check){
			var history = AV.Object.new('ReportCheckHistory');
			history.set('Note', "refuse check by user " + request.user.get('objectId'));
			history.set('Check', check);
			history.set('state', "RefuseByPatient");
			history.save().then(function(history){
				//push msg to doc
				AV.Push.send({
					channels: ["PatientRefuseCheck"],
					data: {
						action: "com.zhaoguan.huxikang",
						type: 'ReportCheck',
						checkID: [check.get('objectId')],
						state: "RefuseByPatient"
					}
				});

				//success
				response.success(check);
				console.log("RefuseCheckByUser success");
			},
			function(e){
				response.error(e);
			});
		}, function(e){
			console.log(JSON.stringify(e));
			response.error(e);
			return;
		})
	}, function(e){
		console.log(JSON.stringify(e));
		response.error(e);
		return;
	})
});

/**
 * @Author   bibitiger
 * @DateTime 2016-06-02T18:23:03+0800
 * @description 
 */
AV.Cloud.define('CloseCheckByDoc', function(request, response) {
	console.log("CloseCheckByDoc begin");
	var checks = new AV.Query('Check');
	checks.include(['Patient.user']);
	checks.include(['Doctor.CreateBy']);
	checks.get(request.params.check).then(function(check){
		if(!check){
			console.log("CloseCheckByDoc cant find check id is " + request.params.check);
			response.error("cant find check id is " + request.params.check);
			return;
		}

		if(!check.get('Patient')){
			console.log("CloseCheckByDoc this check has not patient");
			response.error("this check has not patient");
			return;
		}

		if("InCheck" != check.get('State')){
			console.log("CloseCheckByDoc this check state error");
			response.error("this check state error");
			return;
		}

		if(!request.user){
			console.log("CloseCheckByDoc request has not user");
			response.error("request has not user");
			return;
		}

		if(request.user.get('objectId') != check.get('Doctor').get('CreateBy').get('objectId')){
			console.log("CloseCheckByDoc permission error");
			response.error("permission error");
			return;
		}

		check.fetchWhenSave(true);
		check.set('State', "CloseByDoc");
		check.set('StateChangeTime', new Date());
		check.save().then(function(check){
			var history = AV.Object.new('ReportCheckHistory');
			history.set('Note', "close check by user " + request.user.get('objectId'));
			history.set('Check', check);
			history.set('state', "CloseByDoc");
			history.save().then(function(history){
				//push msg to doc
				AV.Push.send({
					channels: [check.get('Patient').get('user').get('objectId')],
					data: {
						action: "com.zhaoguan.huxikang",
						type: 'ReportCheck',
						checkID: [check.get('objectId')],
						state: "CloseByDoc"
					}
				});

				//success
				response.success(check);
				console.log("CloseCheckByDoc success");
			},
			function(e){
				response.error(e);
			});
		}, function(e){
			console.log(JSON.stringify(e));
			response.error(e);
			return;
		})
	}, function(e){
		console.log(JSON.stringify(e));
		response.error(e);
		return;
	})
});

/**
 * @Author   bibitiger
 * @DateTime 2016-06-02T18:23:03+0800
 * @description 
 */
AV.Cloud.define('CloseCheckByUser', function(request, response) {
	console.log("CloseCheckByUser begin");
	var checks = new AV.Query('Check');
	checks.include(['Patient.user']);
	checks.include(['Doctor.CreateBy']);
	checks.get(request.params.check).then(function(check){
		if(!check){
			console.log("CloseCheckByUser cant find check id is " + request.params.check);
			response.error("cant find check id is " + request.params.check);
			return;
		}

		if(!check.get('Patient')){
			console.log("CloseCheckByUser this check has not patient");
			response.error("this check has not patient");
			return;
		}

		if("InCheck" != check.get('State')){
			console.log("CloseCheckByUser this check state error");
			response.error("this check state error");
			return;
		}

		if(!request.user){
			console.log("CloseCheckByUser request has not user");
			response.error("request has not user");
			return;
		}

		if(request.user.get('objectId') != check.get('Patient').get('user').get('objectId')){
			console.log("CloseCheckByUser permission error");
			response.error("permission error");
			return;
		}

		check.fetchWhenSave(true);
		check.set('State', "CloseByPatient");
		check.set('StateChangeTime', new Date());
		check.save().then(function(check){
			var history = AV.Object.new('ReportCheckHistory');
			history.set('Note', "close check by user " + request.user.get('objectId'));
			history.set('Check', check);
			history.set('state', "CloseByPatient");
			history.save().then(function(history){
				//push msg to doc
				AV.Push.send({
					channels: [check.get('Doctor').get('CreateBy').get('objectId')],
					data: {
						action: "com.zhaoguan.huxikang",
						type: 'ReportCheck',
						checkID: [check.get('objectId')],
						state: "CloseByPatient"
					}
				});

				//success
				response.success(check);
				console.log("CloseCheckByUser success");
			},
			function(e){
				response.error(e);
			});
		}, function(e){
			console.log(JSON.stringify(e));
			response.error(e);
			return;
		})
	}, function(e){
		console.log(JSON.stringify(e));
		response.error(e);
		return;
	})
});

/**
 * @Author   bibitiger
 * @DateTime 2016-06-02T18:23:03+0800
 * @description check report checking, 20 sec interval loop, if it is time to close or refuse
 */
AV.Cloud.define('CheckCheckingForCloseOrRefuse', function(request, response) {
	console.log("CheckCheckingForCloseOrRefuse begin");
	var checkIn = new AV.Query('Check');
	checkIn.equalTo('State', "InCheck");

	var checkWait = new AV.Query('Check');
	checkWait.equalTo('State', "WaitDoc");

	var checkWaitOfficial = new AV.Query('Check');
	checkWaitOfficial.equalTo('State', "WaitDocOfficial");

	var checks = AV.Query.or(checkIn, checkWait, checkWaitOfficial);
	checks.include(['Doctor.CreateBy']);
	checks.include(['Patient.user']);
	var now = new Date();
	var nowDate = now.getTime();
	console.log("now is " + JSON.stringify(now));

	checks.find().then(function(listCheck){
		var doctors = new AV.Query('Doctor');
		doctors.equalTo('Source', "official");
		doctors.include('CreateBy');
		doctors.find().then(function(listDoc){
			console.log(listDoc.length.toString());
			console.log(listCheck.length.toString());
			var arrayCheck= new Array();
			var arrayHistory = new Array();
			var arrayPush = new Array();
			var needClose = false;
			var needAssigned = false;
			var historyNote = "";
			var historyState = "";
			var checkState = "";
			for (var i = 0; i < listCheck.length; i++) {
				needClose = false;
				needAssigned = false;
				var reportDate = listCheck[i].get('StateChangeTime');
				if(!reportDate) continue;
				var interval = Math.floor((nowDate - reportDate)/(1000*3600));
				if(interval >= 24){
					if(listCheck[i].get('State') == "WaitDoc"){
						historyNote = "Assigned by system";
						historyState = "AssignedToOfficialDoc";
						checkState = "WaitDocOfficial";
						needAssigned = true;
					} else if(listCheck[i].get('State') == "InCheck"){
						historyNote = "close by system";
						historyState = "CloseBySys";
						checkState = "CloseBySys";
						needClose = true;
					}else if(listCheck[i].get('State') == "WaitDocOfficial"){
						historyNote = "refuse by system";
						historyState = "RefuseBySys";
						checkState = "RefuseBySys";
						needClose = true;
					}
				}

				if(needClose){
					console.log("needClose");
					listCheck[i].fetchWhenSave(true);
					var groupACL = new AV.ACL();
					listCheck[i].set('State', checkState);
					listCheck[i].set('StateChangeTime', new Date());
					groupACL.setPublicReadAccess(true);
					listCheck[i].setACL(groupACL);

					arrayCheck.push(listCheck[i]);

					var history = AV.Object.new('ReportCheckHistory');

					history.set('Note', historyNote);
					history.set('Check', listCheck[i]);
					history.set('state', historyState);
					arrayHistory.push(history);

					arrayPush.push(listCheck[i].get('Patient').get('user').get('objectId'));
					if(listCheck[i].get('Doctor')){
						arrayPush.push(listCheck[i].get('Doctor').get('CreateBy').get('objectId'));
					}
				}

				if(needAssigned){
					console.log("needAssigned");
					var loc = Math.round(Math.random()*(listDoc.length-1));
					listCheck[i].fetchWhenSave(true);
					var groupACL = new AV.ACL();
					listCheck[i].set('State', checkState);
					listCheck[i].set('StateChangeTime', new Date());
					groupACL.setReadAccess(listDoc[loc].get('CreateBy').get('objectId'), true);
					groupACL.setWriteAccess(listCheck[i].get('Patient').get('user').get('objectId'), true);
					groupACL.setReadAccess(listCheck[i].get('Patient').get('user').get('objectId'), true);
					listCheck[i].setACL(groupACL);

					arrayCheck.push(listCheck[i]);

					var history = AV.Object.new('ReportCheckHistory');

					history.set('Note', historyNote);
					history.set('Check', listCheck[i]);
					history.set('state', historyState);
					arrayHistory.push(history);

					arrayPush.push(listCheck[i].get('Patient').get('user').get('objectId'));
					if(listCheck[i].get('Doctor')){
						arrayPush.push(listCheck[i].get('Doctor').get('CreateBy').get('objectId'));
					}
				}
			};

			if(arrayCheck.length){
				AV.Object.saveAll(arrayCheck).then(function(arrayCheck){
					AV.Object.saveAll(arrayHistory).then(function(arrayHistory){
						AV.Push.send({
							channels: arrayPush,
							data: {
								action: "com.zhaoguan.huxikang",
								type: 'ReportCheck',
								reportID: "111",
								state: "systemAction"
							}
						});
						console.log("CheckCheckingForCloseOrRefuse success");
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
		}, function(e){
			console.log(JSON.stringify(e));
			response.error(e);
		});
		

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
	console.log("CommentByUser begin");
	var checks = new AV.Query('Check');
	checks.include(['Patient.user']);
	checks.include(['Doctor.CreateBy']);
	checks.get(request.params.check).then(function(check){
		if(!check){
			console.log("CommentByUser cant find check id is " + request.params.check);
			response.error("cant find check id is " + request.params.check);
			return;
		}

		if(!check.get('Patient')){
			console.log("CommentByUser this check has not patient");
			response.error("this check has not patient");
			return;
		}

		if("InCheck" == check.get('State') || "WaitDoc" == check.get('State') || "WaitDocOfficial" == check.get('State')){
			console.log("CommentByUser this check state error");
			response.error("this check state error");
			return;
		}

		if(check.get('ScoreDoc') && request.params.score){
			console.log("CommentByUser this check has score doc");
			response.error("this check has score doc");
			return;
		}

		if(!request.user){
			console.log("CommentByUser request has not user");
			response.error("request has not user");
			return;
		}

		if(request.user.get('objectId') != check.get('Patient').get('user').get('objectId')){
			console.log("CommentByUser permission error");
			response.error("permission error");
			return;
		}

		check.fetchWhenSave(true);
		check.set('ScoreDoc', request.params.score);
		check.save().then(function(check){
			var history = AV.Object.new('ReportCheckHistory');
			history.set('Note', request.params.comment);
			history.set('Check', check);
			history.set('state', "CommentByPatient");
			var score = request.params.score;
			if(score){
				if(score < 0) score = 0;
				if(score > 5) score = 5;
				history.set('Score', request.params.score);
			}
			history.save().then(function(history){
				//success
				response.success(history);
				console.log("CommentByUser success");
			},
			function(e){
				response.error(e);
			});
		}, function(e){
			console.log(JSON.stringify(e));
			response.error(e);
			return;
		})
	}, function(e){
		console.log(JSON.stringify(e));
		response.error(e);
		return;
	});
});

/**
 * @Author   bibitiger
 * @DateTime 2016-06-02T18:23:03+0800
 * @description 
 */
AV.Cloud.define('CommentByDoctor', function(request, response) {
	console.log("CommentByDoctor begin");
	var checks = new AV.Query('Check');
	checks.include(['Patient.user']);
	checks.include(['Doctor.CreateBy']);
	checks.get(request.params.check).then(function(check){
		if(!check){
			console.log("CommentByDoctor cant find check id is " + request.params.check);
			response.error("cant find check id is " + request.params.check);
			return;
		}

		if(!check.get('Patient')){
			console.log("CommentByDoctor this check has not patient");
			response.error("this check has not patient");
			return;
		}

		if("InCheck" == check.get('State') || "WaitDoc" == check.get('State') || "WaitDocOfficial" == check.get('State')){
			console.log("CommentByDoctor this check state error");
			response.error("this check state error");
			return;
		}

		if(check.get('ScoreDoc') && request.params.score){
			console.log("CommentByDoctor this check has score doc");
			response.error("this check has score doc");
			return;
		}

		if(!request.user){
			console.log("CommentByDoctor request has not user");
			response.error("request has not user");
			return;
		}

		if(request.user.get('objectId') != check.get('Doctor').get('CreateBy').get('objectId')){
			console.log("CommentByDoctor permission error");
			response.error("permission error");
			return;
		}

		check.fetchWhenSave(true);
		if(request.params.score){
			check.set('ScorePatient', request.params.score);
		}
		
		check.save().then(function(check){
			var history = AV.Object.new('ReportCheckHistory');
			history.set('Note', request.params.comment);
			history.set('Check', check);
			history.set('state', "CommentByDoc");
			var score = request.params.score;
			if(score){
				if(score < 0) score = 0;
				if(score > 5) score = 5;
				history.set('Score', request.params.score);
			}
			history.save().then(function(history){
				//success
				response.success(history);
				console.log("CommentByDoctor success");
			},
			function(e){
				response.error(e);
			});
		}, function(e){
			console.log(JSON.stringify(e));
			response.error(e);
			return;
		})
	}, function(e){
		console.log(JSON.stringify(e));
		response.error(e);
		return;
	});
});

/**
 * @Author   bibitiger
 * @DateTime 2016-06-27T14:46:31+0800
 * @description 
 */
AV.Cloud.define('_receiversOffline', function(request, response) {
    var params = request.params;
    var sendName = "";
    if(params.convId && params.fromPeer){
		var checks = new AV.Query('Check');
		checks.equalTo('Conversation', params.convId);
		checks.include(['Doctor.CreateBy']);
		checks.include(['Patient.user']);
		checks.find().then(function(listChecks){
			if(listChecks.length == 1){
				if(listChecks[0].get('Doctor').get('CreateBy').get('objectId') == params.fromPeer){
					sendName = listChecks[0].get('Doctor').get('Name');
				}

				if(listChecks[0].get('Patient').get('user').get('objectId') == params.fromPeer){
					sendName = listChecks[0].get('Patient').get('name');
				}

				console.log(sendName);

			    var lctext = "您有一条新消息";
			    var con = JSON.parse(params.content);
			    if(con._lctext)
			    	lctext = con._lctext;
			    var json = {
			        // 自增未读消息的数目，不想自增就设为数字
			        badge: "Increment",
			        // content 为消息的实际内容
			    	alert: sendName + ":" + lctext
			    };

			    var pushMessage = JSON.stringify(json);

			    response.success({"pushMessage": pushMessage});
			    return;
			}
		}, function(e){
			console.log(JSON.stringify(e));
			response.error(e);
			return;
		})
    }else response.success();
})

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
function findCheckByCheckAndEntity(reportId, entity, options){
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
				var reports = new AV.Query('Check');
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
								options.error.call(this, new AV.Error(AV.Error.INTERNAL_SERVER_ERROR, "cant find check"));
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
