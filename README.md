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

    var WServer = require('../fSlider_ws').Server;

    var http = require('http').createServer(function(req, res) {
      res.end('test');
    });

    var ws = new WServer(http).listen(function(){console.log('wserver start')});

    ws.on('connected', function(socket) { 
      socket.setTimeout(0);
      ws.on('win', function(data) { 
        console.log(data);  
        //socket.emit('gamewin' , {'name': 'Ran Aizen', 'say': 'hello Ran, you win' });
        socket.emit('data', data);
      });
      ws.on('closing', function () {
        console.log('client close the connection');
      });
      ws.on('message', function(data) {
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
      <script src="./fSlider_ws/frontend/wsf.js"></script>
      <script>
        /* connect to a wsf */
        wsf.connect('ws://localhost:3000', function (socket) {
          socket.on('open', function (e) {
            socket.emit('win', {'comment': 'hi'});
            console.log('connection established');
          });
          socket.on('close', function (e) {
            console.log('lose connection', e);
          })
          socket.on('data', function (data) {
            var str = [];
            console.log(data);
            for (var i = 0; i < 1800000; i++) {
              str[i] = 0;
            }
            str = str.join('');

            // send a 1757 KB string
            socket.send(str);
          });
          socket.on('gamewin', function (data) {
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

    ws.broadcast();

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