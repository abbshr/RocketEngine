var utils = require('../utils');
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

utils.inherits(Transformer, stream.Transform);

Transformer.prototype._transform = function (chunk) {
  var self = this;
  var socket = self.socket;

  var raw_data, data;
  var frame, remain;

  self._buffer = Buffer.concat([self._buffer, chunk]);

  while (self.needMore && (data = wsframe.parse(self._buffer))) {
    frame = data.frame;
    self._buffer = data.remain;
    // emit 'data'
    if (!(self.needMore = self.push(frame))) {
      socket.pause();
      self.once('drain', onDrain);
    }
  }

  function onDrain() {
    self.needMore = true;
    socket.resume();
  }

  raw_data = null;
  frame = null;
  remain = null;
  
  /*
  write();

  function write() {
    // get all data from socket once 'readable' emited.
    while (self.needMore && (raw_data = socket.read())) {
      console.log(raw_data);
      console.log('@@@@@');
      // only parse one frame one tick
      if (data = wsframe.parse(raw_data)) {
        frame = data.frame;
        remain = data.remain;
        console.log(remain);
        // emit 'data'
        self.needMore = self.push(frame);
        // push the remain data back to socket read_queue
        socket.unshift(remain);
      } else {
        // if we didn't get an integral frame,
        // just push them back
        socket.unshift(raw_data);
        break;
        //console.log(4);
      }
    }

    if (!self.needMore)
      self.once('drain', write);

    raw_data = null;
    frame = null;
    remain = null;
  }
  */
};

module.exports = Transformer;
