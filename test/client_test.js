var wsf = require('../index.js');

wsf.connect('ws://127.0.0.1:3000', function(client) {
  client.on('hello', function (data) {
    console.log(data);
    client.emit('terminal', 'hello');
    client.close(1000, 'I\'ll closed');
  });
});