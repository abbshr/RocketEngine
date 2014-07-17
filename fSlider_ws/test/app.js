#!/usr/bin/env node

var fs = require('fs'),
    util = require('util'),
    http = require('http'),
    path = require('path');
var WServer = require('../index.js').Server;

var httpd = http.createServer(function(req, res) {
  res.end('test');
});

var ws = new WServer(httpd).listen(function(){
  util.log('wsf server start');
  console.log('open "ws.html" in explorer such as chrome/firefox to watch what happened~');
});

ws.on('connected', function(socket) { 
  // manual set the timeout to 10s
  socket.setTimeout(10000);
  socket.recive(function(data) {
    // every time when connected, send a random picture ^_^
    data = fs.readFileSync(path.join(__dirname, '' + parseInt(Math.random() * 5)));
    socket.send(data);
  }); 
  util.log('client id: ' + socket.id + ' online');
});

httpd.listen(3000);
