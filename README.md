[fSlider_ws V0.3.2 中文版Wiki](https://github.com/abbshr/fSlider_ws/wiki/fSlider_ws-V0.3---%5BRainy%5D-%E4%B8%AD%E6%96%87%E7%89%88Wiki)
===

#### fSlider_ws V0.3.2 - Rainy

a Framework of super light weight implement WebSocket Protocol, used in project fSlider

now it's named Rainy.

##### features

+ easy to use
+ super light weight
+ high performance
+ full event driven
+ multi websocket servers have their own split namespace
+ support binary data transmission and provide convenient operations for it.
+ custom events support
+ comprehensive functions supported in client/browser
+ suit for newbies' learnning. such as creating a chat room...
+ detailed output log
+ 
+ support a 'non-browser' websocket client
+ no third part modules dependience
+ support websocket connection over tls/ssl

##### repo states

now in v0.3.2, implement websocket server, websocket non-browser client and the security mechanism descripted in RFC 6455

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

####APIs:
**see the [WIKI](https://github.com/abbshr/fSlider_ws/wiki/fSlider_ws-V0.3---%5BRainy%5D-%E4%B8%AD%E6%96%87%E7%89%88Wiki) page to lookup the whole reference**

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

in browser:

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
