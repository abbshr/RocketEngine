var express = require('express');
var router = express.Router();
var wsf = require('fslider_ws');
/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('index');
});
module.exports = router;
