
var fs = require('fs'),
    util = require('util'),
    http = require('http');
var WServer = require('../fSlider_ws').Server;

var httpd = http.createServer(function(req, res) {
  res.end('test');
});

var ws = new WServer(httpd).listen(function(){
  util.log('wsf server start');
});

ws.on('connected', function(socket) { 
  // manual set the timeout to 10s
  socket.setTimeout(10000);
  socket.recive(function(data) {
    // every time when connected, send a random picture ^_^
    data = fs.readFileSync("" + parseInt(Math.random() * 5));
    socket.send(data);
  });
  util.log('client id: ' + socket.id + ' online'); 
});

httpd.listen(3000);