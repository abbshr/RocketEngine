#!/usr/bin/env node

var fs = require('fs'),
    util = require('util'),
    http = require('http'),
    path = require('path');
var WServer = require('../index.js').Server;

// statics hash
var statics = {
  '/': './ws.html',
  '/event.js': '../node_modules/event.js/event.js',
  '/wsf.js': '../lib/browser/wsf.js'
}

// http
var httpd = http.createServer(function(req, res) {
  var dir = statics[req.url] || statics['/'];
  fs.readFile(path.join(__dirname, dir), function (err, file) {
    res.end(file);
  });
});

var ws = new WServer(httpd).listen(function(){
  util.log('wsf server start');
  console.log('open localhost:3000 to see what happened~')
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
