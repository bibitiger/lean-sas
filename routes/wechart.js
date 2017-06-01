'use strict';
var router = require('express').Router();
var AV = require('leanengine');

// `AV.Object.extend` 方法一定要放在全局变量，否则会造成堆栈溢出。
// 详见： https://leancloud.cn/docs/js_guide.html#对象
var Todo = AV.Object.extend('Todo');
var crypto = require('crypto');

// 查询 Todo 列表
router.get('/', function(req, res, next) {
  console.log(req.params);
  console.log(req.query);
  var arr = new Array("megahealths01b", req.query.timestamp, req.query.nonce);
  arr.sort();
  var str = arr.toString();
  console.log(str);
  str = str.replace(/,/g,"");
  console.log(str);

  var shasum = crypto.createHash('sha1');
  shasum.update(str);
  var d = shasum.digest('hex');
  console.log(d);

  if(d == req.query.signature){
    res.send(req.query.echostr);
  } else {
    res.send();
  }
});

// 新增 Todo 项目
router.post('/', function(req, res, next) {
  var content = req.body.content;
  var todo = new Todo();
  todo.set('content', content);
  todo.save().then(function(todo) {
    res.redirect('/todos');
  }).catch(next);
});

module.exports = router;


