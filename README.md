#呼吸康test api

* **权限**

`-H "X-LC-Session: 787pdkl6oti0chr376ozzm1qm" \   //登陆时获取的sessionToken`

* **创建医生**

```
curl -X POST \
  -H "X-LC-Id: 1UlsKsiUTHpNkAyAKSWVW1oo-gzGzoHsz" \
  -H "X-LC-Key: MeyXCB3GkeYmQkQFOacuTSMU" \
  -H "Content-Type: application/json" \
  -d '{"CreateBy":{
  "__type": "Pointer",
  "className": "_User",
  "objectId": "5747dfe871cfe40068d86b6c"
},
"ACL": {
          "5747dfe871cfe40068d86b6c": {
            "read": true
			"write": true
          }
        }}' \
  https://api.leancloud.cn/1.1/classes/Doctor
```

* **创建医生公共信息**

`权限：所有人可读，创建者可写`

```
curl -X POST \
  -H "X-LC-Id: 1UlsKsiUTHpNkAyAKSWVW1oo-gzGzoHsz" \
  -H "X-LC-Key: MeyXCB3GkeYmQkQFOacuTSMU" \
  -H "Content-Type: application/json" \
  -d '{
"Hospital":{
  "__type": "Pointer",
  "className": "Hosptial",
  "objectId": "572ae445c4c971006097a3cf"
},
"CreateBy":{
  "__type": "Pointer",
  "className": "_User",
  "objectId": "5747dfe871cfe40068d86b6c"
},
"Major":"呼吸科",
"Name":"牛逼"}' \
  https://api.leancloud.cn/1.1/classes/DoctorPub
```

* **请求医生查看**

input `-d '{"report":"575c2879207703006aceee16", "note":"昨天晚上牛奶喝多了"} //需要医生查看的报告 BaseReports 的 objectId`

output `{
  "result": {
    "ReportId": "575c2879207703006aceee16",
    "StateChangeTime": {
      "__type": "Date",
      "iso": "2016-06-11T16:03:12.324Z"
    },
    "State": "WaitDoc",
    "objectId": "575c363f2e958a0069ded51a",
    "createdAt": "2016-06-11T16:03:11.107Z",
    "updatedAt": "2016-06-11T16:03:11.107Z"
  }
} //成功 返回Check信息 `

`推送消息 channels: ["UserRequstDocForCheck"],
											data: {
												action: "com.zhaoguan.huxikang",
												type: 'ReportCheck',
												reportID: [check.get('objectId')],
												state: "NoticeDocAccp"
											}`

output `"no useful doctor" //失败 `

```
curl -X POST -H "Content-Type: application/json; charset=utf-8" \
       -H "X-LC-Id: 1UlsKsiUTHpNkAyAKSWVW1oo-gzGzoHsz" \
       -H "X-LC-Key: MeyXCB3GkeYmQkQFOacuTSMU" \
	   -H "X-LC-Session: iomqjq5jxo28u55iui6xkumyj" \
       -H "X-LC-Prod: 1" \
       -d '{"report":"575c2879207703006aceee16", "note":"昨天晚上牛奶喝多了"}' \
https://leancloud.cn/1.1/functions/RquestDoctor
```

* **查看医生信息**

```
curl -X GET \
  -H "X-LC-Id: 1UlsKsiUTHpNkAyAKSWVW1oo-gzGzoHsz" \
  -H "X-LC-Key: MeyXCB3GkeYmQkQFOacuTSMU" \
  -H "X-LC-Session: iomqjq5jxo28u55iui6xkumyj" \
  -G \
  --data-urlencode 'where={"CreateBy":{"__type":"Pointer","className":"_User","objectId":"5747dfe871cfe40068d86b6c"}}' \
  https://api.leancloud.cn/1.1/classes/Doctor
```

* **查看医生公共信息**

```
curl -X GET \
  -H "X-LC-Id: 1UlsKsiUTHpNkAyAKSWVW1oo-gzGzoHsz" \
  -H "X-LC-Key: MeyXCB3GkeYmQkQFOacuTSMU" \
  -H "X-LC-Session: iomqjq5jxo28u55iui6xkumyj" \
  -G \
  --data-urlencode 'where={"CreateBy":{"__type":"Pointer","className":"_User","objectId":"5747dfe871cfe40068d86b6c"}}' \
  https://api.leancloud.cn/1.1/classes/DoctorPub
```

* **Check状态**

CheckState {string}:

| 关闭状态 | 等待医生接受  | 检查中 | 等待系统医生 |
| :---: | :--------: | :---: | :---:|
| 参照下方 ReportCheckHistory 的各类关闭和拒绝状态 | "WaitDoc"  | "InCheck" | "WaitDocOfficial"
|本次检查已经关闭|用户可以拒接单，通知医生抢单|可以医生关闭,可以用户关闭,可以医生或者用户关闭| 用户可以拒接单，指定系统客服接单|

* **ReportCheckHistory状态**

State {string}:

| 系统医生分配 | 开始抢单 |用户关闭 | 医生关闭 | 医生接单 | 用户放弃 | 用户评论 | 接单超时 | 咨询到时 | 医生评论 |
| :--------: | :---: |:-----: | :-----: | :---: | :---: | :---: | :---: | :---: | :---: | 
| "AssignedToOfficialDoc"  | "NoticeDocAccp" | "CloseByPatient" | "CloseByDoc" | "BeginCheck" | "RefuseByPatient" | "CommentByPatient" | "RefuseBySys" | "CloseBySys" | "CommentByDoc" |


* **推送类别**

type {string}:

| 聊天消息 | 医患检查  | 
| :---: | :--------: |
| "IMMsg"  | "ReportCheck"  |


* **报告类别**

type {string}:

| 梦加检测报告 | STOP-bang问卷  | 柏林问卷 | Epworth嗜睡量表 |
| :---: | :--------: | :---: | :---: |
| "mengjia"  | "q_stopbang"  | "q_berlin" | "q_Epworth" |



* **医生接单**

input `-d '{"check":"575cd82b5bbb500053e1d6e1", "conversation":"5757d4e6816dfa00569488cb"} //需要接单的检查和建立的会话id`

output `{
  "result": {
    "_ApplicationProduction": 0,
    "Patient": {
      "__type": "Pointer",
      "className": "Patients",
      "objectId": "5755126e816dfa005f7d2354"
    },
    "StateChangeTime": {
      "__type": "Date",
      "iso": "2016-06-12T05:58:10.626Z"
    },
    "ReportId": "575c2879207703006aceee16",
    "Doctor": {
      "__type": "Pointer",
      "className": "DoctorPub",
      "objectId": "574d59165bbb500057b1668d"
    },
    "State": "InCheck",
    "Conversation": "5757d4e6816dfa00569488cb",
    "objectId": "575cd82b5bbb500053e1d6e1",
    "createdAt": "2016-06-12T03:34:03.067Z",
    "updatedAt": "2016-06-12T05:58:21.733Z"
  }
} //成功 接单成功之后的check`

```
//confirmCheckByDoc
curl -X POST -H "Content-Type: application/json; charset=utf-8" \
       -H "X-LC-Id: 1UlsKsiUTHpNkAyAKSWVW1oo-gzGzoHsz" \
       -H "X-LC-Key: MeyXCB3GkeYmQkQFOacuTSMU" \
	   -H "X-LC-Session: prl6e5kc315sq6dqagg24lq59" \
       -H "X-LC-Prod: 1" \
       -d '{"check":"575cd82b5bbb500053e1d6e1", "conversation":"5757d4e6816dfa00569488cb"}' \
https://leancloud.cn/1.1/functions/confirmCheckByDoc
```

* **用户放弃**

input `-d '{"check":"575d03b2d342d30057988b14"} //需要放弃的检查`

output `{
  "result": {
    "_ApplicationProduction": 0,
    "Patient": {
      "__type": "Pointer",
      "className": "Patients",
      "objectId": "5755126e816dfa005f7d2354"
    },
    "StateChangeTime": {
      "__type": "Date",
      "iso": "2016-06-12T06:42:34.727Z"
    },
    "ReportId": "575c2879207703006aceee16",
    "State": "RefuseByPatient",
    "objectId": "575d03b2d342d30057988b14",
    "createdAt": "2016-06-12T06:39:46.111Z",
    "updatedAt": "2016-06-12T06:42:46.019Z"
  }
}  //成功 拒单成功后的check`

`推送消息 channels: ["PatientRefuseCheck"],
					data: {
						action: "com.zhaoguan.huxikang",
						type: 'ReportCheck',
						checkID: [check.get('objectId')],
						state: "RefuseByPatient"
					}`


```
//RefuseCheckByUser
curl -X POST -H "Content-Type: application/json; charset=utf-8" \
       -H "X-LC-Id: 1UlsKsiUTHpNkAyAKSWVW1oo-gzGzoHsz" \
       -H "X-LC-Key: MeyXCB3GkeYmQkQFOacuTSMU" \
	   -H "X-LC-Session: prl6e5kc315sq6dqagg24lq59" \
       -H "X-LC-Prod: 1" \
       -d '{"check":"5739266adf0eea006097485d"}' \
https://leancloud.cn/1.1/functions/RefuseCheckByUser
```


* **用户结束**

input `-d '{"check":"5739266adf0eea006097485d"} //需要关闭的check`

output `{
  "result": {
    "_ApplicationProduction": 0,
    "Patient": {
      "__type": "Pointer",
      "className": "Patients",
      "objectId": "5755126e816dfa005f7d2354"
    },
    "StateChangeTime": {
      "__type": "Date",
      "iso": "2016-06-12T07:48:45.794Z"
    },
    "ReportId": "575c2879207703006aceee16",
    "Doctor": {
      "__type": "Pointer",
      "className": "DoctorPub",
      "objectId": "574d59165bbb500057b1668d"
    },
    "State": "CloseByPatient",
    "objectId": "575d068ca3413100614e1ac4",
    "createdAt": "2016-06-12T06:51:56.316Z",
    "updatedAt": "2016-06-12T07:48:57.128Z"
  }
} //成功 结束后的check`

`推送消息 channels: [check.get('Doctor').get('CreateBy').get('objectId')],
					data: {
						action: "com.zhaoguan.huxikang",
						type: 'ReportCheck',
						checkID: [check.get('objectId')],
						state: "CloseByPatient"
					}`

```
curl -X POST -H "Content-Type: application/json; charset=utf-8" \
       -H "X-LC-Id: 1UlsKsiUTHpNkAyAKSWVW1oo-gzGzoHsz" \
       -H "X-LC-Key: MeyXCB3GkeYmQkQFOacuTSMU" \
	   -H "X-LC-Session: prl6e5kc315sq6dqagg24lq59" \
       -H "X-LC-Prod: 1" \
       -d '{"check":"57345545c4c9710060f10e1d"}' \
https://leancloud.cn/1.1/functions/CloseCheckByUser
```


* **医生结束**

input `-d '{"check":"5739266adf0eea006097485d"} //需要关闭的check`

output `{
  "result": {
    "_ApplicationProduction": 0,
    "Patient": {
      "__type": "Pointer",
      "className": "Patients",
      "objectId": "5755126e816dfa005f7d2354"
    },
    "StateChangeTime": {
      "__type": "Date",
      "iso": "2016-06-12T08:12:36.934Z"
    },
    "ReportId": "575c2879207703006aceee16",
    "Conversation": "5757d4e6816dfa00569488cb",
    "Doctor": {
      "__type": "Pointer",
      "className": "DoctorPub",
      "objectId": "574d59165bbb500057b1668d"
    },
    "State": "CloseByDoc",
    "objectId": "575d19476be3ff006a43f3f4",
    "createdAt": "2016-06-12T08:11:51.102Z",
    "updatedAt": "2016-06-12T08:12:48.384Z"
  }
}  //成功 结束后的check`

`推送消息 channels: [check.get('Patient').get('user').get('objectId')],
					data: {
						action: "com.zhaoguan.huxikang",
						type: 'ReportCheck',
						checkID: [check.get('objectId')],
						state: "CloseByDoc"
					}`

```
curl -X POST -H "Content-Type: application/json; charset=utf-8" \
       -H "X-LC-Id: 1UlsKsiUTHpNkAyAKSWVW1oo-gzGzoHsz" \
       -H "X-LC-Key: MeyXCB3GkeYmQkQFOacuTSMU" \
	   -H "X-LC-Session: prl6e5kc315sq6dqagg24lq59" \
       -H "X-LC-Prod: 1" \
       -d '{"check":"57345545c4c9710060f10e1d"}' \
https://leancloud.cn/1.1/functions/CloseCheckByDoc
```

* **计时检查**

`用于服务器计时检查是否有检查会话“等待医生”或"等待系统医生"，“医生检查”到时，等待医生：24分钟到时，等待系统医生：24小时到时，医生检查：24小时到时，服务器会以60*5秒间隔循环调用该函数检查`

```
curl -X POST -H "Content-Type: application/json; charset=utf-8" \
       -H "X-LC-Id: 1UlsKsiUTHpNkAyAKSWVW1oo-gzGzoHsz" \
       -H "X-LC-Key: MeyXCB3GkeYmQkQFOacuTSMU" \
	   -H "X-LC-Session: prl6e5kc315sq6dqagg24lq59" \
       -H "X-LC-Prod: 1" \
       -d '{}' \
https://leancloud.cn/1.1/functions/CheckCheckingForCloseOrRefuse
```


* **医生评价**

input `-d '{"check":"575d3d0f816dfa0056c073f6", "score":4, "comment":"哎呦，不错哦！！"} \\需要评价的检查，ps：如果医生已经打过分不要再次打分，只支持一次打分`

output `{
  "result": {
    "Note": "哎呦，不错哦！！",
    "Check": {
      "__type": "Pointer",
      "className": "Check",
      "objectId": "575d3d0f816dfa0056c073f6"
    },
    "state": "CommentByDoc",
    "Score": 4,
    "objectId": "575e7e6da34131006158f6bc",
    "createdAt": "2016-06-13T09:35:41.194Z",
    "updatedAt": "2016-06-13T09:35:41.194Z"
  }
} //成功 医生打分记录在ReportCheckHistory里的记录`


```
curl -X POST -H "Content-Type: application/json; charset=utf-8" \
       -H "X-LC-Id: 1UlsKsiUTHpNkAyAKSWVW1oo-gzGzoHsz" \
       -H "X-LC-Key: MeyXCB3GkeYmQkQFOacuTSMU" \
	   -H "X-LC-Session: prl6e5kc315sq6dqagg24lq59" \
       -H "X-LC-Prod: 1" \
       -d '{"check":"575d3d0f816dfa0056c073f6", "score":4, "comment":"哎呦，不错哦！！"}' \
https://leancloud.cn/1.1/functions/CommentByDoctor
```


* **病人评价**

input `-d '{"check":"575d3d0f816dfa0056c073f6", "score":4, "comment":"哎呦，不错哦！！"} \\需要评价的检查，ps：如果病人已经打过分不要再次打分，只支持一次打分`

output `{
  "result": {
    "Note": "哎呦，不错哦！！",
    "Check": {
      "__type": "Pointer",
      "className": "Check",
      "objectId": "575d3d0f816dfa0056c073f6"
    },
    "state": "CommentByPatient",
    "Score": 4,
    "objectId": "575e7f081532bc0060990822",
    "createdAt": "2016-06-13T09:38:16.830Z",
    "updatedAt": "2016-06-13T09:38:16.830Z"
  }
} //成功 病人打分记录在ReportCheckHistory里的记录`

```
curl -X POST -H "Content-Type: application/json; charset=utf-8" \
       -H "X-LC-Id: 1UlsKsiUTHpNkAyAKSWVW1oo-gzGzoHsz" \
       -H "X-LC-Key: MeyXCB3GkeYmQkQFOacuTSMU" \
	   -H "X-LC-Session: prl6e5kc315sq6dqagg24lq59" \
       -H "X-LC-Prod: 1" \
       -d '{"check":"575d3d0f816dfa0056c073f6", "score":4, "comment":"哎呦，不错哦！！"}' \
https://leancloud.cn/1.1/functions/CommentByUser
```


* **创建报告**

```
curl -X POST \
  -H "X-LC-Id: 1UlsKsiUTHpNkAyAKSWVW1oo-gzGzoHsz" \
  -H "X-LC-Key: MeyXCB3GkeYmQkQFOacuTSMU" \
  -H "X-LC-Session: 0nngsb6hstar720l3jao8vsw2" \
  -H "Content-Type: application/json" \
  -d '{
  "idReport": "HZ111605_0105",
  "idPatient": {
    "__type": "Pointer",
    "className": "Patients",
    "objectId": "5755126e816dfa005f7d2354"
  },
  "idDevice": {
    "__type": "Pointer",
    "className": "Device",
    "objectId": "57305c281ea4930060a3fcb0"
  }
  }' \
  https://api.leancloud.cn/1.1/classes/Reports
```



* **检测结束**

```
curl -X PUT \
  -H "X-LC-Id: 1UlsKsiUTHpNkAyAKSWVW1oo-gzGzoHsz" \
  -H "X-LC-Key: MeyXCB3GkeYmQkQFOacuTSMU" \
  -H "X-LC-Session: 0nngsb6hstar720l3jao8vsw2" \
  -H "Content-Type: application/json" \
  -d '{
  "remSleepScore": 4,
  "num": 105,
  "totalSleepScore": 15,
  "failSleepScore": 0,
  "start": 1605120948,
  "ahiScore": 6,
  "wakeSleepScore": 0,
  "deepSleepScore": 0,
  "status": "5",
  "end": 21780,
  "visible": "1",
   "sleepData": [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 3, 3, 3, 3, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ],
  "AHI": 11,
  "lightSleepScore": 1
}' \
  https://api.leancloud.cn/1.1/classes/Reports/577f41f2c4c9710066c3a287
  
  
  curl -X POST \
  -H "X-LC-Id: 1UlsKsiUTHpNkAyAKSWVW1oo-gzGzoHsz" \
  -H "X-LC-Key: MeyXCB3GkeYmQkQFOacuTSMU" \
  -H "X-LC-Session: 0nngsb6hstar720l3jao8vsw2" \
  -H "Content-Type: application/json" \
  -d '{
  "ReportId":"577f41f2c4c9710066c3a287",
  "Type":"mengjia",
  "CreateBy": {
    "__type": "Pointer",
    "className": "Patients",
    "objectId": "5755126e816dfa005f7d2354"
  }
}' \
  https://api.leancloud.cn/1.1/classes/BaseReports
```


## 相关文档

* [LeanEngine 指南](https://leancloud.cn/docs/leanengine_guide-node.html)
* [JavaScript 指南](https://leancloud.cn/docs/js_guide.html)
* [JavaScript SDK API](https://leancloud.cn/api-docs/javascript/index.html)
* [命令行工具详解](https://leancloud.cn/docs/cloud_code_commandline.html)
* [LeanEngine FAQ](https://leancloud.cn/docs/cloud_code_faq.html)
