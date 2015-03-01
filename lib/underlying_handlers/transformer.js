var util = require('../util');
var wsframe = require('../wsframe');
var stream = require('stream');

function Transformer (socket) {
  stream.Transform.call(this);
  this._writableState.objectMode = false;
  this._readableState.objectMode = true;
  this.socket = socket;
  this._buffer = new Buffer(0);
  this.needMore = true;
}

util.inherits(Transformer, stream.Transform);

Transformer.prototype._transform = function (chunk, encoding, callback) {
  var self = this;
  var socket = self.socket;

  var raw_data, data;
  var frame;

  self._buffer = Buffer.concat([self._buffer, chunk]);

  while (data = wsframe.parse(self._buffer)) {
    frame = data.frame;
    self._buffer = data.remain;
    self.push(frame);
  }

  function onDrain() {
    self.needMore = true;
    socket.resume();
  }

  raw_data = null;
  frame = null;

  callback();
};

module.exports = Transformer;
