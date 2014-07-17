
var fs = require('fs'),
    util = require('util');
var WServer = require('../fSlider_ws').Server;

var http = require('http').createServer(function(req, res) {
  res.end('test');
});

var ws = new WServer(http).listen(function(){
  console.log('wserver start');
});

ws.on('connected', function(socket) { 
  socket.setTimeout(10 * 1000);
  socket.recive(function(data) {
    // send a picture
    data = fs.readFileSync('art.jpg');
    socket.send(data);
  });
  util.log('client id: ' + socket.id + ' online'); 
});

http.listen(3000);