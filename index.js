
var core = require('./lib');
var EventEmitter = require('events');
var wsf = {};

wsf = Object.create(EventEmitter);

wsf.connect = function () {};
wsf.Server = function (server, options) {
  if (!options)
    options = {
      host: 'localhost',
      post: '3000',
      namespace: '/',
      max: 1000
    };
  this.host = options.host;
  this.port = options.port;
  this.MAX = options.max;
  this.socket = null;
  this.namespace = options.namespace;
  this.httpServer = server;
};
wsf.Server.prototype.bind = function (options) {
  this.httpServer.removeEventListener(upgrade_handler);
  var httpServer = this.httpServer = options.server;
};
wsf.Server.prototype.unbind = function (serverInstance) {};
wsf.Server.listen = function (callback) {
  wsf.on('listen', callback);
  var httpServer = this.httpServer;
  if (!httpServer) return new Error('no http server init');
  httpServer.on('upgrade', upgrade_handler);
  wsf.emit('listen');
};
wsf.Server.prototype.on = function (e, callback) {
  this.
};

module.exports = wsf;