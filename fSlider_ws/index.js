
var http         = require('http');
var crypto       = require('crypto');
var EventEmitter = require('events').EventEmitter;

var core         = require('./lib'),
    Client       = core.Client,
    decodeFrame  = core.decodeFrame;

var MAGIC_STRING = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

var wsf = {};

// inherint from EventEmitter
wsf = Object.create(new EventEmitter());


/*
* wsf
* method:
* .connect: connect to a WebSocket Server
* Class:
* wsf.Server @server, @options: create a WebSocket Server
* method:
* .bind @server, @options: bind wsfserver to a http Server
* .unbind: opposite to .bind(server, options)
* .listen @callback: start listen on http server, add listener to 'upgrade' event
* .broadcast @e, @data: broadcast to all clients
* .on: (inherint from EventEmitter), on event triggered
* .emit: (inherint from EventEmitter), trigger event
* .removeListener: (inherint from EventEmitter)
*/

/*
* wsf System level events, 
* these events' name are important and shouldn't be overwrited or conflict in application
*
* #listen @httpServer: new http.Server()
* #uptolimit @limit: new wsf.Server().MAX
* #disconnected @client: new Client()
* #closing @data: new Buffer()
* #drained @bufferSize: socket.bufferSize
* #timeout
* #exception @err: new Error()
* #connected @client: new Client()
*
*/
module.exports = wsf;

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
  var httpServer = this.httpServer;
  if (callback instanceof Function)
    this.on('listen', callback);
  if (!httpServer || !(httpServer instanceof http.Server)) 
    return new Error('no http server init');
  // bind 'upgrade' event callback
  httpServer.on('upgrade', upgrade_handler.bind(this));
  this.emit('listen', httpServer);
  return this;
};

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

/* 'upgrade' event callback */
/* this has been binded to Server instance */
/* argument @req has been pre-setted */
function upgrade_handler(req, socket) {
  // ref to server
  var server = this;

  // create a instance for connecting client to restore vars and buffer
  var client = new Client(socket);
  var resKey, resHeaders;

  // recive-buffer, as ref 
  var buffer = {
    frame: new Buffer(0),
  };

  // up to limit, throw exception
  if (server.sockets.length + 1 > server.MAX) 
    server.emit('uptolimit', server.MAX);
    return new Error('can not handle this request, socket has been up to the MAX number');

  // if the request page URL not match, reject the request
  if (req.url !== server.namespace) 
    return;

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

  socket.setEncoding('utf8');
  // on any data incomming
  socket.on('data', data_handler.bind(server, client, buffer));

  // on disconnect
  socket.on('close', function (has_error) {
    var stack = server.sockets;
    // pop from stack
    stack.forEach(function (client, i) {
      if (client.socket === socket) 
        stack.splice(i, 1);
    });
    // trigger 'disconnected' event
    server.emit('disconnected', client);
    if (has_error)
      console.log('some problems happened during socket closing');
  });

  // client ready to disconnect
  socket.on('end', function (data) {
    if (data) 
      data_handler.bind(server, client, buffer)(data);
    socket.end();
    server.emit('closing', data);
  });

  socket.on('drain', function () {
    socket.resume();
    server.emit('drained', socket.bufferSize);
    console.log('system buffer has been drained');
  });

  socket.on('timeout', function () {
    socket.end('connection closed by timeout');
    server.emit('timeout');
  });

  socket.on('error',function (err) {
    socket.destroy();
    server.emit('exception', err);
    console.log(err);
  });

  // add the client to clients-stack
  server.sockets.push(client);

  // send handshake response
  socket.write(resHeaders) || socket.pause();

  // on connection established
  server.emit('connected', client);
}

/* this has been binded to Server instance */
/* arguments @client and @buffer has been pre-setted */
function data_handler(client, buffer, data) {
  var readable_data, payload_data, event, rawdata;

  // concat the buffer with last time resolved frame
  // because sometimes a lot of 'data' event may be triggered in one time,
  // node treat them as one-time event,
  // if not do so, some data could be lost
  buffer.frame = Buffer.concat([buffer.frame, data]);

  // the "while loop" to get all right data remain in buffer
  while (readable_data = decodeFrame(buffer.frame)) {
    // translate raw Payload_data to string
    payload_data = readable_data['Payload_data'].toString();
    // if payload_data format is not standard, JSON.parse will throw an error
    try {
      payload_data = JSON.parse(payload_data);
    } catch (e) {
      // cut this frame and skip to remain_frame
      console.log(e);
    }
    event = payload_data.hasOwnProperty('event') ? payload_data['event'] : new Error('Payload_data translate error');
    rawdata = payload_data.hasOwnProperty('data') ? new Buffer(payload_data['data']) : new Error('Payload_data translate error');
    if (event instanceof Error) {
      throw event;
    } else if (rawdata instanceof Error) {
      throw rawdata;
    } else {
      // if nothing goes wrong, emit event to Server
      this.emit(event, rawdata);
    }
    // the rest frame data
    buffer.frame = readable_data.remain_frame;
  }
}