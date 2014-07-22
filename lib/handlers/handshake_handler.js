var utils = require('../utils');
var datarecv_handler = require('../datarecv_handler.js');

/* this has been binded to Server instance */
/* return <true> for upgrade_router's valid */
/* argument @req has been pre-setted */
module.exports = function (req, socket) {

  // ref to server
  var server = this;

  // create a instance for connecting client to restore vars and buffer
  var client = new Client(socket);
  var resKey, resHeaders;

  // cache recive-buffer, as ref 
  var cache = {
    frame: new Buffer(0),
    fragmentCache: new Buffer(0)
  };
  // up to limit, throw exception
  if (server.getSocketsLength() + 1 > server.MAX) {
    server.sysEmit('uptolimit', server.MAX);
    utils.error(new Error('can not handle this request, socket has been up to the MAX number'));
    return true;
  }

  resKey = crypto.createHash('sha1')
    .update(req.headers['sec-websocket-key'] + MAGIC_STRING)
    .digest('base64');

  /* ws protocol handshake request head */
  resHeaders = ([
    'HTTP/1.1 101 Switching Protocols',
    'Upgrade: websocket',
    'Connection: Upgrade',
    'Sec-WebSocket-Accept: ' + resKey
  ]).concat('', '').join('\r\n');

  //socket.setEncoding('utf8');
  // on any data incomming
  socket.on('data', datarecv_handler.bind(server, client, cache));

  // on disconnect
  socket.on('close', function (has_error) {
    delete server._sockets[client.id];
    // trigger 'disconnected' event
    client.sysEmit('disconnected', client);
    server.sysEmit('disconnected', client);
    if (has_error)
      utils.error(new Error('some problems happened during socket closing'));
  });

  // client disconnect
  socket.on('end', function () {
    socket.end();
    client.sysEmit('closing', client);
    server.sysEmit('closing', client);
  });

  socket.on('drain', function () {
    socket.resume();
    client.sysEmit('drained', socket.bufferSize);
    server.sysEmit('drained', socket.bufferSize);
    utils.log('system buffer has been drained');
  });

  socket.on('timeout', function () {
    // send close frame
    //client.emitCtrl(0x8, "connection timeout");
    utils.log('connection closed by timeout');
    socket.end('connection closed by timeout');
    client.sysEmit('timeout');
    server.sysEmit('timeout');
  });

  socket.on('error',function (err) {
    socket.destroy();
    client.sysEmit('exception', err);
    server.sysEmit('exception', err);
    // send close frame
    //client.emitCtrl(0x8, "problems happened on connection");
    utils.error(err);
  });

  // add the client to clients-stack
  server._sockets[client.id] = client;

  // send handshake response
  socket.write(resHeaders) || socket.pause();

  // on connection established
  server.sysEmit('connected', client);

  return true;
}