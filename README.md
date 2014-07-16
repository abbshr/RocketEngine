fSlider_ws V0.1.1
===
a Framework of super light weight implement WebSocket Protocol, used in project fSlider

##### features

+ easy to use
+ super light weight
+ high performance
+ suit for newbies' learnning. such as creating a chat room...
+ no third part modules dependience

##### repo states

now in v0.1.1, implement websocket server  
TODO: ws as a client, implement the security mechanism descripted in RFC 6455

##### Usage

create a websocket server:

```js

  var fs = require('fs');
  var http = require('http');
  var WServer = require('fSlider_ws').Server;

  var httpd = http.createServer(function(req, res) {
    res.end('test');
  });

  var ws = new WServer(httpd).listen(function () {
    console.log('wsf: server start');
  });

  ws.on('connected', function(socket) { 
    // no timeout limit
    socket.setTimeout(0);
    // send binary data
    // listen on app-level event "data" from client
    socket.recive(function(data) {
      // send a picture
      data = fs.readFileSync('art.jpg');
      // emit app-level event "data" to client
      socket.send(data);
    });
    // listen on app-level custom event from client
    socket.on('geek', function (data) {
      console.log(data);
      // emit app-level custom event to client
      socket.emit('geekcomming', data + ' Aizen');
    });
    console.log('client online, cid:', socket.id); 
  });

  httpd.listen(3000);
```

as client:
<<<<<<< HEAD
```

  <body>
    <div id="ws"></div>
    <script src="../fSlider_ws/frontend/event.js/event.js"></script>
    <script src="../fSlider_ws/frontend/wsf.js"></script>
    <script>
      /* reference usage */
      wsf.connect('ws://localhost:3000', function (e) {
        var socket = e.detail;
        console.log(socket);
        socket.on('open', function (e) {
          socket.emit('win', {'comment': 'hi'});
          console.log('connection established');
        });
        socket.on('close', function (e) {
          console.log('lose connection', e.detail);
        })
        socket.recive(function (e) {
          var data = e.detail;
          var str = [];
          console.log(data);
          // notice that complication request count may be very low in this version
          // because of the explorer's event mechanism,
          // in this version, you'll get a UI-non-blocking, 
          // for exchange, you'll get a low performance

          // if you insist on sending even small data, great number of times in a loop, 
          // I promise that you can't stand to wait it finished

          // in my test, send 1800000 times string '1' in a for loop will take over 9 mins
          // if you want a high performance anyway in any conditions, 
          // please see the 'master' branch


          // ex:
          // request 65536 times str in one time, this is no problems
          for (var i = 0; i < 65536; i++) {
            socket.send(1);
          }
          for (var i = 0; i < 1800000; i++) {
            str[i] = 1;
          }
          str = str.join('');
          // send a 1757 KB string
          socket.send(str);
        });
        socket.on('gamewin', function (e) {
          var data = e.detail;
          console.log(data);
        }); 
      });
    </script>
  </body>

=======

```html

  <body>
    <img id="ws"></div>
    <script src="fSlider_ws/frontend/wsf.js"></script>
    <script>
      wsf.connect('ws://localhost:3000', function (socket) {
        socket.on('open', function (e) {
          var bin = new Blob(['hihihi']);
          socket.send(bin);
          console.log('connection established');
        });
        socket.on('error', function (e) {
          socket.close();
        });
        socket.recive(function (data) {
          bloburl = URL.createObjectURL(data);
          document.querySelector('#ws').src = bloburl;
        });
        socket.on('geekcomming', function (data) {
          console.log(data);
          socket.close();
        });
        socket.emit('geek', 'Ran');
      });
    </script>
  </body>
>>>>>>> dev
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

##### Server System Level Events
these events' name are important and shouldn't be overwrited or conflict in application

```js
    
    'listen' 
        @httpServer: new http.Server()
    'uptolimit' 
        @limit: new wsf.Server().MAX
    'disconnected' 
        @client: new Client()
    'closing' 
        @data: new Buffer()
    'drained' 
        @bufferSize: socket.bufferSize
    'timeout'
        (none)
    'exception' 
        @err: new Error()
    'connected' 
        @client: new Client()
```
