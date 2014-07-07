
var http         = require('http');
var crypto       = require('crypto');
var EventEmitter = require('events').EventEmitter;

var core         = require('./lib'),
    Client       = core.Client,
    decodeFrame  = core.decodeFrame;

var MAGIC_STRING = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

var wsf          = {};

// inherint from EventEmitter
wsf = Object.create(new EventEmitter());

// as a Client
wsf.connect = function () {};

// as a Server

/* 
 * @server: http.Server instance
 * @options: {
 *  max: max counts of clients can connect to wsf server
 *  namespace: URL that could request handshake
 * }
 */
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

// inherint from EventEmitter
wsf.Server.prototype = new EventEmitter();

/* 
* #bind(server, options) 
* des: wsf server method, for manual binding a httpServer
* @server: http.Server instance
* @options: as above
*/
wsf.Server.prototype.bind = function (server, options) {
  if (server) {
    if (!(server instanceof http.Server)) 
      return new Error('argument "server" must be a http.Server instance!');
    if (server === this.httpServer)
      return;
    if (!this.server) 
      this.httpServer = server, this.namespace = options.namespace;
  } else {
    return;
  }
};

/*
* #unbind()
* des: oppsite to #bind() method
*/
wsf.Server.prototype.unbind = function () {
  if (this.httpServer && this.httpServer instanceof http.Server)
    this.httpServer = null, this.namespace = '/';
};

/*
* #listen(callback)
* des: listen on a httpServer instance
* @callback
*/
wsf.Server.prototype.listen = function (callback) {
  this.on('listen', callback);
  var httpServer = this.httpServer;
  if (!httpServer || !(httpServer instanceof http.Server)) 
    return new Error('no http server init');

  // bind 'upgrade' event callback
  httpServer.on('upgrade', upgrade_handler.bind(this));
  this.emit('listen');
  return this;
};

/*wsf.Server.prototype.toPool = function (client, frame) {
  this.emit
}*/

/*
* #broadcast(e, data)
* des: wsf server broadcast via this method.
* @e: cumstom event name
* @data: the msg to broadcast
*/
wsf.Server.prototype.broadcast = function (e, data) {
  this.sockets.forEach(function (client) {
    client.emit(e, data);
  });
};

module.exports = wsf;

/* 'upgrade' event callback */
function upgrade_handler(req, socket) {

  // up to limit, throw exception
  if (this.sockets.length + 1 > this.MAX) 
    return new Error('can not handle this request, socket has been up to the MAX number');

  // 
  if (req.url !== this.namespace) return;

  var key = req.headers['sec-websocket-key'];
  key = crypto.createHash('sha1')
    .update(key + MAGIC_STRING)
    .digest('base64');

  /* ws protocol handshake request head */
  var resHeaders = [
    'HTTP/1.1 101 Switching Protocols',
    'Upgrade: websocket',
    'Connection: Upgrade',
    'Sec-WebSocket-Accept: ' + key
  ];

  // recive-buffer, as ref 
  var buffer = {
    frame: new Buffer(0),
  };

  // create a instance for connecting client to restore vars and buffer
  var client = new Client(socket);
  resHeaders = resHeaders.concat('', '').join('\r\n');

  // on any data incomming
  socket.on('data', data_handler.bind(this, client, buffer));

  // on disconnect
  socket.on('close', function (has_error) {
    socket.destory();
    var stack = this.sockets;

    // pop from stack
    stack.forEach(function (client, i) {
      if (client.socket === socket) 
        stack.splice(i, 1);
    });
    this.emit('disconnect', client);
  });

  // client ready to disconnect
  socket.on('end', function () {
    socket.end();
  });

  // add the client to clients-stack
  this.sockets.push(client);

  // send handshake response
  socket.write(resHeaders);

  // on connection established
  this.emit('connect', client);
}

function data_handler(client, buffer, data) {
  // concat the buffer with last time resolved frame
  // because sometimes a lot of 'data' event may be triggered in one time,
  // node treat them as one-time event,
  // if not do so, some data could be lost
  buffer.frame = Buffer.concat([buffer.frame, data]);
  
  var readable_data;

  // the "while loop" to get all right data remain in buffer
  while (readable_data = decodeFrame(buffer.frame)) {
    // to string
    //readable_data['Payload_data'] = readable_data['Payload_data'].toString();
    // match JSON format data
    /*if (readable_data['Payload_data'].match(/^{(.+)}$/)) { 
      data = JSON.parse(readable_data['Payload_data']);
      e = data['event'];
      this.emit(e, data['data']);
    }*/

    // TODO: handle the JSON obj include readable frame and raw rest frame
    // readable_data.frame
    // don't forget to emit custom event here

    // the rest frame data
    buffer.frame = readable_data.remain_frame;
  }
}