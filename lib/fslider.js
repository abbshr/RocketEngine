
var crypto         = require('crypto');
var EventEmitter   = require('events').EventEmitter;

var utils          = require('./utils'),
    Client         = require('./client.js'),
    upgrade_router = require('./underlying_handlers');

// inherint from EventEmitter
var wsf = module.exports = Object.create(EventEmitter.prototype);

/*
* wsf
* method:
* .connect: connect to a WebSocket Server
* .listen: global listen on a HTTP Server
* .close: close listening on a HTTP Server
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

// restore the http.Server instance
wsf._httpd = [];

// restore the wsf.Server instance
wsf._servers = [];

/*
* #listen(httpServer, callback)
* des: (global) listen on a httpServer instance
* @callback
*/
wsf.listen = function (httpServer, callback) {
  if (callback instanceof Function)
    this.on('listen', function (httpServer) {
      utils.coolLogo();
      callback(httpServer);
    });
  if (!httpServer || !utils.isHttpServer(httpServer)) 
    return new Error('no http(s) server init');
  
  // add this http server to stack
  wsf._httpd.push(httpServer);

  // bind 'upgrade' event callback
  httpServer.on('upgrade', upgrade_router.bind(this));
  this.emit('listen', httpServer);
  return this;
};

/* close listening 'upgrade' on httpServer */
wsf.close = function (httpServer, callback) {
  var stack = this._httpd;
  if (!utils.isHttpServer(httpServer)) 
    return false;
  this.on('close', function (httpServer) {
    typeof callback == 'function' && callback(httpServer);
  });
  return stack.some(function (httpd, i) {
    if (httpd === httpServer) {
      // remove all 'upgrade' event listener
      delete httpServer._events['upgrade'];
      // remove from httpd stack
      stack.splice(i, 1); 
      wsf.emit('close', httpServer); 
      return true; 
    }
  });
};

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

// as a Server

/* 
 * @server: http(s).Server instance
 * @options: {
 *  max: max counts of clients can connect to wsf server
 *  namespace: URL that could request handshake
 * }
 */
wsf.Server = function (server, options) {
  if (!(this instanceof wsf.Server))
    return new wsf.Server(server, options);
  if (typeof server == 'object' && !utils.isHttpServer(server))
    options = server;
  options = options || {};
  options.max = options.max || 60;
  options.namespace = options.namespace || '/';
  this._super = wsf;
  this.MAX = options.max;
  this._sockets = {};
  this.conns = 0;
  this.namespace = options.namespace;
  this.httpServer = server || this._super[0];
  
  // save the ref of this new server
  this._super._servers.push(this);
};

// inherint from EventEmitter
wsf.Server.prototype = Object.create(EventEmitter.prototype);

wsf.Server.prototype.getRegistedId = function () {
  return Object.keys(this._sockets);
};

wsf.Server.prototype.getClient = function (id) {
  return this._sockets[id];
};

wsf.Server.prototype.getConnectCount = function () {
  return this.conns;
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
    utils.error(new Error('client must be an instance of Client!'));
};

/* 
* #bind(server, options) 
* des: wsf server method, for manual binding a httpServer
* @server: http.Server instance
* @options: as above
*/
wsf.Server.prototype.bind = function (server, options) {
  if (server) {
    if (!utils.isHttpServer(server)) 
      return new Error('argument "server" must be a http.Server instance!');
    if (server === this.httpServer)
      return;
    if (!this.server) 
      this.httpServer = server, 
      this.namespace = options.namespace || '/';
  } else {
    return;
  }
};

/*
* #unbind()
* des: oppsite to #bind() method
*/
wsf.Server.prototype.unbind = function () {
  if (this.httpServer && utils.isHttpServer(this.httpServer))
    this.httpServer = null, this.namespace = '/';
};

/*
* #broadcast(e, data)
* des: wsf server broadcast via this method.
* @e: cumstom event name
* @data: the msg to broadcast
*/
wsf.Server.prototype.broadcast = function (e, data) {
  var self = this;
  self.getSocketIdCluster().forEach(function (id) {
    self.getClient(id).emit(e, data);
  });
};

// as a non-browser client
wsf.connect = require('./non-browser.js');