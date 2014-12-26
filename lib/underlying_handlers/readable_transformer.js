var subParser = require('./sub_parser');
var utils = require('../utils');

// upper transformer
// @@options: { server, client }
function ReadableTransformer(options) {
  this.server = options.server;
  this.client = options.client;
  //this.fragment = [];
  //this.f_type = 0x2;
}

ReadableTransformer.prototype._transform = function (frame) {
  var self = this;
  var client = self.client,
      server = self.server;

  var event, data, head_len;
  var type;

  var FIN = frame['FIN'];
  var Opcode = frame['Opcode'];
  var MASK = frame['MASK'];
  var Payload_len = frame['Payload_len'];
  var Payload_data = frame['Payload_data'];

  var dispatch = function (payload_data) {
    self.dispatch(payload_data);
  };

  //console.log(frame.Payload_data.toString());
  // if receive frame is in fragment
  if (!FIN) {
    // save the first fragment's Opcode
    switch (Opcode) {
      case 0x1:
        type = 'text';
        client.sysEmit('firstfragment', { type: type, f_data: Payload_data });
        break;
      case 0x2:
        type = 'binary';
        client.sysEmit('firstfragment', { type: type, f_data: Payload_data });
        break;
      case 0x0:
        client.sysEmit('fragment', Payload_data);
        break;
    }
  } else {
    // don't fragment or the last fragment
    // translate raw Payload_data
    switch (Opcode) {
      // continue frame
      // the last fragment
      case 0x0:
        client.sysEmit('lastfragment', Payload_data);
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
        utils.log('in Websocket CLOSE Handshake statement');
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
          utils.log('client id: ' + client.get('id') + ' is PINGING the server');
        }
        utils.log('server is PINGING the current client');
        client.emitCtrl(0xA, null, null);
        break;
      // PONG
      case 0xA:
        client.sysEmit('pong');
        if (server) {
          server.sysEmit('pong', client);
          utils.log('client, id: ' + client.get('id') + ' send a PONG to the server');
        }
        utils.log('server send a PONG to the current client');
        break;
    }
  }
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

module.exports = ReadableTransformer;
