var encodeFrame = require('./encode.js');
var decodeFrame = require('./decode.js');

/* 
* Constructor @socket: net.Socket instance
* method:
* .emit @e, @data: emit an event '@e' with '@data' to the client
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
* }
*
*/

Client.prototype.setTimeOut = function (timeout) {
  this.socket.setTimeOut(timeout);
};

// emit event to current client
Client.prototype.emit = function (e, data) {
  
  // get the standard payload data format
  var payload_data_json = JSON.stringify({ 'event': e, 'data': data });
  var frame = {
    FIN: 1,
    Opcode: 1,
    MASK: 0,
    Payload_data: payload_data_json
  };

  // if return false, pause the 'data' event handling progress
  this.socket.write(encodeFrame(frame)) || this.socket.pause();
}