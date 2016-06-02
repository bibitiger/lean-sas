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

input `-d '{"report":"5739266adf0eea006097485d"} //需要医生查看的报告`

output `{"result":{"createBy":{"__type":"Pointer","className":"_User","objectId":"573e7ad849830c00612c500b"},"objectId":"574b917f71cfe4006bebbf16","createdAt":"2016-05-30T01:03:59.646Z","updatedAt":"2016-05-30T01:03:59.646Z"}} //成功 返回分配医生信息`

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

| 无状态 | 等待医生接受 | 用户关闭 | 医生关闭 | 检查中 |
| :---: | :--------: | :-----: | :-----: | :---: |
| null  | "WaitDoc"  | "CloseBypatient" | "CloseByDoc" | "InCheck" |
|可以请求医生检查|医生或者用户可以拒接单|可以医生关闭|可以用户关闭|可以医生或者用户关闭|

* **ReportCheckHistory状态**

State {string}:

| 医生分配 | 用户关闭 | 医生关闭 | 医生接单 | 医生拒单 | 关闭 | 用户放弃 | 评论 |
| :--------: | :-----: | :-----: | :---: | :---: | :---: | :---: | :---: |
| "AssignedToDoc"  | "CloseBypatient" | "CloseByDoc" | "BeginCheck" | "RefuseByDoc" | "Close" | "RefuseByPatient" | "comment" |

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


## 相关文档

* [LeanEngine 指南](https://leancloud.cn/docs/leanengine_guide-node.html)
* [JavaScript 指南](https://leancloud.cn/docs/js_guide.html)
* [JavaScript SDK API](https://leancloud.cn/api-docs/javascript/index.html)
* [命令行工具详解](https://leancloud.cn/docs/cloud_code_commandline.html)
* [LeanEngine FAQ](https://leancloud.cn/docs/cloud_code_faq.html)
