
var fs = require('fs');
var WServer = require('../fSlider_ws').Server;

var http = require('http').createServer(function(req, res) {
  res.end('test');
});

var ws = new WServer(http).listen(function(){console.log('wserver start')});

ws.on('connected', function(socket) { 
  socket.setTimeout(0);
  socket.recive(function(raw) {
    console.log(raw, raw.toString());
    // send a picture
    raw = fs.readFileSync('art.jpg');
    raw = Buffer.concat([new Buffer('e'), raw]);
    socket.send(raw);
  });
  console.log('client:', socket.id, 'online'); 
});

http.listen(3000);