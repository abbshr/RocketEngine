
var http         = require('http');
var crypto       = require('crypto');
var EventEmitter = require('events').EventEmitter;

var core         = require('./lib'),
    Client       = core.Client,
    decodeFrame  = core.decodeFrame;

var MAGIC_STRING = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

var wsf          = {};

wsf = Object.create(new EventEmitter());

wsf.connect = function () {};
wsf.Server = function (server, options) {
  options = options || {};
  options.max = options.max || 60;
  options.namespace = options.namespace || '/';
  this.MAX = options.max;
  this.sockets = [];
  this.namespace = options.namespace;
  this.httpServer = server;
  this._super = wsf;
};

wsf.Server.prototype = new EventEmitter();
wsf.Server.prototype.bind = function (server, options) {
  if (server) {
    if (!(server instanceof http.Server)) 
      return new Error('argument "server" must be a http.Server instance!');
    if (server === this.httpServer)
      return;
    if (!this.server) this.httpServer = server, this.namespace = options.namespace;
  } else {
    return;
  }
};
wsf.Server.prototype.unbind = function () {
  if (this.httpServer && this.httpServer instanceof http.Server)
    this.httpServer = null, this.namespace = '/';
};
wsf.Server.prototype.listen = function (callback) {
  wsf.on('listen', callback);
  var httpServer = this.httpServer;
  if (!httpServer || !(this.httpServer instanceof http.Server)) 
    return new Error('no http server init');
  httpServer.on('upgrade', upgrade_handler.bind(this));
  wsf.emit('listen');
  return this;
};
/*wsf.Server.prototype.toPool = function (client, frame) {
  this.emit
}*/
wsf.Server.prototype.broadcast = function (e, data) {
  this.sockets.forEach(function (client) {
    client.emit(e, data);
  });
};

module.exports = wsf;

function upgrade_handler(req, socket) {
  if (this.sockets.length + 1 > this.MAX) 
    return new Error('can not handle this request, socket has been up to the MAX number');
  if (req.url !== this.namespace) return;
  var key = req.headers['sec-websocket-key'];
  key = crypto
    .createHash('sha1')
    .update(key + MAGIC_STRING)
    .digest('base64');
  var resHeaders = [
    'HTTP/1.1 101 Switching Protocols',
    'Upgrade: websocket',
    'Connection: Upgrade',
    'Sec-WebSocket-Accept: ' + key
  ];
  var buffer = {
    frame: new Buffer(0),
  };
  var client = new Client(socket);
  resHeaders = resHeaders.concat('', '').join('\r\n');
  socket.on('data', data_handler.bind(this, client, buffer));
  this.sockets.push(client);
  socket.write(resHeaders);
  this.emit('connect', client);
}

function data_handler(client, buffer, data) {
  buffer.frame = Buffer.concat([buffer.frame, data]);
  var readable_data;
  while (readable_data = decodeFrame(buffer.frame)) {
    // to string
    readable_data['Payload_data'] = readable_data['Payload_data'].toString();
    if (readable_data['Payload_data'].match(/^{(.+)}$/)) { 
      data = JSON.parse(readable_data['Payload_data']);
      e = data['event'];
      // all incoming message push to server events-pool
      //this._events[e] && this.toPool(client, data);
      this.emit(e, data['data']);
    }
    buffer.frame = readable_data.frame;
  }
}