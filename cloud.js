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


AV.Cloud.define('monitorDevice', function(request, response) {
    /**
     * 开启状态下的设备，其updatedAt时间设备端会每隔1min刷新一次，加上网络延迟什么的，至少会和当前网络时间不同，
     * 理论上来讲当前时间若大于updatedAt时间1min，则设备肯定是断网了。
     * 而实际上，其实是最大要每隔2min才能判断设备是否真正的断网。（定时任务每隔1min监测一次）
     **/
    var now = new Date();

    var query = new AV.Query('Device');
    query.equalTo("workStatus","1"); //表明设备为在线状态
    /*query.equalTo("monitorStatus","1"); //表明设备为检测中的状态*/
    query.find().then(function (data) {
        for(var i = 0,len = data.length; i < len;i++){
            var obj = data[i];
            var time = obj.updatedAt;
            var during = now - time ;
            if( during > 2 * 60 * 1000 ) {    //状态未及时更新，表明下线了。
                obj.set("workStatus","0");
                obj.save();
            }

        }
        response.success("监测功能正常");
    }, function (error) {
        console.log(error)
        response.error("监测功能出现异常");
    });
});
/*
    设备绑定患者id时使用
    deviceSN:设备deviceSN
    patientId:用户的patientId
*/
AV.Cloud.define('boundDevice', function(request, response) {

    var params = request.params;
    var deviceSN = params.deviceSN;
    var patientId = params.patientId;
    var localIP = params.localIP;
    var monitorStatus = params.monitorStatus;
    var wifiName = params.wifiName;
    var workStatus = params.workStatus;
    var versionNO = params.versionNO;
    var romVersion = params.romVersion;

    var query = new AV.Query('Device');
    query.equalTo('deviceSN', deviceSN);
    query.find().then(function(dev) {

        if(dev.length === 0){
            //add
            var Device = AV.Object.extend('Device');
            var device = new Device();

            device.set('deviceSN',deviceSN);
            var pointPatient = AV.Object.createWithoutData('Patients', patientId);
            device.set('idPatient',pointPatient);
            device.set('localIP',localIP);
            device.set('monitorStatus',monitorStatus);
            device.set('wifiName',wifiName);
            device.set('workStatus',workStatus);
            device.set('versionNO',versionNO);
            device.set('romVersion',romVersion);

            device.save().then(function(deviceAfter) {

                var queryPatient = new AV.Query("Device");
                queryPatient.equalTo('idPatient',pointPatient);
                queryPatient.find().then(function(deviceList){
                    for (var i = 0; i < deviceList.length; i++) {
                        if (deviceAfter.id == deviceList[i].id) {
                            deviceList[i].set('active',true);
                            deviceList[i].save().then(function(saveDevice){
                                console.log("save_deviceId:" + saveDevice.id);
                            },function(error){
                                console.log("save error:" + saveDevice.id);
                            });
                        }else{
                            //删除对象
                            var deleteDevice = AV.Object.createWithoutData('Device', deviceList[i].id);
                            deleteDevice.destroy().then(function (success) {
                            // 删除成功
                                console.log("delete_deviceId:" + deleteDevice.id);
                            }, function (error) {
                            // 删除失败
                                console.log("delete error:" + deleteDevice.id);
                            });
                        }
                    }
                });

                response.success({
                    "objectId" : device.id
                });
            }, function(err) {
                response.error(err);
            });
        }else {
            //bound
            var targetTodoFolder = AV.Object.createWithoutData('Patients', patientId);
            dev[0].set('idPatient',targetTodoFolder);
            dev[0].set('localIP',localIP);
            dev[0].set('monitorStatus',monitorStatus);
            dev[0].set('wifiName',wifiName);
            dev[0].set('workStatus',workStatus);
            dev[0].set('versionNO',versionNO);
            dev[0].set('romVersion',romVersion);

            dev[0].save().then(function(newDev){

                var queryPatient = new AV.Query("Device");
                queryPatient.equalTo('idPatient',targetTodoFolder);

                queryPatient.find().then(function(device){
                    for (var i = 0; i < device.length; i++) {
                        if (newDev.id == device[i].id) {
                            device[i].set('active',true);
                            device[i].save().then(function(saveDevice){
                                console.log("save_deviceId:" + saveDevice.id);
                            },function(error){
                                console.log("save error:" + saveDevice.id);
                            });
                        }else{
                            //删除对象
                            var deleteDevice = AV.Object.createWithoutData('Device', device[i].id);
                            deleteDevice.destroy().then(function (success) {
                            // 删除成功
                                console.log("delete_deviceId:" + deleteDevice.id);
                            }, function (error) {
                            // 删除失败
                                console.log("delete error:" + deleteDevice.id);
                            });
                        }
                    }
                });

                response.success({
                    "objectId" : newDev.id
                });
            }, function(err) {
                response.error(err);
            });
        }
    },function(err) {
        console.log(err);
        response.error(err);
    });
});



AV.Cloud.afterSave('BaseReports', function(request){

    console.log("BaseReports afterSave");

    var idPatient = request.object.get('CreateBy').id;

    var type = request.object.get('Type');
    var reportId = request.object.get('ReportId');

    // var AHI = request.object.get('AHI');
    // var start = request.object.get('start');

    console.log("CreateBy:" + idPatient + ",type:" + type + ",reportId:" + reportId);

    if(type == null || type == "" || type == undefined){
        console.log("type is null");
        // response.error("type is null");
        return;
    }
    if(idPatient == null || idPatient == "" || idPatient == undefined){
        console.log("idPatient is null");
        // response.error("idPatient is null");
        return;
    }
    if(reportId == null || reportId == "" || reportId == undefined){
        console.log("reportId is null");
        // response.error("reportId is null");
        return;
    }


    if(type != "mengjia"){
        console.log("type is not right");
        // response.error("type is " + type);
        return;
    }

    var targetTodoFolder = AV.Object.createWithoutData('Patients', idPatient);

    var queryReports = new AV.Query("Reports");
    queryReports.equalTo('idPatient', targetTodoFolder);
    queryReports.equalTo('objectId', reportId);

    queryReports.find().then(function(reports){

        var reportsLength = reports.length;
        console.log("reportsLength:" + reportsLength);
        if(reportsLength == 1){

            var start = reports[0].get("start");
            var AHI = reports[0].get("AHI");
            var end = reports[0].get("end");
            var monthDate;

            var isEffect = true;

            if(start == -1 || AHI == -1){

                // 170610230729
                // monthDate = "1706";
                // start = 170620230129;
                // end = 1000;
                // AHI = 5;

                console.log("not effect report");
                return;

            }else{
                var startStr = start + "";

                if(startStr.length < 10){
                    console.log("start is error");
                    return;
                }
                var year = parseInt("20" + startStr.substring(0, 2));
                var month = parseInt(startStr.substring(2, 4));
                var day = parseInt(startStr.substring(4, 6));
                var hour = parseInt(startStr.substring(6, 8));
                console.log("year:" + year + "month:" + month + "day:" + day + "hour:" + hour);

                if(day == 1 && hour < 8){
                    month = month ==1 ? 12: month- 1;
                    monthDate = startStr.substring(0, 2) + (month < 10?"0" + month: "" + month);
                }else{
                    monthDate = startStr.substring(0, 4);
                }

            }
            console.log("monthDate:" + monthDate);

            var queryMonthReports = new AV.Query('MonthReports');
            queryMonthReports.equalTo('idPatient', targetTodoFolder);
            queryMonthReports.equalTo('monthDate', parseInt(monthDate));
            queryMonthReports.find().then(function(monthReports){

                var monthReportsLength = monthReports.length;
                console.log("monthReports length:" + monthReportsLength);

                var sleepData = {
                    "start":start,
                    "ahi":AHI,
                    "end":end,
                    "reportId":reportId
                };

                if(monthReportsLength > 0){

                    var totalSleepTime = monthReports[0].get("totalSleepTime");
                    var totalAhi = monthReports[0].get("totalAhi");

                    console.log("totalSleepTime:" + totalSleepTime);

                    // if(isEffect){
                    monthReports[0].add('sleepData', sleepData);
                    monthReports[0].increment('totalEffectReportCount');
                    monthReports[0].set('totalSleepTime', end + totalSleepTime);
                    if(AHI != -1){
                        monthReports[0].set('totalAhi', AHI + totalAhi);
                    }

                    // }

                    // monthReports[0].increment('totalReportCount');

                    monthReports[0].save().then(function(mReport){
                        console.log("monthReports save success" + mReport.id);
                    }, function(error){
                        console.log("monthReports save failure");
                    });

                }else{
                    var MonthReports = AV.Object.extend('MonthReports');
                    var mMonthReports = new MonthReports();

                    var targetTodoFolder = AV.Object.createWithoutData('Patients', idPatient);
                    mMonthReports.set('idPatient', targetTodoFolder);
                    mMonthReports.set('monthDate', parseInt(monthDate));
                    // if(isEffect){
                    mMonthReports.set('totalSleepTime', end);
                    if(AHI != -1){
                        mMonthReports.set('totalAhi', AHI);
                    }
                    mMonthReports.add('sleepData', sleepData);
                    mMonthReports.increment('totalEffectReportCount');
                    // }
                    // mMonthReports.increment('totalReportCount');

                    mMonthReports.save().then(function(mReport){
                        console.log("monthReports1 save success" + mReport.id);
                    }, function(error){
                        console.log(error);
                    });
                }
            }, function(error){
                console.log(error);
            });

        }else{
            console.log("not report");
        }
    });

});

/**
 * 获取报告--给第三方的sdk提供
 */
AV.Cloud.define('getReportsForSDKWithEndAndBegin', function(request, response){
    var params = request.params;
    console.log(params);
    var end = params.end;
    var begin = params.begin;
    var patientId = params.patientId;
    var factoryCode = params.factoryCode;
    console.log(end);
    console.log(begin);
    console.log(patientId);
    if (end == null || end == undefined || begin == null || begin == undefined || patientId == null || patientId == undefined) {
        console.log("getReportsForSDKWithEndAndBegin param error");
        response.error({'error':'getReportsForSDKWithEndAndBegin param error'});
        return;
    };


    var query = new AV.Query('FactoryUserList');
    query.get(patientId).then(function (factoryUser) {
        if (factoryUser.get('factoryCode') == null || factoryUser.get('factoryCode') != factoryCode) {
            response.error({'error':'cant find this user, please check your patientId and factoryCode'});
        } else {
            var patientID = factoryUser.get('patient').id;
            console.log('patientID:' + patientID);
            var queryBaseReports = new AV.Query('BaseReports');
            queryBaseReports.equalTo('isDelete', 0);
            var patient = AV.Object.createWithoutData('Patients', patientID);
            queryBaseReports.equalTo('CreateBy', patient);
            queryBaseReports.lessThanOrEqualTo('createdAt', end);
            queryBaseReports.greaterThanOrEqualTo('createdAt',begin);
            queryBaseReports.limit(50);
            queryBaseReports.skip(0);
            queryBaseReports.descending('createdAt');
            queryBaseReports.find().then(function (results) {
                if (results.length == 0) {
                    response.success({});
                };
                var reports = [];
                var checkQuery = new AV.Query('Reports');
                var checkQuerys = [];
                var baseReportsDic = [];
                var cqlStr = 'select * from Reports where ';
                for(var i in results){
                    baseReportsDic.push({'type':results[i]['_serverData']['Type'],
                                                                        'reportId':results[i]['_serverData']['ReportId'],
                                                                        'baseId':results[i]['id'],
                                                                        'updateAt':results[i]['updatedAt'],
                                                                        'CreateBy':results[i]['_serverData']['CreateBy']['id']});
                    cqlStr += 'objectId = ';
                    cqlStr += '\"';
                    cqlStr += results[i]['_serverData']['ReportId'];
                    cqlStr += '\"';
                    cqlStr += ' or ';
                }
                // console.log(baseReportsDic);
                // console.log(results.length);
                cqlStr = cqlStr.substring(0,cqlStr.length - 4);
                console.log(cqlStr);
                AV.Query.doCloudQuery(cqlStr).then(function (o){
                    // console.log(baseReportsDic);
                    // console.log(o);
                    for(var i in o['results']){
                        for (var j = 0 ; j < baseReportsDic.length; j++) {
                            if (baseReportsDic[j]['reportId'] == o['results'][i].get('objectId')) {
                                baseReportsDic[j]['start'] = o['results'][i].get('start');
                                baseReportsDic[j]['breathList'] = o['results'][i].get('breathList');
                                baseReportsDic[j]['end'] = o['results'][i].get('end');
                                baseReportsDic[j]['sleepData'] = o['results'][i].get('sleepData');
                                baseReportsDic[j]['AHI'] = o['results'][i].get('AHI');
                                baseReportsDic[j]['eventCnt'] = o['results'][i].get('eventCnt');
                            };
                        };

                    }
                    // console.log(baseReportsDic);
                    response.success(baseReportsDic);
                  }, function (e) {
                    console.log("getReportsForSDKWithEndAndBegin error : "+JSON.stringify(e));
                    response.error(e);
                });
            }, function(e){
                console.log("getReportsForSDKWithEndAndBegin error : "+e);
                response.error(e);
            });
        }
    }, function (error) {
        console.log(error);
        response.error(error);
    });
});

/**
 * 获取报告--给第三方的sdk提供
 */
AV.Cloud.define('getReportsForSDKWithEndAndCnt', function(request, response){
    var params = request.params;
    var end = params.end;
    var cnt = params.cnt;
    var patientId = params.patientId;
    var factoryCode = params.factoryCode;
    if (cnt == null || cnt == undefined || patientId == null || patientId == undefined) {
        console.log("getReportsForSDKWithEndAndCnt param error");
        response.error({'error':'getReportsForSDKWithEndAndCnt param error'});
        return;
    };

    var query = new AV.Query('FactoryUserList');
    query.get(patientId).then(function (factoryUser) {
        if (factoryUser.get('factoryCode') == null || factoryUser.get('factoryCode') != factoryCode) {
            response.error({'error':'cant find this user, please check your patientId and factoryCode'});
        } else {
            var patientID = factoryUser.get('patient').id;
            if (cnt  > 50) {cnt = 50};
            var queryBaseReports = new AV.Query('BaseReports');
            queryBaseReports.equalTo('isDelete', 0);
            var patient = AV.Object.createWithoutData('Patients', patientID);
            queryBaseReports.equalTo('CreateBy', patient);
            if (end != null) {
                queryBaseReports.lessThanOrEqualTo('createdAt', end);
            }
            queryBaseReports.limit(cnt);
            queryBaseReports.skip(0);
            queryBaseReports.descending('createdAt');
            queryBaseReports.find().then(function (results) {

                if (results.length == 0) {
                    response.success({});
                };
                var reports = [];
                var checkQuery = new AV.Query('Reports');
                var checkQuerys = [];
                var baseReportsDic = [];
                var cqlStr = 'select * from Reports where ';
                for(var i in results){
                    baseReportsDic.push({'type':results[i]['_serverData']['Type'],
                                                                        'reportId':results[i]['_serverData']['ReportId'],
                                                                        'baseId':results[i]['id'],
                                                                        'updateAt':results[i]['updatedAt'],
                                                                        'CreateBy':results[i]['_serverData']['CreateBy']['id']});
                    cqlStr += 'objectId = ';
                    cqlStr += '\"';
                    cqlStr += results[i]['_serverData']['ReportId'];
                    cqlStr += '\"';
                    cqlStr += ' or ';
                }
                // console.log(baseReportsDic);
                // console.log(results.length);
                cqlStr = cqlStr.substring(0,cqlStr.length - 4);
                // console.log(cqlStr);
                AV.Query.doCloudQuery(cqlStr).then(function (o){
                    for(var i in o['results']){
                        for (var j = 0 ; j < baseReportsDic.length; j++) {
                            if (baseReportsDic[j]['reportId'] == o['results'][i].get('objectId')) {
                                baseReportsDic[j]['start'] = o['results'][i].get('start');
                                baseReportsDic[j]['breathList'] = o['results'][i].get('breathList');
                                baseReportsDic[j]['end'] = o['results'][i].get('end');
                                baseReportsDic[j]['sleepData'] = o['results'][i].get('sleepData');
                                baseReportsDic[j]['AHI'] = o['results'][i].get('AHI');
                                baseReportsDic[j]['eventCnt'] = o['results'][i].get('eventCnt');
                            };
                        }
                    }
                    // console.log(JSON.stringify(baseReportsDic));
                    response.success(baseReportsDic);
                  }, function (e) {
                    console.log("getReportsForSDKWithEndAndBegin error : "+JSON.stringify(e));
                    response.error(e);
                });
            }, function(e){
                console.log("getReportsForSDKWithEndAndBegin error : "+e);
                response.error(e);
            })
        }
    });


});

Date.prototype.Format = function (fmt) { //author: meizz
    var o = {
        "M+": this.getMonth() + 1, //月份
        "d+": this.getDate(), //日
        "h+": this.getHours(), //小时
        "m+": this.getMinutes(), //分
        "s+": this.getSeconds(), //秒
        "q+": Math.floor((this.getMonth() + 3) / 3), //季度
        "S": this.getMilliseconds() //毫秒
    };
    if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
    for (var k in o)
        if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
    return fmt;
}


/**
 * get valid report(AHI != -1),with the given count
 * @Author   bibitiger
 * @DateTime 2017-11-07T17:05:56+0800
 * @param    Date curTime
 * @param    int pastCnt
 * @param    int laterCnt
 * @param    string patientID
 * @return   [{report},{report}]
 */
AV.Cloud.define('getValidReportsWithCnt', function(request, response){
    var params = request.params;
    var pastCnt = params.pastCnt;
    var laterCnt = params.laterCnt;
    var curTime = params.curTime;
    var patientID = params.patientID;

    if (pastCnt == undefined || pastCnt == null
        || laterCnt == undefined || laterCnt == null
        || curTime == undefined || curTime == null
        || patientID == undefined || patientID == null) {
        console.log("getValidReportsWithCnt param error");
        response.error({'error':'getValidReportsWithCnt param error'});
    };

    // var strTime = changeParamDateToJsDate(curTime).Format("yyMMddhhmmss");
    // var numTime = Number(strTime);
    // console.log("strTime: " + strTime);
    // console.log("curTime:" + curTime['iso']);
    // console.log("numTime: " + numTime);

    var curTimeDate = changeParamDateToJsDate(curTime);
    curTimeDate = new Date(curTimeDate.getTime() + 24*60*60*1000);
    curTimeDate.setHours(11);
    curTimeDate.setMinutes(59);
    curTimeDate.setSeconds(59);
    console.log("curTimeDate: " + curTimeDate);

    var laterBaseReports = new Array();
    getValidReports(0,curTimeDate, laterCnt, patientID, laterBaseReports).then(function(laterReports){
        var pastBaseReports = new Array();
        getValidReports(1, curTimeDate, pastCnt, patientID, pastBaseReports).then(function(pastReports){
            var curReports = new Array();
            laterReports.reverse();
            // for(var i in laterReports){
            //     curReports.push(laterReports[i]);
            // }
            // for(var i in pastReports){
            //     curReports.push(pastReports[i]);
            // }
            console.log("later : " + JSON.stringify(laterReports));
            console.log("past : " + JSON.stringify(pastReports));
            // console.log("response curReports cnt : " + curReports.length);
            // response.success(curReports);
            response.success({'later':laterReports, 'past':pastReports});
        }, function(error){
            response.error(error);
        })
    }, function(error){

    })
});

/**
 * changeParamDateToJsDate
 * @Author   bibitiger
 * @DateTime 2017-11-08T14:17:20+0800
 * @param    {object}                 paramDate {"__type": "Date", "iso": "2015-11-21T18:02:52.249Z"}
 * @return   {Date}                           JavaScript Date
 */
function changeParamDateToJsDate(paramDate){
    var tempTime = new Date(paramDate['iso']);
    var localOffset = tempTime.getTimezoneOffset()*60000; //local time offset with utc minute * 60000 millisecond
    var utc = tempTime.getTime() + localOffset; //utc time (GMT) millisecond
    tempTime = new Date(utc);
    return tempTime;
}

/**
 * getValidReports
 * @Author   bibitiger
 * @DateTime 2017-11-08T10:44:32+0800
 * @param    {int}                 direction 0:coming 1:last
 * @param    {Date}                 chekTime  check begin or end time
 * @param    {int}                 reportCnt want check report count
 * @param    {string}                 patientId want check patient object id
 * @param    {array}                 curReports [{report},{report}]
 * @return   {array}                           [{report},{report}]
 */
function getValidReports(direction, chekTime, reportCnt, patientId, curReports){
    var queryReport = new AV.Query('Reports');
    // console.log(patientId);
    var patient = AV.Object.createWithoutData('Patients', patientId);
    queryReport.equalTo('idPatient', patient);
    queryReport.exists('start');
    queryReport.notEqualTo('AHI', -1);
    queryReport.limit(reportCnt);
    queryReport.select(['start', 'AHI', 'createdAt', 'end', 'breathList', 'idPatient']);
    var numTime = Number(chekTime.Format("yyMMddhhmmss"));
    // console.log("chekTime : " + chekTime);
    // console.log("numtime : " + numTime);
    if (direction == 0) {
        queryReport.ascending('start');
        queryReport.greaterThan('start', numTime);
    } else {
        queryReport.descending('start');
        queryReport.lessThanOrEqualTo('start', numTime);
    }

    return queryReport.find().then(function(reports){
        // console.log(JSON.stringify(reports));
        var curGetTime = numTime;
        var endTimeCycle = 0;
        if (curReports.length > 0) {
            curGetTime = (curReports[curReports.length -1]).get('start');
            // if past report time is before 12:00AM, consider this time to be yestoday
            curGetTime = checkReportTimeNeedToPastDay(curGetTime);
            endTimeCycle = (curReports[curReports.length -1]).get('end');
        };
        for(var i in reports){
            // if past report time is before 12:00AM, consider this time to be yestoday
            var pastTime = checkReportTimeNeedToPastDay((reports[i]).get('start'));
                console.log("1111cur :" + curGetTime + "," + "past :" + pastTime);
            if (parseInt(curGetTime / 1000000) == parseInt(pastTime / 1000000)) {
                console.log("cur :" + curGetTime + "," + "past :" + pastTime);
                if (endTimeCycle <= (reports[i]).get('end')) {
                    endTimeCycle = (reports[i]).get('end');
                    curReports.pop();
                    curReports.push(reports[i]);
                };
            } else {
                endTimeCycle = (reports[i]).get('end');
                curReports.push(reports[i]);
            }
            curGetTime = pastTime;
        }

        // console.log("curReports is : "  + JSON.stringify(curReports));
        // console.log("reportCnt : "  + reports.length);
        if (reports.length == 0) { return curReports; };

        if (curReports.length <= reportCnt) {
            var temCurGetTime = (reports[reports.length -1]).get('start')+20000000000000;
            var strCurGetTime = temCurGetTime.toString();
            var tt = new Date(parseInt(strCurGetTime.substr(0,4)),parseInt(strCurGetTime.substr(4,2))-1,parseInt(strCurGetTime.substr(6,2)),parseInt(strCurGetTime.substr(8,2)),
                parseInt(strCurGetTime.substr(10,2)),parseInt(strCurGetTime.substr(12,2)));

            if (direction == 1) {
                tt = new Date(tt.getTime() - 1000);
            };

            console.log("tt:" + tt);
            return getValidReports(direction, tt, reportCnt, patientId, curReports);
        } else {
            return curReports;
        }
    }, function(error){
        console.log("getValidReports error : ");
        console.log("getValidReports error : " + error);
        return error;
    });
}

/**
 * [checkReportTimeNeedToPastDay description]
 * @Author   bibitiger
 * @DateTime 2017-11-14T10:27:18+0800
 * @param    {Number}                 time [description]
 * @return   {Number}                      [description]
 */
function checkReportTimeNeedToPastDay(time){
    // console.log("checkReportTimeNeedToPastDay begin: " + time);
    time = time+20000000000000;
    var strGetTime = time.toString();
    var dateTime = new Date(parseInt(strGetTime.substr(0,4)),parseInt(strGetTime.substr(4,2))-1,
        parseInt(strGetTime.substr(6,2)),parseInt(strGetTime.substr(8,2)),
                parseInt(strGetTime.substr(10,2)),parseInt(strGetTime.substr(12,2)));
    if (parseInt(strGetTime.substr(8,2)) < 12) {
        dateTime = addDate(dateTime, -1);
    }
    // console.log("checkReportTimeNeedToPastDay end: " + dateTime);

    return Number(dateTime.Format("yyMMddhhmmss"));
}

function addDate(date,days){
    var d = new Date(date);
    // console.log("addDate begin: " + d);
    d.setDate(d.getDate()+days);
    // console.log("addDate: " + d);
    return d;
}

/**
 * 获取报告--给第三方的sdk提供
 */
AV.Cloud.define('getReportsCntForSDKWithEndAndBegin', function(request, response){
    var params = request.params;
    var end = params.end;
    var begin = params.begin;
    var patientId = params.patientId;
    var factoryCode = params.factoryCode;
    if (end == null || end == undefined || begin == null || begin == undefined || patientId == null || patientId == undefined) {
        console.log("getReportsCntForSDKWithEndAndBegin param error");
        response.error({'error':'getReportsCntForSDKWithEndAndBegin param error'});
        return;
    };

    var query = new AV.Query('FactoryUserList');
    query.get(patientId).then(function (factoryUser) {
        if (factoryUser.get('factoryCode') == null || factoryUser.get('factoryCode') != factoryCode) {
            response.error({'error':'cant find this user, please check your patientId and factoryCode'});
        } else {
            var patientID = factoryUser.get('patient').id;
            var queryBaseReports = new AV.Query('BaseReports');
            queryBaseReports.equalTo('isDelete', 0);
            var patient = AV.Object.createWithoutData('Patients', patientID);
            queryBaseReports.equalTo('CreateBy', patient);
            queryBaseReports.lessThanOrEqualTo('createdAt', end);
            queryBaseReports.greaterThanOrEqualTo('createdAt',begin);
            queryBaseReports.count().then(function (count) {
                response.success(count);
            }, function(e){
                console.log("getReportsForSDKWithEndAndBegin error : "+e);
                response.error(e);
            })
        }
    });

});

/**
 * 绑定
 */
AV.Cloud.define('boundBluetoothDevice', function(request, response){

    var params = request.params;
    var deviceType = params.deviceType;
    var mPlusSn = params.mPlusSn;
    var hwVersion = params.hwVersion;
    var btVersion = params.btVersion;
    var swVersion = params.swVersion;
    var dSize = params.dSize;
    var sn = params.sn;
    var mac = params.mac;
    var monitor = params.monitor;
    var connectStatus = params.connectStatus;
    var battery = params.battery;
    var random = params.random;

    if(deviceType == null || deviceType == "" || deviceType == undefined){
        console.log("deviceType is null");
        response.error("deviceType is null");
        return;
    }

    if(mPlusSn == null || mPlusSn == "" || mPlusSn == undefined){
        console.log("mPlusSn is null");
        response.error("mPlusSn is null");
        return;
    }

    if(mac == null || mac == "" || mac == undefined){
        console.log("mac is null");
        response.error("mac is null");
        return;
    }

    var queryDevice = new AV.Query('Device');
    queryDevice.equalTo('deviceSN', mPlusSn);
    queryDevice.equalTo('active', true);
    queryDevice.find().then(function(qDevices){
        if(qDevices.length < 1){
            response.error("MPlus is null");
        }else{
            var idPatient = qDevices[0].get('idPatient');
            var deviceId = qDevices[0].id;

            var createDevice = AV.Object.createWithoutData('Device', deviceId);

            if(deviceType == "spt" || deviceType == "MegaRing"){

                var queryExistMac = new AV.Query('BoundDevice');
                queryExistMac.equalTo('mac', mac);
                queryExistMac.equalTo('deviceType', deviceType);
                queryExistMac.notEqualTo('idPatient', idPatient);
                queryExistMac.find().then(function(otherBounds){

                    var queryMPlusBoundSpt = new AV.Query('BoundDevice');
                    queryMPlusBoundSpt.equalTo('idPatient', idPatient);
                    queryMPlusBoundSpt.equalTo('deviceType', deviceType);

                    queryMPlusBoundSpt.find().then(function(mPlusBounds){

                        if(otherBounds.length > 0){

                            if(otherBounds.length > 10){
                                response.error("mac too more");
                                return;
                            }
                            console.log("delete otherBounds" + otherBounds.length);
                            AV.Object.destroyAll(otherBounds).then(function(oDev){

                                if(mPlusBounds.length > 0){

                                    mPlusBounds[0].set('deviceType', deviceType);
                                    mPlusBounds[0].set('mPlusSn', mPlusSn);
                                    mPlusBounds[0].set('hwVersion', hwVersion);
                                    mPlusBounds[0].set('btVersion', btVersion);
                                    mPlusBounds[0].set('swVersion', swVersion);
                                    mPlusBounds[0].set('dSize', dSize);
                                    mPlusBounds[0].set('sn', sn);
                                    mPlusBounds[0].set('mac', mac);
                                    mPlusBounds[0].set('active', true);
                                    mPlusBounds[0].set('idPatient', idPatient);
                                    mPlusBounds[0].set('idDevice', createDevice);
                                    mPlusBounds[0].set('monitor', monitor);
                                    mPlusBounds[0].set('connectStatus', connectStatus);
                                    mPlusBounds[0].set('battery', battery);
                                    mPlusBounds[0].set('random', random);

                                    mPlusBounds[0].save().then(function(eDev){
                                        response.success({
                                            "id":eDev.id
                                        });                                    

                                    }, function(error){
                                        console.log(error);
                                        response.error(error);
                                    });

                                }else{

                                    var BoundDevice = AV.Object.extend('BoundDevice');
                                    var boundDevice = new BoundDevice();
                                    boundDevice.set('deviceType', deviceType);
                                    boundDevice.set('mPlusSn', mPlusSn);
                                    boundDevice.set('hwVersion', hwVersion);
                                    boundDevice.set('btVersion', btVersion);
                                    boundDevice.set('swVersion', swVersion);
                                    boundDevice.set('dSize', dSize);
                                    boundDevice.set('sn', sn);
                                    boundDevice.set('mac', mac);
                                    boundDevice.set('active', true);
                                    boundDevice.set('idPatient', idPatient);
                                    boundDevice.set('idDevice', createDevice);
                                    boundDevice.set('monitor', monitor);
                                    boundDevice.set('connectStatus', connectStatus);
                                    boundDevice.set('battery', battery);
                                    boundDevice.set('random', random);

                                    boundDevice.save().then(function(device){
                                        console.log(device.id);
                                        response.success({
                                            "id":device.id
                                        });
                                    }, function(error){
                                        console.log(error);
                                        response.error(error);
                                    });
                                }

                            }, function(error){
                                console.log(error);
                                response.error(error);
                            });
                        }else{
                            if(mPlusBounds.length > 0){

                                mPlusBounds[0].set('deviceType', deviceType);
                                mPlusBounds[0].set('mPlusSn', mPlusSn);
                                mPlusBounds[0].set('hwVersion', hwVersion);
                                mPlusBounds[0].set('btVersion', btVersion);
                                mPlusBounds[0].set('swVersion', swVersion);
                                mPlusBounds[0].set('dSize', dSize);
                                mPlusBounds[0].set('sn', sn);
                                mPlusBounds[0].set('mac', mac);
                                mPlusBounds[0].set('active', true);
                                mPlusBounds[0].set('idPatient', idPatient);
                                mPlusBounds[0].set('idDevice', createDevice);
                                mPlusBounds[0].set('monitor', monitor);
                                mPlusBounds[0].set('connectStatus', connectStatus);
                                mPlusBounds[0].set('battery', battery);
                                mPlusBounds[0].set('random', random);

                                mPlusBounds[0].save().then(function(eDev){
                                    response.success({
                                        "id":eDev.id
                                    });                                    

                                }, function(error){
                                    console.log(error);
                                    response.error(error);
                                });

                            }else{

                                var BoundDevice = AV.Object.extend('BoundDevice');
                                var boundDevice = new BoundDevice();
                                boundDevice.set('deviceType', deviceType);
                                boundDevice.set('mPlusSn', mPlusSn);
                                boundDevice.set('hwVersion', hwVersion);
                                boundDevice.set('btVersion', btVersion);
                                boundDevice.set('swVersion', swVersion);
                                boundDevice.set('dSize', dSize);
                                boundDevice.set('sn', sn);
                                boundDevice.set('mac', mac);
                                boundDevice.set('active', true);
                                boundDevice.set('idPatient', idPatient);
                                boundDevice.set('idDevice', createDevice);
                                boundDevice.set('monitor', monitor);
                                boundDevice.set('connectStatus', connectStatus);
                                boundDevice.set('battery', battery);
                                boundDevice.set('random', random);

                                boundDevice.save().then(function(device){
                                    console.log(device.id);
                                    response.success({
                                        "id":device.id
                                    });
                                }, function(error){
                                    console.log(error);
                                    response.error(error);
                                });
                            }
                            
                        }

                    }, function(error){
                        console.log(error);
                        response.error(error);
                    })

                }, function(error){
                    console.log(error);
                    response.error(error);
                });

            }else{
                console.log("deviceType error");
                response.error("deviceType error");
            }

        }
    }, function(error){
        console.log(error);
        response.error(error);
    });

});


/**
 * 解绑
 */
AV.Cloud.define('unboundBluetoothDevice', function(request, response){

    var params = request.params;
    var deviceType = params.deviceType;
    var mPlusSn = params.mPlusSn;
    var dSize = params.dSize;

    if(deviceType == null || deviceType == "" || deviceType == undefined){
        console.log("deviceType is null");
        response.error("deviceType is null");
        return;
    }

    if(mPlusSn == null || mPlusSn == "" || mPlusSn == undefined){
        console.log("mPlusSn is null");
        response.error("mPlusSn is null");
        return;
    }

    // if(size == null || size == "" || size == undefined){
    //  console.log("size is null");
    //  response.error("size is null");
    //  return;
    // }

    if(deviceType == "spt" || deviceType == "MegaRing"){

        var queryDev = new AV.Query('Device');
        queryDev.equalTo('deviceSN', mPlusSn);
        queryDev.equalTo('active', true);
        queryDev.find().then(function(plusList){

            if(plusList.length < 1){
                response.error("no device");
                return;
            }

            var pointIdPatient = plusList[0].get("idPatient");

            var queryBoundDevice = new AV.Query('BoundDevice');
            queryBoundDevice.equalTo('idPatient', pointIdPatient);
            queryBoundDevice.equalTo('deviceType', deviceType);

            queryBoundDevice.find().then(function(bDev){

                if(bDev.length > 0 && bDev.length < 10){

                    AV.Object.destroyAll(bDev).then(function(deleteList){
                        console.log("delDevice success");
                        response.success({
                            "id": ""
                        });
                    }, function(error){
                        console.log(error);
                        response.error(error);
                    });


                }else{
                    response.success({
                        "id": ""
                    });
                }

            }, function(error){
                console.log(error);
                response.error(error);
            });
            
        }, function(error){
            console.log(error);
            response.error(error);
        });

    }else{
        console.log("deviceType error");
        response.error("deviceType error");
    }
});


/**
 * 完成设备状态更新或添加
 */
AV.Cloud.define('addOrUpdateDevice', function(request, response){

    var params = request.params;

    var uuid = params.uuid;
    var deviceSN = params.deviceSN;
    var localIP = params.localIP;
    var wifiName = params.wifiName;
    var monitorStatus = params.monitorStatus;
    var romVersion = params.romVersion;
    var versionNO = params.versionNO;
    var workStatus = params.workStatus;

    if(uuid == null || uuid == "" || uuid == undefined){
        console.log("uuid is null");
        response.error("uuid is null");
        return;
    }

    if(deviceSN == null || deviceSN == "" || uuid == undefined){
        console.log("deviceSN is null");
        response.error("deviceSN is null");
        return;
    }

    var queryDevByUuid = new AV.Query('Device');
    queryDevByUuid.equalTo('UUID', uuid);
    queryDevByUuid.find().then(function(dev3){

        if(dev3.length > 3){
            console.log("dev3 system error");
            response.error("dev3 system error");
            return;
        }

        if(dev3.length > 0){

            var query = new AV.Query('Device');
            query.equalTo('deviceSN', deviceSN);
            query.find().then(function(dev){

                if(dev.length > 9){
                    console.log("dev system error");
                    response.error("dev system error");
                    return;
                }

                if(dev.length > 0){
                    // var deleteDevs = [];
                    var position = 0;
                    for(var i=0;i<dev.length;i++){
                        if(dev[i].get("active") == true){
                            position = i;
                            break;
                        }
                    }
                    // for(var i = 0; i< dev.length;i++){
                    //  if(i != position){
                    //      deleteDevs.push(dev[i]);
                    //  }
                    // }
                    // for(var i = 0; i< dev3.length;i++){
                    //  if(dev3[i].id == dev[position].id){
                    //      continue;
                    //  }
                    //  deleteDevs.push(dev3[i]);
                    // }

                    dev[position].set('UUID', uuid);
                    dev[position].set('deviceSN', deviceSN);
                    dev[position].set('localIP', localIP);
                    dev[position].set('wifiName', wifiName);
                    dev[position].set('monitorStatus', monitorStatus);
                    dev[position].set('romVersion', romVersion);
                    dev[position].set('versionNO', versionNO);
                    dev[position].set('workStatus', workStatus);

                    var idPatient2 = dev3[0].get('idPatient');
                    console.log("idPatient2:" + idPatient2.id);
                    if(idPatient2 != null && idPatient2.id != null){
                        dev[position].set('idPatient', idPatient2);
                        dev[position].set('active', true);
                    }

                    // dev[0].set('active', true);

                    dev[position].save().then(function(dev1){
                        if(dev3.length > 0){
                            console.log("dev3 length:" + dev3.length);
                            /**
                             * 保留
                             */
                            console.log("---dev1:" + dev1.id);

                            var deleteDevs = [];
                            for(var i=0; i<dev3.length; i++){
                                console.log("---dev3 id:" + dev3[i].id);
                                if(dev3[i].id == dev1.id){
                                    continue;
                                }
                                deleteDevs.push(dev3[i]);
                            }

                            console.log("deleteDevs length:" + deleteDevs.length);
                            if(deleteDevs.length > 10 || deleteDevs.length == 0){
                                console.log("deleteDevs system error");
                                response.success({
                                    "objectId": dev1.id,
                                    "rawDataUpload" : dev1.get('rawDataUpload'),
                                    "idPatient" : dev1.get('idPatient'),
                                    "period" : dev1.get('period'),
                                    "ledOnTime" : dev1.get('ledOnTime')
                                });
                            }else{
                                AV.Object.destroyAll(deleteDevs).then(function(resultDev){
                                    console.log("deleteDevs success id1:" + dev[position].id);
                                    response.success({
                                        "objectId": dev1.id,
                                        "rawDataUpload" : dev1.get('rawDataUpload'),
                                        "idPatient" : dev1.get('idPatient'),
                                        "period" : dev1.get('period'),
                                        "ledOnTime" : dev1.get('ledOnTime')
                                    });
                                }, function(error){
                                    console.log(error);
                                    response.error(error);
                                });
                            }

                        }else{
                            response.success({
                                "objectId": dev1.id,
                                "rawDataUpload" : dev1.get('rawDataUpload'),
                                "idPatient" : dev1.get('idPatient'),
                                "period" : dev1.get('period'),
                                "ledOnTime" : dev1.get('ledOnTime')
                            });
                        }
                    }, function(error){
                        console.log(error);
                        response.error(error);
                    });

                }else{

                    dev3[0].set('UUID', uuid);
                    dev3[0].set('deviceSN', deviceSN);
                    dev3[0].set('localIP', localIP);
                    dev3[0].set('wifiName', wifiName);
                    dev3[0].set('monitorStatus', monitorStatus);
                    dev3[0].set('romVersion', romVersion);
                    dev3[0].set('versionNO', versionNO);
                    dev3[0].set('workStatus', workStatus);

                    var idPatient2 = dev3[0].get('idPatient');
                    console.log("idPatient2:" + idPatient2);
                    if(idPatient2 != null && idPatient2.id != null){
                        dev3[0].set('active', true);
                    }
                    // device.set('active', true);

                    dev3[0].save().then(function(createDevice){

                            var delDevice = [];
                            for(var i = 0; i< dev3.length;i++){
                                if(dev3[i].id == createDevice.id){
                                    continue;
                                }
                                delDevice.push(dev3[i]);
                            }
                            console.log("delDevice length:" + delDevice.length);

                            if(delDevice.length > 10 || delDevice.length == 0){
                                console.log("delDevice system error");
                                response.success({
                                    "objectId": createDevice.id,
                                    "rawDataUpload" : createDevice.get('rawDataUpload'),
                                    "idPatient" : createDevice.get('idPatient'),
                                    "period" : createDevice.get('period'),
                                    "ledOnTime" : createDevice.get('ledOnTime')
                                });
                            }else{
                                AV.Object.destroyAll(delDevice).then(function(){
                                    console.log("delDevice success");
                                    response.success({
                                        "objectId": createDevice.id,
                                        "rawDataUpload" : createDevice.get('rawDataUpload'),
                                        "idPatient" : createDevice.get('idPatient'),
                                        "period" : createDevice.get('period'),
                                        "ledOnTime" : createDevice.get('ledOnTime')
                                    });
                                }, function(error){
                                    console.log(error);
                                    response.error(error);
                                });
                            }

                    }, function(error){
                        console.log(error);
                        response.error(error);
                    });
                }
            }, function(error){
                console.log(error);
                response.error(error);
            });

        }else{
            console.log("not find uuid");
            response.error("not find uuid");
        }



    }, function(error){
        console.log(error);
        response.error(error);
    });

});

AV.Cloud.define('getDevices', function(request, response){

    var params = request.params;
    // var deviceSN = params.deviceSN;
    var idPatient = params.idPatient;
    var deviceSN = params.deviceSN;

    // if((!idPatient || idPatient == "") &&
    // (!deviceSN || deviceSN == "")){
    //     console.log("{error:1}");
    //     response.error("{error:1}");
    // }

    if(!idPatient){
        console.log("{error:1}");
        response.error("{error:1}");
        return;
    }
    // console.log('After idPatient is null');

    var queryDevice = new AV.Query('Device');
    queryDevice.equalTo('active', true);
    // if(deviceSN){
    //     queryDevice.equalTo('deviceSN', deviceSN);
    // }else{
        var createPatient = AV.Object.createWithoutData('Patients', idPatient);
        queryDevice.equalTo('idPatient', createPatient);
    // }
    queryDevice.find().then(function(mPlusDevices){
        if(mPlusDevices.length < 1){
            response.success(mPlusDevices);
        }else{
            console.log(JSON.stringify(mPlusDevices));
            var deviceSN1 = mPlusDevices[0].get("deviceSN");
            console.log("deviceSN1:" + deviceSN1);
            if(!deviceSN1){
                console.log("{error:1}");
                response.error("{error:1}");
            }
            var queryBoundDevice = new AV.Query('BoundDevice');
            queryBoundDevice.equalTo('idPatient', createPatient);
            queryBoundDevice.find().then(function(boundDevices){
                // var jsonboundDevices = JSON.stringify(boundDevices);
                // console.log("jsonboundDevices:" + jsonboundDevices);
                console.log("length:" + boundDevices.length);
                
                var bDevices = [];
                for(var j =0; j< boundDevices.length; j++){
                    var bDevice = {};
                    bDevice.hwVersion = boundDevices[j].get("hwVersion");
                    bDevice.btVersion = boundDevices[j].get("btVersion");
                    bDevice.swVersion = boundDevices[j].get("swVersion");
                    bDevice.dSize = boundDevices[j].get("dSize");
                    bDevice.active = boundDevices[j].get("active");
                    bDevice.deviceType = boundDevices[j].get("deviceType");
                    bDevice.idPatient = boundDevices[j].get("idPatient");
                    bDevice.sn = boundDevices[j].get("sn");
                    bDevice.idDevice = boundDevices[j].get("idDevice");
                    bDevice.mac = boundDevices[j].get("mac");
                    bDevice.battery = boundDevices[j].get("battery");
                    bDevice.powerStatus = boundDevices[j].get("powerStatus");
                    bDevice.monitor = boundDevices[j].get("monitor");
                    bDevice.connectStatus = boundDevices[j].get("connectStatus");
                    bDevice.random = boundDevices[j].get("random");
                    bDevice.objectId = boundDevices[j].id;
                    bDevices.push(bDevice);
                }
                mPlusDevices[0].set("boundDevices", bDevices);
                response.success(mPlusDevices);
            }, function(error){
                console.log(error);
                response.error(error);
            });
        }


    }, function(error){
        console.log(error);
        response.error(error);
    });

    // var queryDevice = new AV.Query('Device');
    // queryDevice.equalTo('active', true);

});




AV.Cloud.define('updateADevices', function(request, response) {

    var params = request.params;
    var deviceSN = params.deviceSN;
    var workStatus = params.workStatus;
    var sleepStatus = params.sleepStatus;
    var monitorStatus = params.monitorStatus;
    var localIP = params.localIP;
    var wifiName = params.wifiName;
    var boundDevices = params.boundDevices;

    console.log(JSON.stringify(params));

    if(!deviceSN){
        response.error("error");
        return;
    }

    var query = new AV.Query('Device');
    query.equalTo('deviceSN', deviceSN);
    query.equalTo('active', true);
    query.find().then(function(dev) {
        if(dev.length === 0){
            response.error("can not find device");
        }else {
            dev[0].set('workStatus',workStatus);
            dev[0].set('sleepStatus',sleepStatus);
            dev[0].set('monitorStatus',monitorStatus);
            dev[0].set('localIP',localIP);
            dev[0].set('wifiName',wifiName);
            dev[0].save().then(function(newDev){

                var pointIdPatient = dev[0].get("idPatient");
                if(!pointIdPatient){
                    response.error("not idPatient");
                    return;
                }

                var qBoundDevice = new AV.Query('BoundDevice');
                qBoundDevice.equalTo('idPatient', pointIdPatient);
                qBoundDevice.equalTo('active', true);
                qBoundDevice.find().then(function(qDevices){
                    // var jsonboundDevices = JSON.stringify(boundDevices);
                    // console.log("jsonboundDevices:" + jsonboundDevices);
                    console.log("length:" + qDevices.length);
                    
                    var pDevices = [];
                    for(var j =0; j< qDevices.length; j++){
                        var bDevice = {};
                        bDevice.dSize = qDevices[j].get("dSize");
                        bDevice.active = qDevices[j].get("active");
                        bDevice.deviceType = qDevices[j].get("deviceType");
                        bDevice.sn = qDevices[j].get("sn");
                        bDevice.mac = qDevices[j].get("mac");
                        bDevice.hwVersion = qDevices[j].get("hwVersion");
                        bDevice.btVersion = qDevices[j].get("btVersion");
                        bDevice.swVersion = qDevices[j].get("swVersion");
                        bDevice.random = qDevices[j].get("random");
                        bDevice.objectId = qDevices[j].id;

                        if(boundDevices && boundDevices.length > 0){
                            for(var i = 0; i < boundDevices.length; i++){
                                if(boundDevices[i].mac && boundDevices[i].mac == qDevices[j].get("mac")){
                                    if(boundDevices[i].hwVersion){
                                        bDevice.hwVersion = boundDevices[i].hwVersion;
                                    }
                                    if(boundDevices[i].btVersion){
                                        bDevice.btVersion = boundDevices[i].btVersion;
                                    }
                                    if(boundDevices[i].swVersion){
                                        bDevice.swVersion = boundDevices[i].swVersion;
                                    }
                                }
                            }
                        }
                        pDevices.push(bDevice);
                    }

                    if(boundDevices && boundDevices.length > 0){
                        var mac = boundDevices[0].mac;
                        console.log("mac:" + mac);
                        if(!mac){
                            response.error("mac is null");
                            return;
                        }

                        var updateBoundDevices = [];
                        for(var i = 0; i < boundDevices.length; i++){
                            if(!boundDevices[i].mac){
                                continue;
                            }
                            for(var k = 0; k< qDevices.length; k++){
                                if(boundDevices[i].mac == qDevices[k].get("mac")){

                                    if(boundDevices[i].hwVersion){
                                        qDevices[k].set('hwVersion', boundDevices[i].hwVersion);
                                    }
                                    if(boundDevices[i].btVersion){
                                        qDevices[k].set('btVersion', boundDevices[i].btVersion);
                                    }
                                    if(boundDevices[i].swVersion){
                                        qDevices[k].set('swVersion', boundDevices[i].swVersion);
                                    }
                                    qDevices[k].set('connectStatus', boundDevices[i].connectStatus);
                                    if(boundDevices[i].dSize){
                                        qDevices[k].set('dSize', boundDevices[i].dSize);
                                    }
                                    qDevices[k].set('battery', boundDevices[i].battery);
                                    qDevices[k].set('monitor', boundDevices[i].monitor);
                                    qDevices[k].set('powerStatus', boundDevices[i].powerStatus);
                                    updateBoundDevices.push(qDevices[k]);
                                }
                            }
                        }
                        
                        if(updateBoundDevices.length > 0){
                            AV.Object.saveAll(updateBoundDevices).then(function(updateDevs){
                                    response.success({
                                        "objectId" : newDev.id,
                                        "rawDataUpload" : newDev.get('rawDataUpload'),
                                        "modeType" : newDev.get('modeType'),
                                        "sptLieWarnStatus" : newDev.get('sptLieWarnStatus'),
                                        "idPatient" : newDev.get('idPatient'),
                                        "period" : newDev.get('period'),
                                        "ledOnTime" : newDev.get('ledOnTime'),
                                        "frameArea" : newDev.get('frameArea'),
                                        "isAutoSleep" : newDev.get('isAutoSleep'),
                                        "updatedAt" : newDev.get('updatedAt'),
                                        "setTimezone" : newDev.get('setTimezone'),
                                        "boundDevices":pDevices
                                    });
                            }, function(error){
                                console.log(error);
                                response.error(error);
                            });
                        }else{
                            response.success({
                                "objectId" : newDev.id,
                                "rawDataUpload" : newDev.get('rawDataUpload'),
                                "modeType" : newDev.get('modeType'),
                                "sptLieWarnStatus" : newDev.get('sptLieWarnStatus'),
                                "idPatient" : newDev.get('idPatient'),
                                "period" : newDev.get('period'),
                                "ledOnTime" : newDev.get('ledOnTime'),
                                "frameArea" : newDev.get('frameArea'),
                                "isAutoSleep" : newDev.get('isAutoSleep'),
                                "updatedAt" : newDev.get('updatedAt'),
                                "setTimezone" : newDev.get('setTimezone'),
                                "boundDevices":pDevices
                            });
                        }


                    }else{
                        response.success({
                            "objectId" : newDev.id,
                            "rawDataUpload" : newDev.get('rawDataUpload'),
                            "modeType" : newDev.get('modeType'),
                            "sptLieWarnStatus" : newDev.get('sptLieWarnStatus'),
                            "idPatient" : newDev.get('idPatient'),
                            "period" : newDev.get('period'),
                            "ledOnTime" : newDev.get('ledOnTime'),
                            "frameArea" : newDev.get('frameArea'),
                            "isAutoSleep" : newDev.get('isAutoSleep'),
                            "updatedAt" : newDev.get('updatedAt'),
                            "setTimezone" : newDev.get('setTimezone'),
                            "boundDevices":pDevices
                        });
                    }
                    
                    
                }, function(error){
                    console.log(error);
                    response.error(error);
                });


            });
        }
    },function(err) {
        console.log(err);
        response.error(err);
    });
});




/**
 * 解绑
 */
AV.Cloud.define('unboundMPlusDevice', function(request, response){

    var params = request.params;
    var idPatient = params.idPatient;


    if(!idPatient){
        console.log("idPatient is null");
        response.error("idPatient is null");
        return;
    }

    var pointPatient = AV.Object.createWithoutData('Patients', idPatient);
    
    var queryDevice = new AV.Query('Device');
    queryDevice.equalTo('idPatient', pointPatient);
    queryDevice.equalTo('active', true);
    queryDevice.find().then(function(dev1){
        if(dev1.length < 1 || dev1.length > 10){
            response.error("Can not device");
            return;
        }
        dev1[0].set('active', false);
        dev1[0].save().then(function(saveDevice){
            
            var queryBoundDevice = new AV.Query('BoundDevice');
            queryBoundDevice.equalTo('idPatient', pointPatient);
            queryBoundDevice.find().then(function(bDevice){

                if(bDevice.length > 5){
                    console.log("query error");
                    response.error("query error");
                    return;
                }

                var deleteDevs = [];

                for(var i = 0; i< bDevice.length; i++){
                    deleteDevs.push(bDevice[i]);
                }

                console.log("deleteDevs length:" + deleteDevs.length);
                if(deleteDevs.length == 0 || deleteDevs.length > 3){
                    response.success("{}");
                    return;
                }
                
                AV.Object.destroyAll(deleteDevs).then(function(resultDev){
                    response.success("{}");
                }, function(error){
                    console.log(error);
                    response.error(error);
                });
                
                
            }, function(error){
                console.log(error);
                response.error(error);
            });

        }, function(error){
            console.log(error);
            response.error(error);
        });

    }, function(error){
        console.log(error);
        response.error(error);
    });

});


/*
    phone client use when checked device has connect internet
    deviceSN:设备deviceSN
    patientId:用户的patientId
*/
AV.Cloud.define('boundDeviceForClient', function(request, response) {

    var params = request.params;
    var deviceID = params.deviceID;
    var deviceSN = params.deviceSN;
    var patientId = params.patientId;
    var uuid = params.uuid;
    console.log("params : " + JSON.stringify(params));

    var query = new AV.Query('Device');
    query.equalTo('deviceSN', deviceSN);
    query.find().then(function(dev) {
        if (dev.length <= 0) {
            response.error("没有找到对应设备");
        } else {
            //bound
            var dev1 = [];
            for (var i = 0; i < dev.length; i++) {
                if(dev[i].id == deviceID) {
                    continue;
                }
                dev1.push(dev[i]);
            };
            console.log(dev1.length);
            console.log(dev.length);
            for (var i = 0; i < dev.length; i++) {
                if (dev[i].id == deviceID) {
                    var targetTodoFolder = AV.Object.createWithoutData('Patients', patientId);
                    dev[i].set('idPatient',targetTodoFolder);
                    dev[i].set('active',true);
                    dev[i].save().then(function(newDev){
                        AV.Object.destroyAll(dev1).then(function(){
                            var queryPatient = new AV.Query("Device");
                            var targetTodoFolder = AV.Object.createWithoutData('Patients', patientId);
                            if (targetTodoFolder == null) {
                                response.error("拥有者不存在");
                            }
                            queryPatient.equalTo('idPatient',targetTodoFolder);
                            queryPatient.notEqualTo('objectId', deviceID);
                            queryPatient.find().then(function(devices){
                                console.log(devices.length);
                                // devices.map(function(device) {
                                //  device.set('active',false);
                                // });
                                AV.Object.destroyAll(devices).then(function(savedevices){
                                    if (uuid != null) {
                                        var queryUUID = new AV.Query("Device");
                                        queryUUID.equalTo('UUID',uuid);
                                        queryUUID.doesNotExist('idPatient');
                                        queryUUID.find().then(function(devicesUUID){
                                            if (devicesUUID.length > 0) {
                                                AV.Object.destroyAll(devicesUUID).then(function(){
                                                    response.success({
                                                        "objectId" : deviceID
                                                    });
                                                }, function(e){
                                                    console.log(e);
                                                    response.error(e);
                                                })
                                            } else {
                                                response.success({
                                                    "objectId" : deviceID
                                                });
                                            }
                                        },function(e){
                                            console.log(e);
                                            response.error(e);
                                        })
                                    } else {
                                        response.success({
                                            "objectId" : deviceID
                                        });
                                    }
                                },function(e){
                                    console.log(e);
                                    response.error(e);
                                });
                            }, function(e){
                                console.log(e);
                                response.error(e);
                            })
                    }, function(err) {
                        console.log(err);
                        response.error(err);
                    });
                });
            };
        }
        }
    },function(err) {
        console.log(err);
        response.error(err);
    });
});

/*
OTA升级
add by chengchao
change by fanxu 2017-4-20
date 2016-11-29
*/

AV.Cloud.define('ota', function(request, response) {
/*
 * API Input:   deviceVer                    //当前rom版本
 *              deviceAppVer                 //当前固件版本
 * API Output: {"result":{"OTAtype":"F",    //F为完整包，D为差分包
 *              "patchURL":"<URL>",         //rom的ftp地址，同服务器
 *              "endVer":"ROM160110_V1.1.4",//ROM版本最新版本号，如当前为最新则显示“NULL”
 *              "StartVer":"",              //输入时，给出的当前rom版本号  deviceVer
 *              "MD5":"",                   //给出的差分包或者完整包的MD5码
                "size":"",                  //给出升级包的文件大小
 *              "AppPatchURL":"<URL>",      //固件的ftp地址，同服务器
 *              "EndAppVer":"1.1.4",        //固件版本最新版本号，ps：rom有更新时始终给出最新固件的信息
 *              "StartAppVer":"1.1.4",      //输入时，给出的当前固件版本号  deviceAppVer
 *              "AppMD5":"",                //给出的最新固件包的MD5码
                "AppSize":"",               //给出最新固件包的文件大小
 *              "objectId":"5693678160b2638510a51bbd",
 *              "createdAt":"2016-01-11T08:27:45.063Z",
 *              "updatedAt":"2016-01-11T08:28:05.768Z"}}
 */

// handle client's input(device ROM version) to find patches
// function findPatch() {

    var user = request.user;
    var deviceVer = request.params.deviceVer;
    var deviceAppVer = request.params.deviceAppVer;
    var deviceType = request.params.deviceType;

    if(!deviceAppVer || !deviceVer){
        console.log("device appVer or deviceVer is null");
        response.error("device appVer or deviceVer is null");
    }

    console.log("deviceType:" + deviceType + ",deviceAppVer:" + deviceAppVer + ",deviceVer:" + deviceVer);

    var userType = "customer";
    if (user != null) {
        userType = user.get("UserType");
    };

    var url = "DeviceVersion";

    var deviceAppVerArray = deviceAppVer.split(".");
    var isRightAppVer = (deviceAppVerArray.length > 1 && deviceAppVerArray[1] == 4);

    var t;
    if(!isRightAppVer){
        t = deviceAppVer;
        deviceAppVer = deviceVer;
        deviceVer = t;
    }

    console.log("New deviceType:" + deviceType + ",deviceAppVer:" + deviceAppVer + ",deviceVer:" + deviceVer);

    if(!deviceType){

        if(isRightAppVer){
            if((deviceAppVer && (deviceAppVer.substring(0, 1) == 2)) || 
            (deviceVer && (deviceVer.substring(0, 1) == 2))){
                console.log("rk upgrade");
                deviceType = "rk";
            }else{
                console.log("mtk upgrade");
                deviceType = "mtk";
            }
        }else{
            if(deviceAppVer && (deviceAppVer.substring(0, 1) == 2)){
                console.log("rk upgrade");
                deviceType = "rk";
            }else{
                console.log("mtk upgrade");
                deviceType = "mtk";
            }
        }


    }

    if(!isRightAppVer){
        deviceAppVer = "1.4.0";
    }

    console.log("deviceType:" + deviceType);

    if(deviceType == "rk"){
        if(userType == "tester"){
            url = "RkDeviceVersionForTest";
        }else{
            url = "RkDeviceVersion";
        }
    }else{
        if(userType == "tester"){
            url = "DeviceVersionForTest";
        }else{
            url = "DeviceVersion";
        }
    }


    var startQuery = new AV.Query("DeviceRomDifPackageList");
    startQuery.equalTo("startVer", deviceVer);

    var data = {};

    // get the latest APP Version
    var endAppQuery = new AV.Query(url);
    endAppQuery.exists("versionNum");
    endAppQuery.find().then(function(devVerResult) {
        var endAppVer = devVerResult[0].get("versionNum");
        var appMD5 = devVerResult[0].get("md5");
        var appPatchURL =  devVerResult[0].get("pathUrl");
        var appSize = devVerResult[0].get("size");
        var updateStr = devVerResult[0].get("updateStr");
        // get the latest version full package info - to get latest ROM ver
        var latestVerQuery= new AV.Query("DeviceRomVersion");
        latestVerQuery.exists("version");
        latestVerQuery.find().then(function(result) {
            if (result) {
                var endVer = result[0].get("version");
                //如果rom版本等于或者大于最新版本
                if (deviceVer === endVer || deviceVer > endVer) {             // already the latest version
                    data["patchURL"] = "NULL";

                    if (deviceAppVer === endAppVer || endAppVer.indexOf(deviceAppVer) > -1 || deviceAppVer.indexOf(endAppVer) > -1) {
                        // 如果固件版本等于最新版本，则不需要更新
                        data["EndAppVer"] = "NULL";
                    } else {
                        //固件版本不想等则返回最新的固件版本信息
                        data["AppPatchURL"] = appPatchURL;
                        data["EndAppVer"] = endAppVer;
                        data["AppMD5"] = appMD5;
                        data["StartAppVer"] = deviceAppVer;
                        data["AppSize"] = appSize;
                        data["updateStr"] = updateStr;
                    }

                    response.success(data);
                } else {
                    //查找
                    var endQuery = new AV.Query("DeviceRomDifPackageList");
                    endQuery.equalTo("endVer", endVer);
                    var mainQuery = new AV.Query.and(startQuery, endQuery);

                    mainQuery.find().then(function(difResult) {
                        if (difResult.length > 0) {
                            var OTAtype = difResult[0].get("otaType");
                            var PatchURL = difResult[0].get("pathUrl");
                            var EndVer = difResult[0].get("endVer");
                            var MD5 = difResult[0].get("md5");
                            var size = difResult[0].get("size");

                            // return APP update if ROM needs updadting
                            data["AppPatchURL"] = appPatchURL;
                            data["EndAppVer"] = endAppVer;
                            data["AppMD5"] = appMD5;
                            data["StartAppVer"] = deviceAppVer;
                            data["AppSize"] = appSize;
                            data["updateStr"] = updateStr;

                            data["OTAtype"] = OTAtype;
                            data["patchURL"] = PatchURL;
                            data["endVer"] = endVer;
                            data["startVer"] = deviceVer;
                            data["MD5"] = MD5;
                            data["size"] = size;

                            response.success(data);
                        } else {
                            // no diff package is found, look for full package
                            var startQuery2 = new AV.Query("DeviceRomDifPackageList");
                            startQuery2.equalTo("startVer", "");
                            //测试日志
                            console.log("endVer:" + endVer);
                            var query = new AV.Query.and(startQuery2, endQuery);
                            query.find().then(function(fullResult) {
                                if (fullResult.length > 0) {
                                    var OTAtype = fullResult[0].get("otaType");
                                    var PatchURL = fullResult[0].get("pathUrl");
                                    var EndVer = fullResult[0].get("endVer");
                                    var MD5 = fullResult[0].get("md5");
                                    var size = fullResult[0].get("size");

                                    // return APP update if ROM needs updadting
                                    data["AppPatchURL"] = appPatchURL;
                                    data["EndAppVer"] = endAppVer;
                                    data["AppMD5"] = appMD5;
                                    data["StartAppVer"] = deviceAppVer;
                                    data["AppSize"] = appSize;
                                    data["updateStr"] = updateStr;

                                    data["OTAtype"] = OTAtype;
                                    data["patchURL"] = PatchURL;
                                    data["endVer"] = endVer;
                                    data["startVer"] = deviceVer;
                                    data["MD5"] = MD5;
                                    data["size"] = size;

                                    response.success(data);
                                } else {
                                    // Dose not have available ROM update packages
                                    data["patchURL"] = "NULL";
                                    data["EndAppVer"] = "NULL";

                                    response.success(data);
                                }
                            });
                        }
                    });
                }

            }
        });

    });


// }

// findPatch();

})

/*
    create by chengchao
    write by lidongdong
*/
AV.Cloud.define('updateDevice', function(request, response) {
/**
 *  用于设备端调用。
 *  功能：更新device 信息，并返回最新device数据
 *  更新：添加localIP和period 返回Device数据和leancloud保持一致 2016-07-15 15:20:17 李冬冬
 **/
    var params = request.params;
    var deviceSN = params.deviceSN;
    var workStatus = params.workStatus;
    var sleepStatus = params.sleepStatus;
    var monitorStatus = params.monitorStatus;
    var localIP = params.localIP;
    var wifiName = params.wifiName;

    var query = new AV.Query('Device');
    query.equalTo('deviceSN', deviceSN);
    query.find().then(function(dev) {
        if(dev.length === 0){
            response.error("can not find device");
            // var Device = AV.Object.extend('Device');
         //    var device = new Device();

         //    device.set('deviceSN',deviceSN);
         //    device.set('workStatus',workStatus);
         //    device.set('sleepStatus',sleepStatus);
         //    device.set('localIP',localIP);
         //    device.set('wifiName',wifiName);

      //       device.save().then(function(device) {
      //            response.success({
         //            "objectId" : device.id,
         //            "rawDataUpload" : device.get('rawDataUpload'),
         //            "idPatient" : device.get('idPatient'),
         //            "period" : device.get('period'),
         //            "ledOnTime" : device.get('ledOnTime')
         //        });
      //       }, function(err) {
      //           response.error(err);
      //       });
        }
        else {
            dev[0].set('workStatus',workStatus);
            dev[0].set('sleepStatus',sleepStatus);
            dev[0].set('monitorStatus',monitorStatus);
            dev[0].set('localIP',localIP);
            dev[0].set('wifiName',wifiName);
            dev[0].save().then(function(newDev){
                response.success({
                    "objectId" : newDev.id,
                    "rawDataUpload" : newDev.get('rawDataUpload'),
                    "idPatient" : newDev.get('idPatient'),
                    "period" : newDev.get('period'),
                    "ledOnTime" : newDev.get('ledOnTime')
                });
            });
        }
    },function(err) {
        console.log(err);
        response.error(err);
    });
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
                            // if(listReport[0].get('Check')){
                            //  if("WaitDoc" == listReport[0].get('Check').get('State') || "WaitDocOfficial" == listReport[0].get('Check').get('State') || "InCheck" == listReport[0].get('Check').get('State')){
                            //      console.log("RequestDoctor report has in check, check state is " + JSON.stringify(listReport[0].get('Check').get('State')));
                            //      response.error("report has in check, check state is " + JSON.stringify(listReport[0].get('Check').get('State')));
                            //      return;
                            //  }
                            // }

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
                                                state: "NoticeDocAccp",
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

                    user.set('WXOpenId',openId);
                    user.save();

                    var Patient = AV.Object.extend('Patients');
                    var patient = new Patient();
                    // patient.set('objectId',user.id);
                    patient.set('user',user);
                    patient.set('name',user.get('username'));

                    // 新建一个 ACL 实例
                    // var acl = new AV.ACL();
                    // acl.setPublicReadAccess(true);
                    // acl.setWriteAccess(user,true);
                    //   // 将 ACL 实例赋予 patient 对象
                    // patient.setACL(acl);

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
    var type = request.params.type;

    var query = new AV.Query(AV.User);
    query.equalTo('mobilePhoneNumber', phoneNumber);
    query.find().then(function(results) {
      if(results.length > 0){
          response.error('该手机号已被注册');
      }else{

        if(type > 0){
            AV.Cloud.requestSmsCode({
                mobilePhoneNumber:phoneNumber,
                template:'createUser',    
                sign:'睡眠仪'                
              }).then(function() {
                //发送成功
                response.success(phoneNumber);
              }, function(err) {
                //发送失败
                  response.error(err);
              });
        }else{
            AV.Cloud.requestSmsCode(phoneNumber).then(function() {
                //发送成功
                response.success(phoneNumber);
              }, function(err) {
                //发送失败
                  response.error(err);
              });
        }


      }
    }, function(err) {
      //发送失败
        response.error(err);
    });
});

/**
 * [generateUUID description]
 * @Author   bibitiger
 * @DateTime 2017-07-18T10:40:34+0800
 * @return   {[type]}                 [description]
 */
function generateUUID() {
    var d = new Date().getTime();
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = (d + Math.random()*16)%16 | 0;
      d = Math.floor(d/16);
      return (c=='x' ? r : (r&0x3|0x8)).toString(16);
    });
    return uuid;
};

/**
 * [registerForSDK]
 * @Author   bibitiger
 * @DateTime 2017-07-17T16:00:12+0800
 */
AV.Cloud.define('registerForSDK', function(request, response) {

    var factoryCode = request.params.factoryCode;
    console.log('registerForSDK factoryCode:'+factoryCode);

    var query = new AV.Query('FactoryCode');
    query.equalTo('Code', factoryCode);
    query.find().then(function(factorys) {
        console.log(JSON.stringify(factorys));
        if (factorys == null || factorys.length  == 0) {
            response.error({'error':'cant find this factory'});
        } else {
            var data = {};
    var uuid = generateUUID();
    var name = uuid.replace(/-/g,'');
    console.log('registerForSDK uuid:'+uuid);
    console.log('registerForSDK name:'+name);
    var user = new AV.User();
    user.setUsername(name);
    user.setPassword('123456');
    user.set('factoryCode', factoryCode);
    user.signUp().then(function (loginedUser) {
        console.log(JSON.stringify(loginedUser));
        // response.success(loginedUser);
        var Patient = AV.Object.extend('Patients');
        var patient = new Patient();
        patient.set('user',loginedUser)
        patient.set('name',loginedUser.get('username'));

         // 新建一个 ACL 实例
        var acl = new AV.ACL();
        acl.setPublicReadAccess(false);
        acl.setPublicWriteAccess(false);
        acl.setWriteAccess(user,true);
          // 将 ACL 实例赋予 patient 对象
        patient.setACL(acl);

        patient.save().then(function(patient) {
            console.log('11111111');
            var FactoryUser = AV.Object.extend('FactoryUserList');
            var factoryUser = new FactoryUser();
            factoryUser.set('factoryCode', factoryCode);
            factoryUser.set('patient',patient);
            factoryUser.set('user',loginedUser);
            factoryUser.save().then(function(factoryUser){
                data['patientId'] = factoryUser.id;
                response.success(data);
            },function(error){
                console.log(JSON.stringify(error));
                response.error(error);
            });
        }, function(err) {

            console.log('Failed to create new object, with error message: ' + err.message);
            response.error(err);
        });
    }, function (error){
        console.log(error);
        response.error(error);
    });
        }
    }, function (error) {
        console.log(error);
        response.error(error);
    });
});


/**
 * [loginForSDK]
 * @Author   bibitiger
 * @DateTime 2017-07-18T14:43:41+0800
 * @param    {[type]}                 request   [description]
 * @param    {[type]}                 response) {   var        factoryCode [description]
 * @return   {[type]}                           [description]
 */
AV.Cloud.define('loginForSDK', function(request, response) {

    var factoryCode = request.params.factoryCode;
    var patientId = request.params.patientId;
    if (factoryCode == null || patientId == null) {
        response.error({'error':'params could not be null'});
    };
    console.log('loginForSDK factoryCode:'+factoryCode);
    console.log('loginForSDK patientId:'+patientId);

    var query = new AV.Query('FactoryUserList');
    query.get(patientId).then(function (factoryUser) {
        if (factoryUser.get('factoryCode') == null || factoryUser.get('factoryCode') != factoryCode) {
            response.error({'error':'cant find this user, please check your patientId and factoryCode'});
        } else {
            response.success({'patientId':patientId});
        }
    }, function (error) {
        console.log(error);
        response.error(error);
    });

});

/**
 * [description]
 * @Author   bibitiger
 * @DateTime 2017-07-18T15:20:51+0800
 * @param    {[type]}                 request   [description]
 * @param    {[type]}                 response) {   var        factoryCode [description]
 * @param    {[type]}                 function  (error)       {                          console.log(error);        response.error(error);  }); } [description]
 * @return   {[type]}                           [description]
 */
AV.Cloud.define('CreateDeviceWithUUIDForSDK', function(request, response) {

    var factoryCode = request.params.factoryCode;
    var UUID = request.params.UUID;
    var patientId = request.params.patientId;
    if (UUID == null || patientId == null || factoryCode == null) {
        response.error({'error':'params could not be null'});
    };
    console.log('CreateDeviceWithUUIDForSDK UUID:'+UUID);
    console.log('CreateDeviceWithUUIDForSDK patientId:'+patientId);
    console.log('CreateDeviceWithUUIDForSDK factoryCode:'+factoryCode);

    var query = new AV.Query('FactoryUserList');
    query.get(patientId).then(function (factoryUser) {
        if (factoryUser.get('factoryCode') == null || factoryUser.get('factoryCode') != factoryCode) {
            response.error({'error':'cant find this user, please check your patientId and factoryCode'});
        } else {
            patient = factoryUser.get('patient');
            var Device = AV.Object.extend('Device');
            // 新建对象
            var device = new Device();
            device.set('idPatient',patient);
            device.set('UUID',UUID);
            device.save().then(function (device) {
                response.success(device);
            }, function (error) {
              console.error(error);
              response.error(error);
            });
        }
    }, function (error) {
        console.log(error);
        response.error(error);
    });
});


/**
 * [GetDeviceWithUUIDForSDK]
 * @Author   bibitiger
 * @DateTime 2017-07-18T15:49:30+0800
 * @param    {[type]}                 request   [description]
 * @param    {[type]}                 response) {   var        factoryCode [description]
 * @return   {[type]}                           [description]
 */
AV.Cloud.define('GetDeviceWithUUIDForSDK', function(request, response) {

    var factoryCode = request.params.factoryCode;
    var UUID = request.params.UUID;
    if (UUID == null || factoryCode == null) {
        response.error({'error':'params could not be null'});
    };
    console.log('GetDeviceWithUUIDForSDK UUID:'+UUID);
    console.log('GetDeviceWithUUIDForSDK factoryCode:'+factoryCode);

    var query = new AV.Query('Device');
    query.equalTo('UUID', UUID);
    query.find().then(function(devices) {
        if (devices == null || devices.length  == 0) {
            response.error({'error':'cant find this device'});
        } else {
            response.success(devices[0]);
        }
    }, function (error) {
        console.log(error);
        response.error(error);
    });
});


/**
 * [description]
 * @Author   bibitiger
 * @DateTime 2017-07-18T17:08:40+0800
 * @param    {[type]}                 request   [description]
 * @param    {[type]}                 response) {   var        factoryCode [description]
 * @param    {[type]}                 function  (error)       {                          console.log(error);        response.error(error);  });} [description]
 * @return   {[type]}                           [description]
 */
AV.Cloud.define('GetDeviceWithFactoryUserIDForSDK', function(request, response) {

    var factoryCode = request.params.factoryCode;
    var patientId = request.params.patientId;
    if (factoryCode == null || patientId == null) {
        response.error({'error':'params could not be null'});
    };
    console.log('GetDeviceWithFactoryUserIDForSDK factoryCode:'+factoryCode);

    var query = new AV.Query('FactoryUserList');
    query.get(patientId).then(function (factoryUser) {
        if (factoryUser.get('factoryCode') == null || factoryUser.get('factoryCode') != factoryCode) {
            response.error({'error':'cant find this user, please check your patientId and factoryCode'});
        } else {
            var patient = factoryUser.get('patient');
            var query = new AV.Query('Device');
            query.equalTo('idPatient', patient);
            query.exists('deviceSN');
            query.find().then(function(devices) {
                console.log(JSON.stringify(devices));
                console.log(devices.length);
                if (devices == null || devices.length == 0) {
                    console.log("111111111");
                    response.error({'error':'cant find this device'});
                } else {
                    response.success(devices[0]);
                }
            }, function (error) {
                console.log(error);
                response.error(error);
            });
        }
    });

});



AV.Cloud.define('GetDevicesWithFactoryUserIDForSDK', function(request, response){

    var factoryCode = request.params.factoryCode;
    var idPatient = request.params.patientId;

    console.log('GetDevicesWithFactoryUserIDForSDK factoryCode:'+factoryCode + ",idPatient:" + idPatient);

    if (factoryCode == null || idPatient == null) {
        response.error({'error':'params could not be null'});
    };

    var queryFactoryUserList = new AV.Query('FactoryUserList');

    queryFactoryUserList.get(idPatient).then(function(factoryUser){

        if (factoryUser.get('factoryCode') == null || factoryUser.get('factoryCode') != factoryCode) {
            console.log("please check your idPatient and factoryCode");
            response.error({'error':'cant find this user, please check your idPatient and factoryCode'});
        } else {

            var createPatient = factoryUser.get('patient');

            var queryDevice = new AV.Query('Device');
            queryDevice.equalTo('active', true);
            // var createPatient = AV.Object.createWithoutData('Patients', idPatient);
            queryDevice.equalTo('idPatient', createPatient);
            queryDevice.find().then(function(mPlusDevices){
                if(mPlusDevices.length < 1){
                    console.log("no bind devices");
                    response.success(mPlusDevices);
                }else{
                    console.log(JSON.stringify(mPlusDevices));
                    var deviceSN1 = mPlusDevices[0].get("deviceSN");
                    console.log("deviceSN1:" + deviceSN1);
                    if(!deviceSN1){
                        console.log("{error:1}");
                        response.error("{error:1}");
                    }
                    var queryBoundDevice = new AV.Query('BoundDevice');
                    queryBoundDevice.equalTo('idPatient', createPatient);
                    queryBoundDevice.find().then(function(boundDevices){
                        // var jsonboundDevices = JSON.stringify(boundDevices);
                        // console.log("jsonboundDevices:" + jsonboundDevices);
                        console.log("length:" + boundDevices.length);
                        
                        var bDevices = [];
                        for(var j =0; j< boundDevices.length; j++){
                            var bDevice = {};
                            bDevice.hwVersion = boundDevices[j].get("hwVersion");
                            bDevice.btVersion = boundDevices[j].get("btVersion");
                            bDevice.swVersion = boundDevices[j].get("swVersion");
                            bDevice.dSize = boundDevices[j].get("dSize");
                            bDevice.active = boundDevices[j].get("active");
                            bDevice.deviceType = boundDevices[j].get("deviceType");
                            bDevice.idPatient = boundDevices[j].get("idPatient");
                            bDevice.sn = boundDevices[j].get("sn");
                            bDevice.idDevice = boundDevices[j].get("idDevice");
                            bDevice.mac = boundDevices[j].get("mac");
                            bDevice.battery = boundDevices[j].get("battery");
                            bDevice.powerStatus = boundDevices[j].get("powerStatus");
                            bDevice.monitor = boundDevices[j].get("monitor");
                            bDevice.connectStatus = boundDevices[j].get("connectStatus");
                            bDevice.random = boundDevices[j].get("random");
                            bDevice.objectId = boundDevices[j].id;
                            bDevices.push(bDevice);
                        }
                        mPlusDevices[0].set("boundDevices", bDevices);
                        response.success(mPlusDevices);
                    }, function(error){
                        console.log(error);
                        response.error(error);
                    });
                }


            }, function(error){
                console.log(error);
                response.error(error);
            });    

        }

    }, function(error){
        console.log(error);
        response.error(error);
    });

});


/**
 * [description]
 * @Author   bibitiger
 * @DateTime 2017-07-18T15:56:48+0800
 * @param    {[type]}                 request   [description]
 * @param    {[type]}                 response) {   var        factoryCode [description]
 * @param    {[type]}                 function  (error)       {                          console.log(error);        response.error(error);  });} [description]
 * @return   {[type]}                           [description]
 */
AV.Cloud.define('boundDeviceForClientSDK', function(request, response) {

    var deviceID = request.params.deviceID;
    var deviceSN = request.params.deviceSN;
    var patientId = request.params.patientId;
    var factoryCode = request.params.factoryCode;
    var UUID = request.params.UUID;
    if (UUID == null || factoryCode == null || deviceID == null || deviceSN == null || patientId == null ) {
        response.error({'error':'params could not be null'});
    };
    console.log('boundDeviceForClientSDK UUID:'+UUID);
    console.log('boundDeviceForClientSDK factoryCode:'+factoryCode);

    var query = new AV.Query('FactoryUserList');
    query.get(patientId).then(function (factoryUser) {
        if (factoryUser.get('factoryCode') == null || factoryUser.get('factoryCode') != factoryCode) {
            response.error({'error':'cant find this user, please check your patientId and factoryCode'});
        } else {
            var paramsJson = {};
            paramsJson['deviceID'] = deviceID;
            paramsJson['deviceSN'] = deviceSN;
            paramsJson['patientId'] = factoryUser.get('patient').id;
            paramsJson['uuid'] = UUID;
            AV.Cloud.run('boundDeviceForClient', paramsJson).then(function(data) {
                    response.success(data);
                }, function(err) {
                    console.log(error);
                    response.error(error);
                });
            }
    }, function (error) {
        console.log(error);
        response.error(error);
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
    var roleType = request.params.roleType;


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
        patient.set('name',user.get('username'));

        if(roleType > 0){
            patient.set('role', roleType);
        }

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
    var password = request.params.password;

    var query = new AV.Query(AV.User);
    query.equalTo('mobilePhoneNumber', phoneNumber);
    query.find().then(function(results) {
      if(results.length > 0){
          response.error('该手机号已绑定其他账号');
      }else{
            AV.User.become(sessionToken).then(function (user) {
              // The current user is changed.

                user.set('mobilePhoneNumber',phoneNumber);
                user.set('password',password);
                console.log('password: ' + password);
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

        if(check.get('Doctor')){
            console.log("confirmReportByDoc this check has doctor already");
            response.error("this check has doctor already");
            return;
        }

        if("WaitDoc" != check.get('State') && "WaitDocOfficial" != check.get('State')){
            console.log("confirmReportByDoc this check state error");
            response.error("this check state error");
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
                    console.log(JSON.stringify(listCheck[i]));
                    console.log("needClose end");

                    if(listCheck[i].get('Patient')){
                        if(listCheck[i].get('Patient').get('user')){
                            arrayPush.push(listCheck[i].get('Patient').get('user').get('objectId'));
                        }
                    }
                    if(listCheck[i].get('Doctor')){
                        if(listCheck[i].get('Doctor').get('CreateBy')){
                            arrayPush.push(listCheck[i].get('Doctor').get('CreateBy').get('objectId'));
                        }
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

                    if(listCheck[i].get('Patient')){
                        if(listCheck[i].get('Patient').get('user')){
                            arrayPush.push(listCheck[i].get('Patient').get('user').get('objectId'));
                        }
                    }
                    if(listCheck[i].get('Doctor')){
                        if(listCheck[i].get('Doctor').get('CreateBy')){
                            arrayPush.push(listCheck[i].get('Doctor').get('CreateBy').get('objectId'));
                        }
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
                var patientId;
                if(listChecks[0].get('Doctor').get('CreateBy').get('objectId') == params.fromPeer){
                    sendName = listChecks[0].get('Doctor').get('Name');
                    patientId = listChecks[0].get('Patient').id;
                }


                if(listChecks[0].get('Patient').get('user').get('objectId') == params.fromPeer){
                    sendName = listChecks[0].get('Patient').get('name');
                }

                console.log("_receiversOffline" + sendName);

                var lctext = "您有一条新消息";
                var con = JSON.parse(params.content);
                if(con._lctext)
                    lctext = con._lctext;
                var json = {
                    // 自增未读消息的数目，不想自增就设为数字
                    badge: "Increment",
                    // content 为消息的实际内容
                    alert: sendName + ":" + lctext,
                    //music
                    "sound":'sound.wav',
                    data:{
                        //conversionId
                        conversionId: params.convId,
                        //patientId
                        patientId: patientId
                    }
                };

                var pushMessage = JSON.stringify(json);
                console.log(pushMessage);

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
 * @Author   xiaoqiang
 * @DateTime 2016-07-04T12:27:31+0800
 * @description
 */
AV.Cloud.define('imgClipper', function(request, response) {
    var params = request.params;
    var url = params.imgurl;
    var id = params.imgid;
    var _x = params.x;
    var _y = params.y;
    var _w = params.w;
    var _h = params.h;
    var div_w = params.div_w;
    var http = require('http');
    var fs = require('fs');
    var __dirname='.';
    http.get(
      url,
      function (res) {
        var bufList = [];
        res.on('data', function (c) {
          bufList.push(c);
        });
        res.on('end', function () {
          var images = require('images');
          var img = images(Buffer.concat(bufList));
          var initial_w = img.width();
          var scale = initial_w / div_w;
          var x = +(_x * scale).toFixed(2);
          var y = +(_y * scale).toFixed(2);
          var w = +(_w * scale).toFixed(2);
          var h = +(_h * scale).toFixed(2);
          var imgs = images(img,x, y, w, h);
          imgs.save(__dirname + '/test_resize.png');
          var imageBuf = fs.readFileSync(__dirname + '/test_resize.png');
          var base64Str = imageBuf.toString("base64");
          fs.unlink(__dirname + '/test_resize.png');
         var file = AV.File.createWithoutData(id);
          file.destroy().then(function (success) {
            console.log("img delete success");
          }, function (error) {
            console.log(error)
          });
          response.success({url : base64Str})
        })
      }
    );
});

var qiniu = require('qiniu');

//七牛云
qiniu.conf.ACCESS_KEY = '5PRVV0HW-zkXawyKRN3s_GS4_fM2pYXUd3XyKSzY';
qiniu.conf.SECRET_KEY = 'j3ZJGsJ7kQ6G9UVyud_CEv4KQvmFc9-QUZsEGBYJ';
var bucket = 'bhealth';

//返回上传uptoken
AV.Cloud.define('uptoken', function(request, response) {
    var key = request.params.key;
    console.log(key)
    var token = uptoken(bucket,key);
    response.success(token);
});
//返回七牛图片的url地址
AV.Cloud.define('downloadUrl', function(request, response) {
    var key = request.params.key;
    var hash = request.params.hash;
    console.log(key,hash)
    var picUrl = downloadUrl(hash,key);
    response.success(picUrl);
});

//构建上传策略函数
function uptoken(bucket, key) {
  var putPolicy = new qiniu.rs.PutPolicy(bucket+":"+key);
  return putPolicy.token();
}

function downloadUrl(hash,key){
    console.log(key)

    //构建私有空间的链接
    var url = 'http://qiniu.megahealth.cn/'+key;
    var policy = new qiniu.rs.GetPolicy();

    //生成下载链接url
    var downloadUrl = policy.makeRequest(url);

    //打印下载的url
    console.log(downloadUrl);
    return downloadUrl;
}
//***********************************************


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
