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

input `-d '{"report":"5739266adf0eea006097485d"} //需要医生查看的报告 BaseReports 的 objectId`

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
       -d '{"report":"5739266adf0eea006097485d"}' \
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

* **report状态**

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

* **医生拒单**

input `-d '{"report":"5739266adf0eea006097485d"} //需要拒单的报告`

output `{
  "result": {
    "Report": {
      "__type": "Pointer",
      "className": "Reports",
      "objectId": "57345545c4c9710060f10e1d"
    },
    "Note": "refuse by doctor 574d5907d342d3004342bd9c",
    "CheckId": "c91bfc10-28a8-11e6-9a57-f10f79a3c3e8",
    "Doctor": {
      "__type": "Pointer",
      "className": "DoctorPub",
      "objectId": "574d5907d342d3004342bd9c"
    },
    "state": "RefuseByDoc",
    "objectId": "575003d8530fd300696f84a1",
    "createdAt": "2016-06-02T10:00:56.425Z",
    "updatedAt": "2016-06-02T10:00:56.425Z"
  }
}  //成功 拒单记录在ReportCheckHistory里的记录`

output `“report 57345545c4c9710060f10e1d refuse by doctor” //推送一条消息到对应病人 `

output `"report state error" //失败 report状态必须为“WaitDoc” `

```
curl -X POST -H "Content-Type: application/json; charset=utf-8" \
       -H "X-LC-Id: 1UlsKsiUTHpNkAyAKSWVW1oo-gzGzoHsz" \
       -H "X-LC-Key: MeyXCB3GkeYmQkQFOacuTSMU" \
	   -H "X-LC-Session: prl6e5kc315sq6dqagg24lq59" \
       -H "X-LC-Prod: 1" \
       -d '{"report":"5739266adf0eea006097485d"}' \
https://leancloud.cn/1.1/functions/refuseReportByDoc
```

* **医生接单**

input `-d '{"report":"57345545c4c9710060f10e1d", "conversation":"574ff5e2d342d300574792ac"} //需要拒单的报告和建立的会话id`

output `{
  "result": {
    "Report": {
      "__type": "Pointer",
      "className": "Reports",
      "objectId": "57345545c4c9710060f10e1d"
    },
    "Note": "comfirm by doctor 574d5907d342d3004342bd9c",
    "CheckId": "48046de0-28aa-11e6-9a57-f10f79a3c3e8",
    "Doctor": {
      "__type": "Pointer",
      "className": "DoctorPub",
      "objectId": "574d5907d342d3004342bd9c"
    },
    "state": "BeginCheck",
    "Conversation": "574ff5e2d342d300574792ac",
    "objectId": "5750063c530fd300696f9f7a",
    "createdAt": "2016-06-02T10:11:08.913Z",
    "updatedAt": "2016-06-02T10:11:08.913Z"
  }
} //成功 接单记录在ReportCheckHistory里的记录`

output `“report 57345545c4c9710060f10e1d begin check” //推送一条消息到对应病人 `

output `"report state error" //失败 report状态必须为“WaitDoc” `

```
//confirmReportByDoc
curl -X POST -H "Content-Type: application/json; charset=utf-8" \
       -H "X-LC-Id: 1UlsKsiUTHpNkAyAKSWVW1oo-gzGzoHsz" \
       -H "X-LC-Key: MeyXCB3GkeYmQkQFOacuTSMU" \
	   -H "X-LC-Session: prl6e5kc315sq6dqagg24lq59" \
       -H "X-LC-Prod: 1" \
       -d '{"report":"57345545c4c9710060f10e1d", "conversation":"574ff5e2d342d300574792ac"}' \
https://leancloud.cn/1.1/functions/confirmReportByDoc
```

* **用户放弃**

input `-d '{"report":"5739266adf0eea006097485d"} //需要放弃的报告`

output `{
  "result": {
    "Report": {
      "__type": "Pointer",
      "className": "Reports",
      "objectId": "57345545c4c9710060f10e1d"
    },
    "Note": "refuse by patient undefined",
    "CheckId": "cdbbedf0-2940-11e6-b9a5-d14916d50369",
    "Doctor": {
      "__type": "Pointer",
      "className": "DoctorPub",
      "objectId": "574d5907d342d3004342bd9c"
    },
    "state": "RefuseByPatient",
    "objectId": "575102b8530fd30068ed6867",
    "createdAt": "2016-06-03T04:08:24.057Z",
    "updatedAt": "2016-06-03T04:08:24.057Z"
  }
}  //成功 拒单记录在ReportCheckHistory里的记录`

output `“report 57345545c4c9710060f10e1d refuse by patient” //推送一条消息到对应医生 `

output `"report state error" //失败 report状态必须为“WaitDoc” `

```
curl -X POST -H "Content-Type: application/json; charset=utf-8" \
       -H "X-LC-Id: 1UlsKsiUTHpNkAyAKSWVW1oo-gzGzoHsz" \
       -H "X-LC-Key: MeyXCB3GkeYmQkQFOacuTSMU" \
	   -H "X-LC-Session: prl6e5kc315sq6dqagg24lq59" \
       -H "X-LC-Prod: 1" \
       -d '{"report":"5739266adf0eea006097485d"}' \
https://leancloud.cn/1.1/functions/RefuseReportByUser
```


* **用户结束**

input `-d '{"report":"5739266adf0eea006097485d"} //需要关闭的报告`

output `{
  "result": {
    "Report": {
      "__type": "Pointer",
      "className": "Reports",
      "objectId": "57345545c4c9710060f10e1d"
    },
    "Note": "close by patient 5718a17671cfe400574c018c",
    "CheckId": "702381f0-2970-11e6-867b-d12770944751",
    "Doctor": {
      "__type": "Pointer",
      "className": "DoctorPub",
      "objectId": "574ff73a530fd300696f09e0"
    },
    "state": "CloseByPatient",
    "Conversation": "574eb33e2e958a0069401b71",
    "objectId": "575152c02e958a0068a70367",
    "createdAt": "2016-06-03T09:49:52.681Z",
    "updatedAt": "2016-06-03T09:49:52.681Z"
  }
}  //成功 关闭记录在ReportCheckHistory里的记录`

output `“report 57345545c4c9710060f10e1d close by patient” //推送一条消息到对应医生 `

output `"report state error" //失败 report状态必须为“InCheck” `

```
curl -X POST -H "Content-Type: application/json; charset=utf-8" \
       -H "X-LC-Id: 1UlsKsiUTHpNkAyAKSWVW1oo-gzGzoHsz" \
       -H "X-LC-Key: MeyXCB3GkeYmQkQFOacuTSMU" \
	   -H "X-LC-Session: prl6e5kc315sq6dqagg24lq59" \
       -H "X-LC-Prod: 1" \
       -d '{"report":"57345545c4c9710060f10e1d","conversation":"574eb33e2e958a0069401b71"}' \
https://leancloud.cn/1.1/functions/CloseCheckByUser
```


* **医生结束**

input `-d '{"report":"5739266adf0eea006097485d"} //需要关闭的报告`

output `{
  "result": {
    "Report": {
      "__type": "Pointer",
      "className": "Reports",
      "objectId": "57345545c4c9710060f10e1d"
    },
    "Note": "close by doctor 574d58fa71cfe4005eb83f1c",
    "CheckId": "c5c847b0-296d-11e6-867b-d12770944751",
    "Doctor": {
      "__type": "Pointer",
      "className": "DoctorPub",
      "objectId": "574d58fa5bbb500057b165a6"
    },
    "state": "CloseByDoc",
    "Conversation": "574eb33e2e958a0069401b71",
    "objectId": "57514e3c7db2a20069755f80",
    "createdAt": "2016-06-03T09:30:36.042Z",
    "updatedAt": "2016-06-03T09:30:36.042Z"
  }
}  //成功 关闭记录在ReportCheckHistory里的记录`

output `“report 57345545c4c9710060f10e1d close by doctor” //推送一条消息到对应病人 `

output `"report state error" //失败 report状态必须为“InCheck” `

```
curl -X POST -H "Content-Type: application/json; charset=utf-8" \
       -H "X-LC-Id: 1UlsKsiUTHpNkAyAKSWVW1oo-gzGzoHsz" \
       -H "X-LC-Key: MeyXCB3GkeYmQkQFOacuTSMU" \
	   -H "X-LC-Session: prl6e5kc315sq6dqagg24lq59" \
       -H "X-LC-Prod: 1" \
       -d '{"report":"57345545c4c9710060f10e1d","conversation":"574eb33e2e958a0069401b71"}' \
https://leancloud.cn/1.1/functions/CloseCheckByDoc
```

* **计时检查**

`用于服务器计时检查是否有检查会话“等待医生”或“医生检查”到时，等待医生：10分钟到时，医生检查：24小时到时，服务器会以20秒间隔循环调用该函数检查`

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

input `-d '{"checkId":"58ba2bd0-2c5f-11e6-a0fc-5ff4ef9cd356", "comment":"这个医生不错1111","score":4} \\需要评价的检查，ps：如果医生已经打过分不要再次打分，只支持一次打分`

output `{
  "result": {
    "Report": {
      "__type": "Pointer",
      "className": "Reports",
      "objectId": "573417b1df0eea006346ec70"
    },
    "Note": "这个医生不错1111",
    "CheckId": "58ba2bd0-2c5f-11e6-a0fc-5ff4ef9cd356",
    "Doctor": {
      "__type": "Pointer",
      "className": "DoctorPub",
      "objectId": "575521c21532bc006499c32d"
    },
    "state": "CommentByDoc",
    "Score": 4,
    "objectId": "575651195bbb500064533d8b",
    "createdAt": "2016-06-07T04:44:09.520Z",
    "updatedAt": "2016-06-07T04:44:09.520Z"
  }
} //成功 医生打分记录在ReportCheckHistory里的记录`

output `{"code":1,"error":"there is a score for check 58ba2bd0-2c5f-11e6-a0fc-5ff4ef9cd356 {\"_ApplicationProduction\":0,\"Score\":4,\"Report\":{\"__type\":\"Pointer\",\"className\":\"Reports\",\"objectId\":\"573417b1df0eea006346ec70\"},\"Note\":\"这个医生不错1111\",\"state\":\"CommentByDoc\",\"CheckId\":\"58ba2bd0-2c5f-11e6-a0fc-5ff4ef9cd356\",\"Doctor\":{\"__type\":\"Pointer\",\"className\":\"DoctorPub\",\"objectId\":\"575521c21532bc006499c32d\"},\"objectId\":\"57564f5ba341310063dc821a\",\"createdAt\":\"2016-06-07T04:36:43.751Z\",\"updatedAt\":\"2016-06-07T04:36:43.751Z\"}"} //失败 已经打过分 `

```
curl -X POST -H "Content-Type: application/json; charset=utf-8" \
       -H "X-LC-Id: 1UlsKsiUTHpNkAyAKSWVW1oo-gzGzoHsz" \
       -H "X-LC-Key: MeyXCB3GkeYmQkQFOacuTSMU" \
	   -H "X-LC-Session: prl6e5kc315sq6dqagg24lq59" \
       -H "X-LC-Prod: 1" \
       -d '{"checkId":"58ba2bd0-2c5f-11e6-a0fc-5ff4ef9cd356", "comment":"这个医生不错1111","score":4}' \
https://leancloud.cn/1.1/functions/CommentByDoctor
```


* **病人评价**

input `-d '{"checkId":"58ba2bd0-2c5f-11e6-a0fc-5ff4ef9cd356", "comment":"这个医生不错1111","score":4} \\需要评价的检查，ps：如果病人已经打过分不要再次打分，只支持一次打分`

output `{
  "result": {
    "Report": {
      "__type": "Pointer",
      "className": "Reports",
      "objectId": "57345545c4c9710060f10e1d"
    },
    "Note": "close by doctor 574d58fa71cfe4005eb83f1c",
    "CheckId": "c5c847b0-296d-11e6-867b-d12770944751",
    "Doctor": {
      "__type": "Pointer",
      "className": "DoctorPub",
      "objectId": "574d58fa5bbb500057b165a6"
    },
    "state": "CloseByDoc",
    "Conversation": "574eb33e2e958a0069401b71",
    "objectId": "57514e3c7db2a20069755f80",
    "createdAt": "2016-06-03T09:30:36.042Z",
    "updatedAt": "2016-06-03T09:30:36.042Z"
  }
}  //成功 病人打分记录在ReportCheckHistory里的记录`

output `{"code":1,"error":"there is a score for check 58ba2bd0-2c5f-11e6-a0fc-5ff4ef9cd356 {\"_ApplicationProduction\":0,\"Score\":4,\"Report\":{\"__type\":\"Pointer\",\"className\":\"Reports\",\"objectId\":\"573417b1df0eea006346ec70\"},\"Note\":\"这个医生不错1111\",\"state\":\"CommentByDoc\",\"CheckId\":\"58ba2bd0-2c5f-11e6-a0fc-5ff4ef9cd356\",\"Doctor\":{\"__type\":\"Pointer\",\"className\":\"DoctorPub\",\"objectId\":\"575521c21532bc006499c32d\"},\"objectId\":\"57564f5ba341310063dc821a\",\"createdAt\":\"2016-06-07T04:36:43.751Z\",\"updatedAt\":\"2016-06-07T04:36:43.751Z\"}"} //失败 已经打过分 `

```
curl -X POST -H "Content-Type: application/json; charset=utf-8" \
       -H "X-LC-Id: 1UlsKsiUTHpNkAyAKSWVW1oo-gzGzoHsz" \
       -H "X-LC-Key: MeyXCB3GkeYmQkQFOacuTSMU" \
	   -H "X-LC-Session: prl6e5kc315sq6dqagg24lq59" \
       -H "X-LC-Prod: 1" \
       -d '{"checkId":"58ba2bd0-2c5f-11e6-a0fc-5ff4ef9cd356", "comment":"这个医生不错1111","score":4}' \
https://leancloud.cn/1.1/functions/CommentByUser
```


## 相关文档

* [LeanEngine 指南](https://leancloud.cn/docs/leanengine_guide-node.html)
* [JavaScript 指南](https://leancloud.cn/docs/js_guide.html)
* [JavaScript SDK API](https://leancloud.cn/api-docs/javascript/index.html)
* [命令行工具详解](https://leancloud.cn/docs/cloud_code_commandline.html)
* [LeanEngine FAQ](https://leancloud.cn/docs/cloud_code_faq.html)
