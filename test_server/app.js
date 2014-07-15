
var fs = require('fs');
var WServer = require('../fSlider_ws').Server;

var http = require('http').createServer(function(req, res) {
  res.end('test');
});

var ws = new WServer(http).listen(function(){
  console.log('wserver start');
});

ws.on('connected', function(socket) { 
  socket.setTimeout(0);
  socket.recive(function(data) {
    // send a picture
    data = fs.readFileSync('art.jpg');
    socket.send(data);
  });
  console.log('client:', socket.id, 'online'); 
});

http.listen(3000);