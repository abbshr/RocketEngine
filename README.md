#### fSlider_ws
a Framework of super light weight implement WebSocket Protocol, used in project fSlider

##### features

+ easy to use
+ super light weight
+ high performance
+ suit for newbies' learnning. such as creating a chat room...
+ no third part modules dependience

##### repo states

now in v0.0.1, implement websocket server  
TODO: ws client, implement the security mechanism descripted in RFC 6455

##### Usage

create a websocket server:
```

    var WServer = require('fSlider_ws').Server;

    var http = require('http').createServer(function(req, res) {
      res.end('test');
    });

    var ws = new WServer(http).listen(function(){console.log('wserver start')});

    ws.on('connected', function(socket) { 
      socket.setTimeout(0);
      ws.on('win', function(data) { 
        console.log(data);
        socket.send(data);
      });
      ws.on('closing', function () {
        console.log('client close the connection');
      });
      ws.recive(function(data) {
        console.log(data);
        socket.emit('gamewin', data);
      });
      console.log('server online'); 
    });

    http.listen(3000);
```

as client:
```

    <body>
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
            for (var i = 0; i < 100000; i++) {
              str[i] = 0;
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
```

Server Options:

```
    var options = {
        namespace: '/news',     // default to '/'
        max: 100                // default to 60
    };

    new WServer(httpServer, options);
```

Other usages:

```

    ws.bind();

    ws.unbind();

    ws.connect();

    client.emit();

    client.setTimeOut();

    client.destroy();

    client.close();

    client.send();

    ws.broadcast();

    ws.recive();

    ws.emit();

    ws.on();

    ws.removeListener();
```

##### Server System Level Events
these events' name are important and shouldn't be overwrited or conflict in application
```
    
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