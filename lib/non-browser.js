var crypto = require('crypto');
var util = require('./util');
var Client = require('./client');
var Transformer = require('./underlying_handlers/transformer');
var ReadableTransformer = require('./underlying_handlers/readable_transformer');

module.exports = function connect(url, options, callback) {
  var wsf = this;
  var urlpattern = /^(ws|wss):\/\/([^\s\/:]+)(:(\d{2,5}))?(\/\S*)?$/;
  var result = urlpattern.exec(url);
  if (!result) 
    throw new Error('Bad url pattern');
  
  var protocol = result[1];
  var wsclient = null;
  if (protocol == 'ws'){
    wsclient = require('net');
    callback = util.isFunction(options) ? options : callback;
    options = {};
  } else {
    wsclient = require('tls');
    if (util.isFunction(options))
      throw new Error('CA Cert are required');
  }

  wsf.on('connected', callback);

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

  var closed = false;

  var client = new Client(socket);

  // init the transformers
  var transformer = new Transformer(socket);
  var readableTransformer = new ReadableTransformer({ client: client });
  
  function onData(frame) {
    // into the upper layer
    readableTransformer._transform(frame);
  }

  function onReadable(chunk) {
    // into the first layer
    transformer._transform(chunk);
  }

  function onFinish() {
    client.sysEmit('clientclose');
    util.log('server TCP socket ready to close');
    // clean memory
    cleanup();
  }

  function onEnd() {
    client.sysEmit('serverclose');
    util.log('client TCP socket ready to close');
    // on reciving a FIN Packet from server, response a FIN
    socket.end();
    // clean memory
    cleanup();
  }

  function onClose(has_error) {
    client.sysEmit('disconnected');
    util.log('TCP connection closed');
    if (has_error)
      util.error(new Error('some problems happened during TCP connection closing'));
    // clean memory
    cleanup();
  }

  function onDrain() {
    client.sysEmit('drained', socket.bufferSize);
    util.log('user space buffer-queue has been drained');
    socket.resume();
  }

  function onTimeout() {
    util.log('connection closed by timeout');
    socket.end('connection closed by timeout');
    client.sysEmit('timeout');
    server.sysEmit('timeout');
  }

  function onError(err) {
    client.sysEmit('exception', err);
    socket.destroy();
    util.error(err);
  }

  function cleanup() {
    if (closed) 
      return;
    socket
      .removeListener('data', onReadable)
      .removeListener('finish', onFinish)
      .removeListener('end', onEnd)
      .removeListener('close', onClose)
      .removeListener('drain', onDrain)
      .removeListener('timeout', onTimeout)
      .removeListener('error', onError);

    transformer.removeListener('data', onData);

    closed = true;
  }

  socket
    .once('data', function (data) {
      var resHeaders = data.toString();
      var secKey = crypto.createHash('sha1')
                         .update(key + util.MAGIC_STRING)
                         .digest('base64');
      var acKey = resHeaders.match(/Sec-WebSocket-Accept:\s*(\S+)(\r\n)+/)[1];

      // first verify the accept key
      if (secKey !== acKey)
        return util.error('connection closed \
          because an unexpected handshake frame');

      // TODO: other values' verify

      wsf.emit('connected', client);

      // 'data' event emited from transformer always carry an integral frame
      transformer.on('data', onData);
      // if everything is ok, successfully end handshake progress
      socket.on('data', onReadable);
    })
    .on('drain', onDrain)
    // server TCP socket ready to close
    .on('end', onEnd)
    // client TCP socket ready to close
    .on('finish', onFinish)
    // underlying TCP socket has been closed
    .on('close', onClose)
    .on('error', onError)

    // there's no timeout on client
    .setTimeout(0);  

  return client;
};