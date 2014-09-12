
var EventEmitter   = require('events').EventEmitter;
var crypto         = require('crypto');

var ExecQueue      = require('execq');
var utils          = require('./utils');
var encodeFrame    = utils.encodeFrame;
var decodeFrame    = utils.decodeFrame;
var genMasking_key = utils.genMasking_key;

/* 
* Constructor @socket: net.Socket instance
* method:
* .emit @e, @data, [@type]: emit an event '@e' with '@data' to the client, 
*       data encoding default to 'utf8 string'
* .setTimeout @timeout
* .close
* .destroy
* .sysEmit
* .emitCtrl
* .on
* .once
* .removeListener
* .recive
* .send @data, [@type]: suger of .emit('data', data, type)
*/

/* ref of the client which connected to wsf Server */
function Client(socket) {
  // pick up a 32 bitlens random id for every client
  this.id = crypto.randomBytes(16).toString('hex');
  this.socket = socket;
  this.socket.setTimeout(60000);
  // default to 2^20, max is 2^32 (4GB)
  this.fragmentSize = 0x100000;
  this.ip = socket.remoteAddress;
  this.port = socket.remotePort;
  this.isCloseFrameSent = false;
  this.execQ = new ExecQueue();
  this.isDrained = true;
}

// inherint from EventEmitter
//Client.prototype.__proto__ = EventEmitter.prototype;
Client.prototype = Object.create(EventEmitter.prototype);
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

// wrapper of the internal write operation,
// with drained checker
Client.prototype._write = function () {
  if (this.isDrained)
    (this.isDrained = this.socket.write.apply(this.socket, arguments)) || this.socket.pause();
  else
    this.execQ.pend([this, this._write, arguments]);
};

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
Client.prototype.send = function (data, mask) {
  this.emit('data', data, mask);
};

/*
* #recive(cb)
* des: the synax suger of .on('data', cb), for simplifing getting normal data
*/
Client.prototype.recive = function (cb) {
  this.on('data', cb);
};

// ref the origin EventEmitter#emit()
Client.prototype.sysEmit = Client.prototype.emit;

// emit control frame to current client
Client.prototype.emitCtrl = function (Opcode, statusCode, Payload_data, MASK) {
  var FIN = 1, Masking_key = [];
  var _buf;
  if (MASK = +!!MASK) 
    Masking_key = genMasking_key();

  if (!(Payload_data instanceof Buffer)) 
    Payload_data = new Buffer("" + Payload_data);
  
  if (utils.typeOf(+statusCode) == 'number') {
    _buf = new Buffer(2);
    _buf.writeUInt16BE(+statusCode, 0);
    statusCode = _buf;
  } else if (!(statusCode instanceof Buffer)) {
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

  this._write(encodeFrame(frame));
};

// overwrite the .emit() method
// emit event to current client, not system level event.
// mask = 0, server => client
// mask = 1, client => server
Client.prototype.emit = function (e, data, mask) {
  // get the standard payload data format
  var payload_data = data;
  var FIN = 1, 
      MASK = 0, 
      Masking_key = [],
      Opcode = data instanceof Buffer ? 0x2 : 0x1;
  var fragment = 0;
  var frame = null;
  var head_len;
  
  // mark the index of the payload data's last char has been sent
  var j = 0;

  if (Opcode == 0x2) {
    // handle the bin data
    e = new Buffer(e);
    head_len = new Buffer(1);
    head_len.writeUInt8(e.length, 0);
    payload_data = Buffer.concat([head_len, e, data]);
  } else {
    // text data
    payload_data = JSON.stringify({
      'event': ''+e || '', 
      'data': data == null ? '' : data
    });
  }

  // mask
  if (mask) {
    MASK = 1;
    Masking_key = genMasking_key();
  }

  // fragment
  if (payload_data.length > this.fragmentSize) {
    fragment = Math.ceil(payload_data.length / this.fragmentSize);
    FIN = 0;
    for (var i = 0; i < fragment; i++) {
      // not the first fragment, set Opcode to 0 stand for 'continue'
      if (i) Opcode = 0;
      // if it's the last fragment, set FIN to 1 stand for 'no more fragment'
      if (i == fragment - 1) FIN = 1;
      
      // construct the fragment
      frame = {
        FIN: FIN,
        Opcode: Opcode,
        MASK: MASK,
        Masking_key: Masking_key,
        // inc the mark
        Payload_data: payload_data.slice(j, j += this.fragmentSize)
      };

      this._write(encodeFrame(frame));
    }
  } else {
    // not fragment
    frame = {
      FIN: FIN,
      Opcode: Opcode,
      MASK: MASK,
      Masking_key: Masking_key,
      Payload_data: payload_data
    };

    this._write(encodeFrame(frame));
  }
};

module.exports = Client;
