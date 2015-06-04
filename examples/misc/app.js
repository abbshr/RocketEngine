#!/usr/bin/env node

var fs = require('fs'),
    util = require('util'),
    http = require('http'),
    path = require('path');
var rocket = require('../../index.js'),
    RocketServer = rocket.Server;

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
  socket.receive(function (data) {
    console.log(data);
  });
  socket.on('awake', function (d) { console.log(d); });
  //util.log('ws info: client id: ' + socket.id + ' online');
  // test non-browser client connect
  socket.emit('hello', 'hi');
  socket.emit('awake');
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

// statics list
var statics = {
  '/': './ws2.html',
  '/chat': './ws.html',
  '/testclose': './ws3.html'
};
statics.__proto__ = null;

// http server
var httpServer = http.createServer(function(req, res) {
  if (req.url in statics) {
    fs.readFile(path.join(__dirname, statics[req.url]), function (err, file) {
      res.end(file);
    });
  } else {
    res.statusCode = 404;
    res.statusMessage = 'Not Found';
    res.end('NOT FOUND');
  }
});

// websocket server with three different namespaces
// => /, /chat, /testclose
var rock = new RocketServer(httpServer).on('connected', handler)

    , rock_1 = new RocketServer(httpServer, {
      namespace: '/chat'
    }).on('connected', handler_1)

    , rock_2 = new RocketServer(httpServer, {
      namespace: '/testclose'
    }).on('connected', handler_2);

// listen on websocket request
rocket.listen(httpServer, function(httpServer){
  util.log('wsf server start');
  console.log('open localhost:3000/testclose and localhost:3000/chat to see what happened~');
  // start the http server
  httpServer.listen(3000);
});
