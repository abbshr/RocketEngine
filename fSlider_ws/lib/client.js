var encodeFrame = require('./encode.js');
var decodeFrame = require('./decode.js');

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
Client.prototype.emit = function (e, data) {
  var readable_data = JSON.stringify({ event: e, data: data });
  var frame = {
    FIN: 1,
    Opcode: 1,
    MASK: 0,
    Payload_data: readable_data
  };
  this.socket.write(encodeFrame(frame));
}


module.exports = Client;