var EventEmitter = require('events').EventEmitter;
var crypto       = require('crypto');
var wsframe      = require('./wsframe');
var util         = require('./util');
var WritableTransformer = require('./underlying_handlers/writable_transformer');

/* ref of the client which connected to wsf Server */
function Client(socket, sockets_queue, isClient) {
  this.socket = socket;
  this.isClient = +isClient;
  // 5 min default
  this.socket.setTimeout(5 * 60 * 1000);
  // disable nagle algorithm
  this.socket.setNoDelay(true);
  // default to 2^10 (1KB), max is 2^32 (4GB)
  this.fragmentSize = 0x400;
  this.isCloseFrameSent = false;
  this.remote = {
    ip: socket.remoteAddress,
    port: socket.remotePort
  };
  Object.defineProperty(this, '_sockets', {
    value: sockets_queue,
    writable: false,
    configurable: true
  });
  Object.defineProperty(this.remote, 'info', {
    value: {},
    writable: false,
    configurable: true
  });
}

util.inherits(Client, EventEmitter);
/*
* wsf Payload_data in application-level Exchange Standard format:
*
* <JSON>
*
* "
*  {
*   'event'<String>: custom/system event name
*   'data'<*>: real data to be sent
*  }
* "
*
* <Binary>
*
* Buffer.concat([headerLengthInBuffer, eventJSONInBuffer, dataInBuffer]);
*/

// timeout is descripted as million second
// default to 1 min(60000 ms)
Client.prototype.setTimeout = function (timeout) {
  this.socket.setTimeout(timeout);
};

// send "close-frame" for a "clean close"
Client.prototype.close = function (code, reason) {
  // if this endpoint has sent the close frame, do nothing
  this.isCloseFrameSent || this.emitCtrl(0x8, code, reason);
  this.isCloseFrameSent = true;
};

// TCP socket send FIN packet
Client.prototype.end = function () {
  this.socket.end();
};

// directly close the underlying TCP connection with exception
Client.prototype.destroy = function () {
  this.socket.destroy();
};

// simpify sending normal data
Client.prototype.send = function (src) {
  this.emit('data', src);
};

/*
* #receive(cb)
* des: the syntax sugar of .on('data', cb), for simplifing getting normal data
*/
Client.prototype.receive = function (cb) {
  this.on('data', cb);
};

// ref the origin EventEmitter#emit()
Client.prototype.sysEmit = Client.prototype.emit;

// emit control frame to current client
Client.prototype.emitCtrl = function (Opcode, statusCode, Payload_data) {
  var FIN = 1, Masking_key = [];
  var _buf;
  if (MASK = this.isClient)
    Masking_key = util.genMaskingKey();

  if (!util.isBuffer(Payload_data))
    Payload_data = new Buffer("" + Payload_data);

  if (util.isNumber(+statusCode)) {
    _buf = new Buffer(2);
    _buf.writeUInt16BE(+statusCode, 0);
    statusCode = _buf;
  } else if (!util.isBuffer(statusCode)) {
    statusCode = new Buffer(0);
  }

  Payload_data = Buffer.concat([statusCode, Payload_data]);

  // don't fragment in control frame
  frame = {
    FIN: FIN,
    Opcode: Opcode,
    MASK: MASK,
    Masking_key: Masking_key,
    Payload_data: Payload_data
  };

  this.socket.write(wsframe.generate(frame));
};

// overwrite the .emit() method
// emit event to current client, not system level event.
// mask = 0, server => client
// mask = 1, client => server
Client.prototype.emit = function (e, src) {
  // get the standard payload data format
  var writableTransformer = new WritableTransformer({
    event: `${e}`,
    isClient: this.isClient,
    fragmentSize: this.fragmentSize
  });

  if (util.isStream(src)) {
    src.pipe(writableTransformer);
  } else if (util.isBuffer(src)) {
    writableTransformer.end(src);
  } else {
    // plain text or JavaScript Object
    var frame = {
      FIN: 1,
      Opcode: 0x1,
      MASK: this.isClient,
      Masking_key: this.isClient ? util.genMaskingKey() : [],
      Payload_data: JSON.stringify({
        'event': `${e}`,
        'data': (function () {
          var data;
          if (util.isNullOrUndefined(src))
            data = '';
          else if (util.isFunction(src))
            data = `${src}`;
          else
            data = src
          return data;
        })()
      })
    };

    return this.socket.write(wsframe.generate(frame));
  }
  writableTransformer.pipe(this.socket, { end: false });
};

// identify a client with user-defined id
Client.prototype.identify = function (id, callback) {
  util.isFunction(callback) || (callback = function () {});
  if (this.get('id')) {
    callback(new Error('the specified id has been taken!'));
  } else {
    this.remote.info['id'] = id;
    this._sockets[id] = this;
    callback();
  }
};

// manipulate user-defined data on a client
Client.prototype.set = function (key, value) {
  if (key == 'id')
    return;
  this.remote.info[key] = value;
};
Client.prototype.get = function (key) {
  return this.remote.info[key];
};

module.exports = Client;
