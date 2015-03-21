#!/usr/bin/env node

var fs = require('fs'),
    util = require('util'),
    http = require('http'),
    path = require('path');
var wsf = require('../../index.js'),
    WServer = wsf.Server;

// statics hash
var statics = {
  '/': './ws2.html',
  '/chat': './ws.html',
  '/testclose': './ws3.html',
  '/event.js': '../../node_modules/event.js/event.js',
  '/wsf.js': '../../lib/browser/wsf.js'
}

// http server
var httpd = http.createServer(function(req, res) {
  var dir = statics[req.url] || statics['/'];
  fs.readFile(path.join(__dirname, dir), function (err, file) {
    res.end(file);
  });
});

// websocket server of two different namespaces
var ws = new WServer(httpd),
    ws_1 = new WServer(httpd, { namespace: '/chat' }),
    ws_2 = new WServer(httpd, { namespace: '/testclose' });

var handler = function (socket) {
  // manual set the timeout to 10s
  socket.setTimeout(0);
  // test non-browser client connect
  socket.on('terminal', function (data) {
    console.log(data);
  });
  socket.on('closing', function (code) {
    console.log(code);
    //process.exit(0);
  });
  socket.on('disconnected', function (info) {
    util.log('ws info: client id: ' + socket.id + ' offline');
    console.log(info);
  });
  socket.recive(function (data) {
    console.log(data);
  });
  //util.log('ws info: client id: ' + socket.id + ' online');
  // test non-browser client connect
  socket.emit('hello', 'hi');
  // press test
  /*for (var i = 0; i < 1000000; i++)
    socket.send('asd');*/
};

// test stream-style API
var handler_1 = function (socket) {
  socket.setTimeout(0);
  socket.on('lol', function (imgstream) {
    imgstream.pipe(fs.createWriteStream('./dump.gif')).on('finish', function () {
      socket.send(fs.createReadStream('./dump.gif'));
    });
  });
};

var handler_2 = function (socket) {
  socket.setTimeout(0);
  socket.close(1000, 'yeah, closed!');
};

ws.on('connected', handler);
ws_1.on('connected', handler_1);
ws_2.on('connected', handler_2);

// listen on websocket request
wsf.listen(httpd, function(){
  util.log('wsf server start');
  console.log('open localhost:3000/testclose and localhost:3000/chat to see what happened~')
})

// start the http server
httpd.listen(3000);
