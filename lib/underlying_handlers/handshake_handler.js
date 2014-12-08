var crypto = require('crypto');

var utils = require('../utils');
var Client = require('../client.js');
var datarecv_handler = require('./datarecv_handler.js');

/* this has been binded to Server instance */
/* return <true> for upgrade_router's valid */
/* argument @req has been pre-setted */
module.exports = function (req, socket) {

  // ref to server
  var server = this;

  // create a instance for connecting client to restore vars and buffer
  var client = new Client(socket, server._sockets);
  var resKey, resHeaders;

  // references to recive raw data and resolved payload data 
  var _buffer = {
    r_queue: new Buffer(0),
    f_payload_data: new Buffer(0)
  };
  // up to limit, throw exception
  if (server.getConnectCount() + 1 > server.MAX) {
    server.sysEmit('uptolimit', server.MAX);
    utils.error(new Error('can not handle this request, socket has been up to the MAX number'));
    return true;
  }

  resKey = crypto.createHash('sha1')
    .update(req.headers['sec-websocket-key'] + utils.MAGIC_STRING)
    .digest('base64');

  /* ws protocol handshake request head */
  resHeaders = ([
    'HTTP/1.1 101 Switching Protocols',
    'Upgrade: websocket',
    'Connection: Upgrade',
    'Sec-WebSocket-Accept: ' + resKey
  ]).concat('', '').join('\r\n');

  //socket.setEncoding();

  socket
    // on any data incomming
    .on('data', datarecv_handler.bind(server, client, _buffer))
    // server TCP socket ready to close
    .on('finish', function () {
      client.sysEmit('sessionend');
      server.sysEmit('sessionend', client);
      utils.log('server TCP socket ready to close');
    })
    // client TCP socket ready to close
    .on('end', function () {
      client.sysEmit('clientclose');
      server.sysEmit('clientclose', client);
      utils.log('client TCP socket ready to close');
    })
    // underlying TCP socket has been closed
    .on('close', function (has_error) {
      delete server._sockets[client.get('id')];
      server.conns--;
      // trigger 'disconnected' event
      client.sysEmit('disconnected');
      server.sysEmit('disconnected', client);
      utils.log('TCP connection closed');
      if (has_error)
        utils.error(new Error('some problems happened during TCP connection closing'));
    })
    .on('drain', function () {
      // once the internal buffer has been drained
      // resume emitting 'data' event
      socket.resume();
      // and go on executing the pended operations
      client.execQ.goon();
      client.sysEmit('drained', socket.bufferSize);
      server.sysEmit('drained', socket.bufferSize);
      utils.log('user space buffer-queue has been drained');
    })
    .on('timeout', function () {
      utils.log('connection closed by timeout');
      socket.end('connection closed by timeout');
      client.sysEmit('timeout');
      server.sysEmit('timeout');
    })
    .on('error',function (err) {
      socket.destroy();
      client.sysEmit('exception', err);
      server.sysEmit('exception', err);
      utils.error(err);
    });

  // add the client to clients-stack
  //server._sockets[client.id] = client;
  server.conns++;

  client._write(resHeaders);

  // on connection established
  server.sysEmit('connected', client);

  return true;
}