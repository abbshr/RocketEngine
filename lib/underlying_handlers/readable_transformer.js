var subParser = require('./sub_parser');
var util = require('../util');
var stream = require('stream');
var EventEmitter = require('events').EventEmitter;

// upper transformer
// @@options: { server, client }
function ReadableTransformer(options) {
  stream.Transform.call(this);
  this._writableState.objectMode = true;
  this._readableState.objectMode = false;
  this.server = options.server;
  this.client = options.client;
  this.e_source = new EventEmitter();
}

util.inherits(ReadableTransformer, stream.Transform);

ReadableTransformer.prototype._transform = function (frame, encoding, callback) {
  var self = this;
  var client = self.client,
      server = self.server,
      e_source = self.e_source;

  var state_code;

  var FIN = frame['FIN'];
  var Opcode = frame['Opcode'];
  var MASK = frame['MASK'];
  var Payload_len = frame['Payload_len'];
  var Payload_data = frame['Payload_data'];

  var dispatch = function (payload_data) {
    self.dispatch(payload_data);
  };

  // if receive frame is in fragment
  if (!FIN) {
    // save the first fragment's Opcode
    switch (Opcode) {
      case 0x1:
      case 0x2:
        // parser binary fragments stream
        self.streamParser();
        e_source.emit('firstfragment', Payload_data);
        break;
      case 0x0:
        e_source.emit('fragment', Payload_data);
        break;
    }
  } else {
    // don't fragment or the last fragment
    // translate raw Payload_data
    switch (Opcode) {
      // continue frame
      // the last fragment
      case 0x0:
        e_source.emit('lastfragment', Payload_data);
        break;

      // system level binary data
      case 0x2:
        subParser.binaryParser(Payload_data, dispatch);
        break;

      // non-control frame
      // system level text data
      case 0x1:
        subParser.textParser(Payload_data, dispatch);
        break;
      
      // control frame
      // Close Frame
      case 0x8:
        // client may send a code
        state_code = Payload_data.length ? 
                     Payload_data.readUInt16BE(0) : 1000;
        client.sysEmit('closing', state_code);
        server && server.sysEmit('closing', this.client);
        util.log('in Websocket CLOSE Handshake statement');
        // CLOSE Handshake process
        // constructing a "clean close": 
        // once recive a close frame, send a close frame
        client.close(state_code, 'u r requesting for closing the connection');
        // then close the underlying TCP connection
        client.end();
        break;
      // PING
      case 0x9:
        client.sysEmit('ping');
        if (server) {
          server.sysEmit('ping', client);
          util.log('client id: ' + client.get('id') + ' is PINGING the server');
        }
        util.log('server is PINGING the current client');
        client.emitCtrl(0xA, null, null);
        break;
      // PONG
      case 0xA:
        client.sysEmit('pong');
        if (server) {
          server.sysEmit('pong', client);
          util.log('client, id: ' + client.get('id') + ' send a PONG to the server');
        }
        util.log('server send a PONG to the current client');
        break;
    }
  }

  callback();
};

ReadableTransformer.prototype.dispatch = function (payload_data) {
  var self = this;
  var client = self.client;

  if (!payload_data)
    return;
  var event = payload_data.event;
  var data = payload_data.rawdata;
  client.sysEmit(event, data);
};

// treat the fragments' parsing as a stream
// now, only binary fragments can be gotten from stream
// TODO: put all incomming message to a transformer stream,
// so we just call 
//     `client.on(custom_event, function(dataStream) { /*dataStream.pipe(dst)*/ })`
// is ok.
ReadableTransformer.prototype.streamParser = function () {
  var self = this;
  var client = self.client,
      e_source = self.e_source;

  var meta = [];  
  var state = 0;
  var head_len, event;

  var passThrough = new stream.PassThrough();

  // turn on flowing mode,
  // to avoid too much data buffing in memory,
  // don't forget to add a listener or pipe it in your app code.
  passThrough.resume();

  function onFirstFragment(data) {
    head_len = data.readUInt8(0);

    if (data.length == 1)
      return;

    if (data.length < head_len + 1) {
      meta.push(data.slice(1));
      head_len -= data.length - 1;
    } else {
      event = data.slice(1, head_len + 1).toString();
      head_len = 0;
      state = 1;
      client.sysEmit(event, passThrough);
      passThrough.push(data.slice(head_len + 1));
    }
  }

  function onFragment(data) {
    if (state == 0)
      if (data.length < head_len) {
        meta.push(data.slice(1));
        head_len -= data.length;
      } else {
        meta.push(data.slice(0, head_len));
        event = Buffer.concat(meta).toString();
        meta = null;
        head_len = 0;
        state = 1;
        client.sysEmit(event, passThrough);
        passThrough.push(data.slice(head_len));
      }
    else
      passThrough.push(data);
  }

  function onLastFragment(data) {
    e_source.removeListener('fragment', onFragment);
    passThrough.push(data);
    passThrough.push(null);
  }

  e_source
    .once('firstfragment', onFirstFragment)
    .on('fragment', onFragment)
    .once('lastfragment', onLastFragment);
};

module.exports = ReadableTransformer;
