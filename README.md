[fSlider_ws V0.2.6 中文版Wiki](https://github.com/abbshr/fSlider-WebSocketFramework/wiki/fSlider_ws-V0.2.2-%E4%B8%AD%E6%96%87%E7%89%88Wiki)
===

[![Build Status](https://travis-ci.org/abbshr/fSlider-WebSocketFramework.svg?branch=dev-eventemitter)](https://travis-ci.org/abbshr/fSlider-WebSocketFramework)

#### fSlider_ws V0.2.6

![img](https://raw.githubusercontent.com/abbshr/fSlider-WebSocketFramework/dev-eventemitter/test/screen.png)

a Framework of super light weight implement WebSocket Protocol, used in project fSlider

##### features

+ easy to use
+ super light weight
+ high performance
+ full event driven
+ multi websocket servers have their own split namespace
+ custom events support
+ comprehensive functions supported in client/browser
+ suit for newbies' learnning. such as creating a chat room...
+ detailed output log
+ support a 'non-browser' websocket client
+ no third part modules dependience

##### repo states

now in v0.2.6, implement websocket server and websocket non-browser client
TODO: implement the security mechanism descripted in RFC 6455

##### Install

```sh
npm install fslider_ws
```

if you have clone this repo, just need to install dependencies:

```sh
npm install
```

##### run test

```sh
npm test
```

##### Usage

create a websocket server:

```js

  var fs = require('fs'),
      util = require('util'),
      http = require('http'),
      path = require('path');
  var wsf = require('../index.js'),
      WServer = wsf.Server;

  // statics hash
  var statics = {
    '/': './ws.html',
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

  // listen on upgrade request
  wsf.listen(httpd, function(){
    util.log('wsf server start');
    console.log('open localhost:3000 to see what happened~')
  });

  // websocket server
  var ws = new WServer(httpd);

  ws.on('connected', function(socket) { 
    // no timeout limit
    //socket.setTimeout(0);
    
    // manual set the timeout to 10s
    socket.setTimeout(10 * 1000);
    
    // send binary data
    // listen on app-level event "data" from client
    socket.recive(function(data) {
      // every time when connected, send a random picture ^_^
      data = fs.readFileSync("" + parseInt(Math.random() * 5));
      socket.send(data);
    });

    // listen on app-level custom event from client
    socket.on('geek', function (data) {
      console.log(data);
      // emit app-level custom event to client
      socket.emit('geekcomming', data + ' Aizen');
    });

    // disconnect
    socket.on('disconnected', function (socket) {
      util.log('client id: ' + socket.id + ' offline');
    });
  });

  // start the http server
  httpd.listen(3000);
```

as client:

```html

  <body>
    <img id="ws"></img>
    <script src="fSlider_ws/node_modules/event.js/event.js"></script>
    <script src="fSlider_ws/lib/browser/wsf.js"></script>
    <script>
      /* reference usage */
      wsf.connect('ws://localhost:3000', function (socket) {
        // in default setting, 'reconnect' is enabled
        // invoke `socket.autoreconnect = false` to disabled
        console.log('connected');
        // set "normal-reconnect" no-delay
        // in "error-reconnect", once expire is set to 0, 
        // it'll automatic revalued to 6000
        socket.expire = 0;
        var bin = new Blob(['hihihi']);
        socket.send(bin);

        socket.on('error', function (data) {
          socket.close();
        });
        socket.on('close', function (info) {
          console.log('bye', info);
        })
        socket.recive(function (data) {
          bloburl = URL.createObjectURL(data);
          document.querySelector('#ws').src = bloburl;
        });
        socket.on('geekcomming', function (data) {
          console.log(data);
          socket.close();
        });
        socket.emit('geek', 'Ran');
    </script>
  </body>
```

use non-browser client to connect:

```js

var wsf = require('fslider_ws');

wsf.connect('ws://localhost:3000', function (client) {
  client.emit('event', 'datatatatata');
  client.on('event', function (data) {
    console.log(data);
    client.close();
  });
});
```

Server Options:

```js

    var options = {
      namespace: '/news',     // default to '/'
      max: 100                // default to 60
    };

    new WServer(httpServer, options);
```

Other usages:

```js

    wsf.connect();

    wsf.listen();

    wsf.close();
    
    server.bind();

    server.unbind();

    server.broadcast();

    server.emit();

    server.on();

    server.removeListener();
    
    client.emit();

    client.setTimeout();
    
    client.sysEmit();
    
    client.emitCtrl();
    
    client.send();
    
    client.recive();

    client.destroy();

    client.close();
```
#### see WIKI to lookup the whole reference