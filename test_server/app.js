var WServer = require('./fSlider_ws').Server;

var http = require('http').createServer(function(req, res) {
  res.end('test');
});

var ws = new WServer(http).listen(function(){console.log('wserver start')});

ws.on('connect', function(socket) { 
  ws.on('custom', function(data) { 
    console.log(data);  
    socket.emit('custom' , {'name': 'Ran Aizen', 'say': 'hello~, I\'m Ran' });
  });
  console.log('hi~ I\'m online'); 
});

http.listen(3000);