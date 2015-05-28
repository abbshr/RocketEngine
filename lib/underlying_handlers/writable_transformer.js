var util = require('../util');
var wsframe = require('../wsframe');
var stream = require('stream');

function WritableTransformer(options) {
  stream.Transform.call(this);
  this.event = options.event || '';
  this.FIN = 1;
  this.MASK = options.isClient || 0;
  this.Opcode = 0x2;
  this.Masking_key = this.MASK ? util.genMaskingKey() : [];
  // default to 2^10 (1KB), max is 2^32 (4GB)
  this.fragmentSize = options.fragmentSize || 0x400;
  // internel buffer size should be always greater than fragmentSize
  if (this.fragmentSize >= this._readableState.highWaterMark)
    this._readableState.highWaterMark = this.fragmentSize << 1;
  this.fragment = 0;
  this.state = 0;
  // this.count = 0;
}

util.inherits(WritableTransformer, stream.Transform);

WritableTransformer.prototype._transform = function (chunk, encoding, callback) {
  var MASK = this.MASK,
      Masking_key = this.Masking_key,
      payload_data;
  var frame;
  var e = this.event;
  var e_len;
  // ref the index of the payload data's last char has been sent
  var j = 0;

  // binary type
  if (util.isBuffer(chunk)) {
    // no fragment or the first fragment
    if (!this.state) {
      e = new Buffer(e);
      e_len = new Buffer(1);
      e_len.writeUInt8(e.length, 0);
      chunk = Buffer.concat([e_len, e, chunk]);
      console.log('first');
    }

    //console.log(chunk, encoding);

    // fragment
    if (chunk.length > this.fragmentSize) {
      this.fragment = Math.ceil(chunk.length / this.fragmentSize);
      this.FIN = 0;

      for (var i = 0; i < this.fragment; i++) {
        // not the first fragment, set Opcode to 0 stand for 'continue'
        if (!this.state) {
          this.state = 1;
        } else {
          this.Opcode = 0;
        }

        // construct the fragment
        frame = {
          FIN: this.FIN,
          Opcode: this.Opcode,
          MASK: MASK,
          Masking_key: Masking_key,
          // inc the mark
          Payload_data: chunk.slice(j, j += this.fragmentSize)
        };

        this.push(wsframe.generate(frame));
      }
      console.log(this.fragment);
      return callback();
    } else {
      if (this.fragment) {
        // the last second fragment
        this.FIN = 0;
        this.Opcode = 0x0;
        console.log('last second');
      } else {
        // not fragment or the last fragment
        this.FIN = 1;
        payload_data = chunk;
        console.log('last');
      }
    }
  } else {
    // plain text
    this.Opcode = 0x1;
    payload_data = JSON.stringify({
      'event': `${e}`,
      'data': chunk == null ? '' : chunk
    });
  }

  frame = {
    FIN: this.FIN,
    Opcode: this.Opcode,
    MASK: MASK,
    Masking_key: Masking_key,
    Payload_data: payload_data
  };

  callback(wsframe.generate(frame));
};

WritableTransformer.prototype._flush = function (callback) {
  // for the last fragment
  if (this.fragment) {
    this.fragment = 0;
    this.FIN = 1;
    payload_data = new Buffer(0);
    frame = {
      FIN: this.FIN,
      Opcode: this.Opcode,
      MASK: this.MASK,
      Masking_key: this.Masking_key,
      Payload_data: payload_data
    };

    this.push(wsframe.generate(frame));
  }
  console.log('flush', this.fragment, this.Opcode);
  callback(null);
};

module.exports = WritableTransformer;
