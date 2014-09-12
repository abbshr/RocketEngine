var crypto = require('crypto');
var utils = require('./utils');
var Client = require('./client.js');
var datarecv_handler = require('./handlers/datarecv_handler.js');

module.exports = function connect(url, options, callback) {
  var wsf = this;
  wsf.on('connected', callback);

  var urlpattern = /^(ws|wss):\/\/([^\s\/:]+)(:(\d{2,5}))?(\/\S*)?$/;
  var result = urlpattern.exec(url);
  if (!result) 
    throw new Error('Bad url pattern');
  
  var protocol = result[1];
  var wsclient = null;
  if (protocol == 'ws'){
    wsclient = require('net');
    callback = options instanceof Function ? options : callback;
    options = {};
  } else {
    wsclient = require('tls');
    if (options instanceof Function)
      throw new Error('CA Cert are required');
  }

  var dsthost = result[2],
      dstport = result[4] || 80,
      dstpath = result[5] || '/';

  options.host = dsthost;
  options.port = dstport;

  // the key is a 16 bytes' random str
  var key = crypto.randomBytes(16).toString('base64');
  
  var socket = wsclient.connect(options, function () {
    /* ws protocol handshake request head */
    var reqHeaders = ([
      'GET ' + dstpath + ' HTTP/1.1',
      'Upgrade: websocket',
      'Connection: Upgrade',
      'Sec-WebSocket-Key: ' + key
    ]).concat('', '').join('\r\n');

    socket.write(reqHeaders) || socket.pause();
  });

  var client = new Client(socket);

  // cache recive-buffer, as ref 
  var cache = {
    frame: new Buffer(0),
    fragmentCache: new Buffer(0)
  };

  socket
    .once('data', function (data) {
      var resHeaders = data.toString();
      var secKey = crypto.createHash('sha1')
                         .update(key + utils.MAGIC_STRING)
                         .digest('base64');
      var acKey = resHeaders.match(/Sec-WebSocket-Accept:\s*(\S+)(\r\n)+/)[1];

      // first verify the accept key
      if (secKey !== acKey)
        return utils.error('connection closed \
          because an unexpected handshake frame');

      // TODO: other values' verify

      wsf.emit('connected', client);
      // if everything is ok, successfully end handshake progress
      socket.on('data', datarecv_handler.bind(null, client, cache));
    })
    .on('drain', function () {
      client.sysEmit('drained', socket.bufferSize);
      utils.log('user space buffer-queue has been drained');
      socket.resume();
    })
    // server TCP socket ready to close
    .on('end', function () {
      client.sysEmit('serverclose');
      utils.log('client TCP socket ready to close');
      // on reciving a FIN Packet from server, response a FIN
      socket.end();
    })
    // client TCP socket ready to close
    .on('finish', function () {
      client.sysEmit('clientclose');
      utils.log('server TCP socket ready to close');
    })
    // underlying TCP socket has been closed
    .on('close', function (has_error) {
      client.sysEmit('disconnected');
      utils.log('TCP connection closed');
      if (has_error)
        utils.error(new Error('some problems happened during TCP connection closing'));
    })
    .on('error', function (err) {
      client.sysEmit('exception', err);
      socket.destory();
      utils.error(err);
    })

    // there's no timeout on client
    .setTimeout(0);  

  return client;
};