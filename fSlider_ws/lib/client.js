var encodeFrame = require('./utils/encode.js');
var decodeFrame = require('./utils/decode.js');

/* 
* Constructor @socket: net.Socket instance
* method:
* .emit @e, @data, [@type]: emit an event '@e' with '@data' to the client, 
*       data encoding default to 'utf8 string'
* .setTimeOut @tiemout
*/
module.exports = Client;

/* ref of the client which connected to wsf Server */
function Client(socket) {
  this.socket = socket;
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

// emit event to current client
Client.prototype.emit = function (e, data, type) {
  
  // get the standard payload data format
  var payload_data_json = JSON.stringify({ 'event': e, 'data': data, type: type || 'string' });
  var frame = {
    FIN: 1,
    Opcode: 1,
    MASK: 0,
    Payload_data: payload_data_json
  };

  // if return false, pause the 'data' event handling progress
  this.socket.write(encodeFrame(frame)) || this.socket.pause();
}