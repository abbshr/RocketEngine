#!/usr/bin/env node

var fs = require('fs'),
    util = require('util'),
    http = require('http'),
    path = require('path');
var wsf = require('../../index.js'),
    WServer = wsf.Server;

// statics hash
var statics = {
  '/': './chat.html',
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

var ws = new WServer(httpd, { namespace: '/socket' });
var ws2 = new WServer(httpd, { namespace: '/all' });

var clients = {};
var messages = [];
var conn_num = 0;

var handler = function (socket) {
  // assign an id to this client
  socket.on('reg', function (d) {
    socket.identify(d.id, function () {
      console.log('client registy:', d.id);
    });
  });
  // set no timeout
  socket.setTimeout(0);
  // on receive message
  socket.receive(function (data) {
    var message = data.body;
    console.log('Client ' + socket.get('id') + ':' + message);
    // temp workaround
    //ws._sockets[id] = socket;
    messages.push(message);
    conn_num ++;
    ws.broadcast('data', data);
  });
};

var handler2 = function (socket) {
  socket.setTimeout(0);
  socket.send(messages);
};

ws.on('connected', handler);
ws2.on('connected', handler2);

// listen on websocket request
wsf.listen(httpd, function(){
  util.log('wsf server start');
  console.log('server listen on http://localhost:3000');
})

// start the http server
httpd.listen(3000);
