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



## 相关文档

* [LeanEngine 指南](https://leancloud.cn/docs/leanengine_guide-node.html)
* [JavaScript 指南](https://leancloud.cn/docs/js_guide.html)
* [JavaScript SDK API](https://leancloud.cn/api-docs/javascript/index.html)
* [命令行工具详解](https://leancloud.cn/docs/cloud_code_commandline.html)
* [LeanEngine FAQ](https://leancloud.cn/docs/cloud_code_faq.html)
