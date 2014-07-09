var WServer = require('../fSlider_ws').Server;

var http = require('http').createServer(function(req, res) {
  res.end('test');
});

var ws = new WServer(http).listen(function(){console.log('wserver start')});

ws.on('connected', function(socket) { 
  socket.setTimeout(0);
  ws.on('win', function(data) { 
    console.log(data);  
    //socket.emit('gamewin' , {'name': 'Ran Aizen', 'say': 'hello Ran, you win' });
    socket.emit('data', data);
  });
  ws.on('closing', function () {
    console.log('client close the connection');
  });
  ws.on('message', function(data) {
    console.log(data);
    socket.emit('gamewin', data);
  });
  console.log('server online'); 
});

http.listen(3000);