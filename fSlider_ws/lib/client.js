
var utils          = require('./utils'),
var encodeFrame    = utils.encodeFrame,
var decodeFrame    = utils.decodeFrame,
var genMasking_key = utils.genMasking_key;

/* 
* Constructor @socket: net.Socket instance
* method:
* .emit @e, @data, [@type]: emit an event '@e' with '@data' to the client, 
*       data encoding default to 'utf8 string'
* .setTimeout @tiemout
* .close
* .destroy
* .send @data, [@type]: suger of .emit('data', data, type)
*/
module.exports = Client;

/* ref of the client which connected to wsf Server */
function Client(socket) {
  this.socket = socket;
  this.fragmentSize = 65536;
  this.ip = socket.remoteAddress;
  this.port = socket.remotePort;
}

/* 
* wsf Payload_data in application-level Exchange Standard format:
*
* <JSON>
*
* {
*   'event'<String>: custom/system event name
*   'data'<*>: real data to be sent
*   'type'<String>: data encoding type ('binary' | 'string')
* }
*
*/

Client.prototype.setTimeout = function (timeout) {
  this.socket.setTimeout(timeout);
};

Client.prototype.close = function () {
  this.socket.end();
};

Client.prototype.destroy = function () {
  this.socket.destroy();
};

// simpify sending normal data
Client.prototype.send = function (data, type, mask) {
  this.emit('data', data, type);
};

// emit event to current client, not system level event.
// mask = 0, server => client
// mask = 1, client => server
Client.prototype.emit = function (e, data, type, mask) {
  
  // get the standard payload data format
  var payload_data_json = JSON.stringify({ 'event': e, 'data': data, type: type || 'string' });
  var FIN = 1, Opcode = 0x1, MASK = 0, Masking_key = [];
  var fragment = 0;
  var frame = null;
  // mark the index of the payload data's last char has been sent
  var j = 0;

  // for Opcode
  //if (type == 'binary')
  //  Opcode = 0x2;

  // mask
  if (mask) {
    MASK = 1;
    Masking_key = genMasking_key();
  }

  // fragment
  if (payload_data_json.length > this.fragmentSize) {
    fragment = Math.ceil(payload_data_json.length / this.fragmentSize);
    FIN = 0;
    for (var i = 0; i < fragment; i++) {
      if (i) Opcode = 0;
      if (i == fragment - 1) FIN = 1;
      frame = {
        FIN: FIN,
        Opcode: Opcode,
        MASK: MASK,
        Masking_key: Masking_key,
        Payload_data: payload_data_json.substr(j, this.fragmentSize)
      };
      // if return false, pause the 'data' event handling progress
      this.socket.write(encodeFrame(frame)); //|| this.socket.pause();
      // inc the mark
      j += fragmentSize;
    }
  } else {
    // not fragment
    frame = {
      FIN: FIN,
      Opcode: Opcode,
      MASK: MASK,
      Masking_key: Masking_key,
      Payload_data: payload_data_json
    };
    // if return false, pause the 'data' event handling progress
    this.socket.write(encodeFrame(frame)) || this.socket.pause();
  }
}