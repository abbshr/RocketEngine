#### fSlider_ws
a Framework of super light weight implement WebSocket Protocol, used in project fSlider

##### features

+ easy to use
+ super light weight
+ suit for newbies' learnning. such as creating a chat room...
+ no third part modules dependience

##### repo states

now in v0.0.1, implement websocket server  
TODO: ws client, implement the whole websocket protocol descript in RFC 6455

##### Usage

create a websocket server:
```
    var http = require('http');
    var WServer = require('fSlider_ws').Server;
    
    var httpServer = http.createServer(function (req, res) {
        res.end('ws test');
    });
    
    var ws = new WServer(httpServer).listen();
    ws.on('connect', function (socket) {
        ws.on('say', function (data) {
            console.log(data);
        });
        socket.emit('welcome', JSON.stringify({'name': 'Ran', 'say': 'Hello~'}));
    });
    
    httpServer.listen(3000);
```

a simple client:
```
    var ws = new WebSocket('ws://localhost:3000');
    
    ws.onmessage = function (e) { 
        var data = JSON.parse(e.data);
        console.log(data); 
    };
    
    ws.onopen = function () {
        ws.send(JSON.stringify({ 'event': "say", data: "hi" }));
    };
```

Options:

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

ws.emit();

ws.on();

ws.removeListener();
```
