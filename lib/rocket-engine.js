
var crypto         = require('crypto');
var EventEmitter   = require('events').EventEmitter;
var fs             = require('fs');

var util          = require('./util'),
    Client         = require('./client'),
    upgrade_router = require('./underlying_handlers/upgrade_router');

// inherint from EventEmitter
var rocken = module.exports = Object.create(EventEmitter.prototype);

// restore the http.Server instance
rocken._httpd = [];

// restore the wsf.Server instance
rocken._servers = [];

function static_handler(req, res) {
  var server = this;
  var requestHandle = server._events['request'];
  if (req.url.match(/^\/(event)|(rocken)\.js$/)) {
    res.writeHead(200, {'Content-Type': 'text/javascript'});
    // fs.createReadStream(`${__dirname}/browser${req.url}`)
    // .pipe(res)
    // .on('finish', function () {
    //   //server._events['request'] = requestHandle;
    // });

    // block the handler stack
    res.end(fs.readFileSync(`${__dirname}/browser${req.url}`));
  }
}

/*
* #listen(httpServer, callback)
* des: (global) listen on a httpServer instance
* @callback
*/
rocken.listen = function (httpServer, callback) {
  if (util.isFunction(callback))
    this.on('listen', function (httpServer) {
      util.coolLogo();
      callback(httpServer);
    });
  if (!httpServer || !util.isHttpServer(httpServer))
    return new Error('no http(s) server init');

  // add this http server to stack
  rocken._httpd.push(httpServer);

  // bind 'upgrade' event callback
  httpServer.on('upgrade', upgrade_router.bind(this));
  httpServer._events['request'] = [].concat(static_handler.bind(httpServer), httpServer._events['request']);

  // mount the event.js and rocken.js to http Router
  // => GET /event.js
  // => GET /rocket.js
  // re-compile to request
  // var sourceCode = httpServer.listeners('request')[0].toString();
  // var regexFunction = /^function\s+([\w\$]*)\s*\(.*\)\s*{((.|\s)*)}$/;
  // var requestHandle = sourceCode.match(regexFunction);
  // var funcBody;
  // var staticSoruceCode;
  // var staticBody;
  // var reCompileSource;
  //
  // if (requestHandle) {
  //   funcBody = requestHandle[2];
  //   staticSoruceCode = static_handler.toString();
  //   staticBody = staticSoruceCode.match(regexFunction)[2];
  //   reCompiledSource = `function static_handler(req, res) {\n${staticBody}\n${funcBody}\n}`;
  //   // only availiabled in this context
  //   eval(reCompiledSource);
  //   httpServer.on('request', static_handler);
  //   console.log(static_handler.toString());
  // }

  this.emit('listen', httpServer);
  return this;
};

/* close listening 'upgrade' on httpServer */
rocken.close = function (httpServer, callback) {
  var stack = this._httpd;
  if (!util.isHttpServer(httpServer))
    return false;
  this.on('close', function (httpServer) {
    typeof callback == 'function' && callback(httpServer);
  });
  return stack.some(function (httpd, i) {
    if (httpd === httpServer) {
      // remove all 'upgrade' & 'request' event listener
      httpServer.removeAllListeners('upgrade');
      httpServer.removeListener('request', static_handler)
      // remove from httpd stack
      stack.splice(i, 1);
      rocken.emit('close', httpServer);
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
rocken.Server = function (server, options) {
  if (!(this instanceof rocken.Server))
    return new rocken.Server(server, options);
  if (typeof server == 'object' && !util.isHttpServer(server))
    options = server;
  options = options || {};
  options.max = options.max || 60;
  options.namespace = options.namespace || '/';
  this._super = rocken;
  this.MAX = options.max;
  this._sockets = {};
  this.conns = 0;
  this.namespace = options.namespace;
  this.httpServer = server || this._super[0];

  // save the ref of this new server
  this._super._servers.push(this);
};

// inherint from EventEmitter
rocken.Server.prototype = Object.create(EventEmitter.prototype);

rocken.Server.prototype.getRegistedId = function () {
  return Object.keys(this._sockets);
};

rocken.Server.prototype.getClient = function (id) {
  return this._sockets[id];
};

rocken.Server.prototype.getConnectCount = function () {
  return this.conns;
};

// ref the origin .emit()
rocken.Server.prototype.sysEmit = rocken.Server.prototype.emit;

// overwrite the .emit()
/*
* #emit(client, event, data)
* des: emit an event to the given client with the given data, if client is null, the effect as .broadcast()
* @client:
* @event:
* @data:
*/
rocken.Server.prototype.emit = function (client, event, data) {
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
rocken.Server.prototype.bind = function (server, options) {
  if (server) {
    if (!util.isHttpServer(server))
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
rocken.Server.prototype.unbind = function () {
  if (this.httpServer && util.isHttpServer(this.httpServer))
    this.httpServer = null, this.namespace = '/';
};

/*
* #broadcast(e, data)
* des: wsf server broadcast via this method.
* @e: cumstom event name
* @data: the msg to broadcast
*/
rocken.Server.prototype.broadcast = function (e, data) {
  var self = this;
  self.getRegistedId().forEach(function (id) {
    self.getClient(id).emit(e, data);
  });
};

// as a non-browser client
rocken.connect = require('./non-browser.js');
