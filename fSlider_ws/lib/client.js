var encodeFrame = require('./encode.js');
var decodeFrame = require('./decode.js');

/* ref of the client which connected to wsf Server */
function Client(socket) {
  this.socket = socket;
}

/*Client.prototype.on = function (e, callback) {
  this.socket.on(e, callback);
};

Client.prototype.rm = function (e, callback) {
  this.socket.removeListener(e, callback);
}*/

// emit event to current client
// data format: JSON
Client.prototype.emit = function (e, data) {
  var payload_data_json = JSON.stringify({ event: e, data: data });
  var frame = {
    FIN: 1,
    Opcode: 1,
    MASK: 0,
    Payload_data: payload_data_json
  };
  this.socket.write(encodeFrame(frame));
}

module.exports = Client;