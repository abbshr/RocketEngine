var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/asd', function(req, res) {
  res.send('respond with a resource');
});

module.exports = router;
