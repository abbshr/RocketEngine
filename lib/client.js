var EventEmitter = require('events').EventEmitter;
var crypto       = require('crypto');
var wsframe      = require('./wsframe');
var util         = require('./util');

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
  var FIN = 1, 
      MASK = this.isClient, 
      Opcode = 0x2,
      Masking_key = [],
      payload_data;
  var fragment = 0;
  var frame = null;
  var e_len;
  var state = 0;
  var self = this;
  // ref the index of the payload data's last char has been sent
  var j = 0;
  var count = 0;

  // mask
  if (MASK)
    Masking_key = util.genMaskingKey();

  if (util.isStream(src)) {
    src
      .on('data', onData)
      .on('end', onEnd)
      .on('close', onClose)
      .on('error', onError);
  } else  {
    if (util.isBuffer(src)) {
      e = new Buffer(e);
      e_len = new Buffer(1);
      e_len.writeUInt8(e.length, 0);
      payload_data = Buffer.concat([e_len, e, src]);
    } else {
      Opcode = 0x1;
      payload_data = JSON.stringify({
        'event': ''+e || '', 
        'data': src == null ? '' : src
      });
    }
    sendFrame(payload_data);
  }

  function onData(d) {
    if (state)
      sendFrame(d);
    else {
      e = new Buffer(e);
      e_len = new Buffer(1);
      e_len.writeUInt8(e.length, 0);
      sendFrame(Buffer.concat([e_len, e, d]));
      state = 1;
    }
  }
  function onEnd() {
    if (fragment) {
      fragment = 0;
      sendFrame(new Buffer(0));
    }
  }
  function onDrain() {
    self.socket.resume();
  }
  function onClose() {}
  function onError() {}

  function sendFrame(payload_data) {
    // fragment
    if (payload_data.length > self.fragmentSize) {
      fragment = Math.ceil(payload_data.length / self.fragmentSize);
      FIN = 0;
      for (var i = count; i < count + fragment; i++) {
        // not the first fragment, set Opcode to 0 stand for 'continue'
        if (i) Opcode = 0;
        // construct the fragment
        frame = {
          FIN: FIN,
          Opcode: Opcode,
          MASK: MASK,
          Masking_key: Masking_key,
          // inc the mark
          Payload_data: payload_data.slice(j, j += self.fragmentSize)
        };

        if (!self.socket.write(wsframe.generate(frame))) {
          self.socket.pause();
          self.once('drained', onDrain);
        }
      }
      j = 0;
      count += fragment;
    } else {
      if (fragment) {
        // the last second fragment
        FIN = 0;
        Opcode = 0;
      } else {
        // not fragment or the last fragment
        FIN = 1;
      }
      frame = {
        FIN: FIN,
        Opcode: Opcode,
        MASK: MASK,
        Masking_key: Masking_key,
        Payload_data: payload_data
      };

      if (!self.socket.write(wsframe.generate(frame))) {
        self.socket.pause();
        self.once('drained', onDrain);
      }
    }
  }
};

// identify a client with user-defined id
Client.prototype.identify = function (id, callback) {
  if (this.get('id')) {
    callback(new Error('the specified id has been taken!'));
  } else {
    this.info['id'] = id;
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
