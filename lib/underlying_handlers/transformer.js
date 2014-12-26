var utils = require('../utils');
var wsframe = require('../wsframe');
var subParser = require('./sub_parser');

var stream = require('stream');

function Transformer (options) {
  stream.Transform.call(this);
  this._writableState.objectMode = false;
  this._readableState.objectMode = true;
  this.server = options.server;
  this.client = options.client;
  /*this.r_queue = new Buffer(0);
  this.f_payload_data = [];
  this.f_type = null;*/
  this.needMore = true;
}

utils.inherits(Transformer, stream.Transform);

Transformer.prototype._transform = function (chunk) {
  var self = this;
  var client = self.client,
      server = self.server;

  /*var readable_data, payload_data, event, rawdata, head_len;
  var FIN, Opcode, MASK, Payload_len;
  var type;
  var raw_frame;*/
  //var readMore = true;

  /*function dispatch(payload_data) {
    if (!payload_data)
      return;
    var event = payload_data.event;
    var data = payload_data.rawdata;
    client.sysEmit(event, data);
  }*/
  //console.log(chunk);
  var raw_data, readable_data;

  // we are not sure to get the entire frame on 'data' event triggered
  // the data it may be larger/little than a entire frame
  // so, we concat the new data with the remain buffer 
  // which only contains the frame couldn't be parse at last time
  //self.r_queue = Buffer.concat([self.r_queue, chunk]);

  // the "while loop" gets and parses every entire frame remain in buffer
  while (readable_data = wsframe.parse(chunk)) {
    if () {
      self.push(readable_data.frame) || (self.needMore = false);
      client.socket.unshift(readable_data.remain);
    } else {
      client.socket.unshift(raw_data);
    }
    console.log(raw_data, readable_data.frame);
    /*
    FIN = readable_data['frame']['FIN'],
    Opcode = readable_data['frame']['Opcode'],
    MASK = readable_data['frame']['MASK'],
    Payload_len = readable_data['frame']['Payload_len'];
    payload_data = readable_data['frame']['Payload_data'];

    // if recive frame is in fragment
    if (!FIN) {
      // save the first fragment's Opcode
      if (Opcode) {
        switch (Opcode) {
          case 0x1:
            type = 'text';
            break;
          case 0x2:
            type = 'binary';
        }
        //self.handleFragment(dispatch);
        client.sysEmit('firstfragment', { type: type, f_data: payload_data });
      }
      else
        client.sysEmit('fragment', payload_data);

    } else {
      // don't fragment or the last fragment
      // translate raw Payload_data
      switch (Opcode) {
        // continue frame
        // the last fragment
        case 0x0:
          client.sysEmit('lastfragment', payload_data);
          break;

        // system level binary data
        case 0x2:
          subParser.binaryParser(payload_data, dispatch);
          break;

        // non-control frame
        // system level text data
        case 0x1:
          subParser.textParser(payload_data, dispatch);
          break;
        
        // control frame
        // Close Frame
        case 0x8:
          // client may send a code
          state_code = payload_data.length ? 
                       payload_data.readUInt16BE(0) : 1000;
          this.client.sysEmit('closing', state_code);
          this.server && this.server.sysEmit('closing', this.client);
          utils.log('in Websocket CLOSE Handshake statement');
          // CLOSE Handshake process
          // constructing a "clean close": 
          // once recive a close frame, send a close frame
          this.client.close(state_code, 'u r requesting for closing the connection');
          // then close the underlying TCP connection
          this.client.end();
          break;
        // PING
        case 0x9:
          this.client.sysEmit('ping');
          if (this.server) {
            this.server.sysEmit('ping', this.client);
            utils.log('client id: ' + client.get('id') + ' is PINGING the server');
          }
          utils.log('server is PINGING the current client');
          this.client.emitCtrl(0xA, null, null);
          break;
        // PONG
        case 0xA:
          client.sysEmit('pong');
          if (this.server) {
            this.server.sysEmit('pong', this.client);
            utils.log('client, id: ' + client.get('id') + ' send a PONG to the server');
          }
          utils.log('server send a PONG to the current client');
          break;
      }
    }*/
    // the rest buffered data
    //self.r_queue = readable_data.r_queue;
  }
};

// buffer the whole fragments in memory.
// notice this behavior will increase the memory used!
// NEVER do this unless you are confidence with your memory space!!
// recommend to save the fragment to local filesystem or pipe/forward to somewhere else.
// in other words, you can write your own logic to deal with fragments.
Transformer.prototype.handleFragment = function (callback) {
  var self = this;

  function onFragment(f_payload_data) {
    self.f_payload_data.push(f_payload_data);
  }

  self.client
    .once('firstfragment', function (fragment) {
      self.f_type = fragment.type;
      self.f_payload_data.push(fragment.f_data);
    })
    .on('fragment', onFragment)
    .once('lastfragment', function (f_payload_data) {
      self.f_payload_data.push(f_payload_data);
      var raw_data = self.f_payload_data;
      raw_data = Buffer.concat(raw_data);
      
      self.f_payload_data = [];
      self.client.removeListener('fragment', onFragment);
      
      if (self.f_type == "binary")
        subParser.binaryParser(raw_data, callback);
      else if (self.f_type == "text")
        subParser.textParser(raw_data, callback);
    });
};

module.exports = Transformer;
