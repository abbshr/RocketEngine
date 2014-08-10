#!/usr/bin/env node

var fs = require('fs'),
    util = require('util'),
    http = require('http'),
    path = require('path');
var wsf = require('../index.js'),
    WServer = wsf.Server;

// statics hash
var statics = {
  '/': './ws2.html',
  '/chat': './ws.html',
  '/event.js': '../node_modules/event.js/event.js',
  '/wsf.js': '../lib/browser/wsf.js'
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
    ws_1 = new WServer(httpd, { namespace: '/chat' });

var handler = function (socket) { 
  // manual set the timeout to 10s
  socket.setTimeout(10000);
  // test non-browser client connect
  socket.emit('hello', 'hi');
  // test non-browser client connect
  socket.on('terminal', function (data) {
    console.log(data);
  });
  socket.recive(function(data) {
    // every time when connected, send a random picture ^_^
    data = fs.readFileSync(path.join(__dirname, '' + parseInt(Math.random() * 5)));
    socket.send(data);
  }); 
  socket.on('disconnected', function (socket) {
    util.log('ws info: client id: ' + socket.id + ' offline');
  });
  util.log('ws info: client id: ' + socket.id + ' online');
};

var handler_1 = function (socket) { 
  // manual set the timeout to 10s
  socket.setTimeout(10000);
  socket.recive(function(data) {
    // every time when connected, send a random picture ^_^
    data = fs.readFileSync(path.join(__dirname, '' + parseInt(Math.random() * 5)));
    socket.send(data);
  }); 
  socket.on('disconnected', function (socket) {
    util.log('ws_1 info: client id: ' + socket.id + ' offline');
  });
  util.log('ws_1 info: client id: ' + socket.id + ' online');
};

ws.on('connected', handler);
ws_1.on('connected', handler_1);

// listen on websocket request
wsf.listen(httpd, function(){
  util.log('wsf server start');
  console.log('open localhost:3000 and localhost:3000/chat to see what happened~')
})

// start the http server
httpd.listen(3000);
