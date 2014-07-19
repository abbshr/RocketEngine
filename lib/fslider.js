
var http         = require('http');
var crypto       = require('crypto');
var util         = require('util');
var EventEmitter = require('events').EventEmitter;

var utils        = require('./utils'),
    Client       = require('./client.js'),
    decodeFrame  = utils.decodeFrame;

var MAGIC_STRING = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

var wsf = {};

// inherint from EventEmitter
wsf = Object.create(new EventEmitter());
module.exports = wsf;

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

// as a Client
//wsf.connect = function () {};

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
  //this._sockets = [];
  this._sockets = {};
  this.namespace = options.namespace;
  this.httpServer = server;
  this._super = wsf;
};

// inherint from EventEmitter
util.inherits(wsf.Server, EventEmitter);

wsf.Server.prototype.getSocketIdCluster = function () {
  return Object.keys(this._sockets);
};

wsf.Server.prototype.getClient = function (id) {
  return this._sockets[id];
};

wsf.Server.prototype.getSocketsLength = function () {
  return Object.keys(this._sockets).length;
};

// ref the origin .emit()
wsf.Server.prototype.sysEmit = wsf.Server.prototype.emit;

// overwrite the .emit()
/*
* #emit(client, event, data)
* des: emit an event to the given client with the given data, if client is null, the effect as .broadcast()
* @client:
* @event:
* @data:
*/
wsf.Server.prototype.emit = function (client, event, data) {
  var server = this;
  if (client && client instanceof Client)
    client.emit(event, data);
  else
    util.error(new Error('client must be an instance of Client!'));
};

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
    this.on('listen', function (httpServer) {
      utils.coolLogo();
      callback(httpServer);
    });
  if (!httpServer || !(httpServer instanceof http.Server)) 
    return new Error('no http server init');
  // bind 'upgrade' event callback
  httpServer.on('upgrade', upgrade_handler.bind(this));
  this.sysEmit('listen', httpServer);
  return this;
};

/*
* #broadcast(e, data)
* des: wsf server broadcast via this method.
* @e: cumstom event name
* @data: the msg to broadcast
*/
wsf.Server.prototype.broadcast = function (e, data) {
  var self = this;
  //var cluster = self._sockets;
  self.getSocketIdCluster().forEach(function (id) {
    self.getClient(id).emit(e, data);
  });
  /*for (var i in cluster) {
    if (cluster.hasOwnProperty(i))
      cluster[i].emit(e, data);
  }*/
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

  // cache recive-buffer, as ref 
  var cache = {
    frame: new Buffer(0),
    fragmentCache: new Buffer(0)
  };
  // up to limit, throw exception
  if (server.getSocketsLength() + 1 > server.MAX) {
    server.sysEmit('uptolimit', server.MAX);
    return new Error('can not handle this request, socket has been up to the MAX number');
  }

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

  //socket.setEncoding('utf8');
  // on any data incomming
  socket.on('data', data_handler.bind(server, client, cache));

  // on disconnect
  socket.on('close', function (has_error) {
    /*var stack = server._sockets;
    // pop from stack
    stack.forEach(function (client, i) {
      if (client.socket === socket) 
        stack.splice(i, 1);
    });*/
    delete server._sockets[client.id];
    // trigger 'disconnected' event
    client.sysEmit('disconnected', client);
    server.sysEmit('disconnected', client);
    if (has_error)
      util.error(new Error('some problems happened during socket closing'));
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
    util.log('system buffer has been drained');
  });

  socket.on('timeout', function () {
    // send close frame
    //client.emitCtrl(0x8, "connection timeout");
    util.log('connection closed by timeout');
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
    util.error(err);
  });

  // add the client to clients-stack
  //server._sockets.push(client);
  server._sockets[client.id] = client;

  // send handshake response
  socket.write(resHeaders) || socket.pause();

  // on connection established
  server.sysEmit('connected', client);
}

/* this has been binded to Server instance */
/* arguments @client and @cache has been pre-setted */
function data_handler(client, cache, data) {
  var server = this;

  var readable_data, payload_data, event, rawdata, head_len;
  var FIN, Opcode, MASK, Payload_len;

  // concat the buffer with last time resolved frame
  // because sometimes a lot of 'data' event may be triggered in one time,
  // node treat them as one-time event,
  // if not do so, some data could be lost
  cache.frame = Buffer.concat([cache.frame, data]);

  // the "while loop" to get all right data remain in cache
  while (readable_data = decodeFrame(cache.frame)) {
    FIN = readable_data['frame']['FIN'],
    Opcode = readable_data['frame']['Opcode'],
    MASK = readable_data['frame']['MASK'],
    Payload_len = readable_data['frame']['Payload_len'];
    
    // if recive frame is in fragment
    if (!FIN) {
      // save the first fragment's Opcode
      if (Opcode) cache.Opcode = Opcode;
      payload_data = Buffer.concat([cache.fragmentCache, payload_data]);
    } else {
      payload_data = readable_data['frame']['Payload_data'];
      // don't fragment or the last fragment
      // translate raw Payload_data
      switch (Opcode) {
        // continue frame
        // the last fragment
        case 0x0:
          payload_data = Buffer.concat([cache.fragmentCache, payload_data]);
          // when the whole fragment recived
          // get the Opcode from cache
          Opcode = cache.Opcode;
          // init the fragment cache
          cache.fragmentCache = new Buffer(0);
        // non-control frame
        // system level text data
        case 0x1:
          try {
            payload_data = JSON.parse(payload_data.toString());
          } catch (e) {
            // cut this frame and skip to remain_frame
            util.error(e);
          }
          // now payload_data is an JSON object or a string
          event = payload_data.hasOwnProperty('event') ? 
                  payload_data['event'] : new Error('Payload_data translate error');
          rawdata = payload_data.hasOwnProperty('data') ? 
                    payload_data['data'] : new Error('Payload_data translate error');
          
          if (event instanceof Error) {
            util.error(event);
          } else if (rawdata instanceof Error) {
            util.error(rawdata);
          } else {
            // if nothing goes wrong, emit event to Server
            client.sysEmit(event, rawdata);
          }
          break;
        // system level binary data
        case 0x2:
          head_len = payload_data.readUInt8(0);
          event = payload_data.slice(1, head_len + 1).toString();
          rawdata = payload_data.slice(head_len + 1);
          client.sysEmit(event, rawdata);
          break;
        
        // control frame
        // Close Frame
        case 0x8:
          payload_data = payload_data.toString();
          client.sysEmit('closing', client);
          server.sysEmit('closing', client);
          // CLOSE Handshake process
          // don't forget to add a 2 byte status code
          // normal CLOSE
          client.emitCtrl(0x8, 1000, 'u r requesting for closing the connection');
          client.close();
          break;
        // PING
        case 0x9:
          client.sysEmit('ping', client);
          server.sysEmit('ping', client);
          util.log('client id: ' + client.id + ' is PINGING the server');
          client.emitCtrl(0xA, null, null);
          break;
        // PONG
        case 0xA:
          client.sysEmit('pong', client);
          server.sysEmit('pong', client);
          util.log('client, id: ' + client.id + ' send a PONG to the server');
          break;
      }
    }
    // the rest frame data
    cache.frame = readable_data['remain_frame'];
  }
}
