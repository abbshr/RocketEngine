var utils = require('../utils');
var wsframe = require('../wsframe');

/* this has been binded to Server instance */
/* arguments @client and @_buffer has been pre-setted */
module.exports = function (client, _buffer, data) {
  // if this module is used by non-browser client,
  // server is a null object
  var server = this || null;

  var readable_data, payload_data, event, rawdata, head_len;
  var FIN, Opcode, MASK, Payload_len;

  // we are not sure to get the entire frame on 'data' event triggered
  // the data it may be larger/little than a entire frame
  // so, we concat the new data with the remain buffer 
  // which only contains the frame couldn't be parse at last time
  _buffer.r_queue = Buffer.concat([_buffer.r_queue, data]);

  // the "while loop" gets and parses every entire frame remain in buffer
  while (readable_data = wsframe.parse(_buffer.r_queue)) {
    FIN = readable_data['frame']['FIN'],
    Opcode = readable_data['frame']['Opcode'],
    MASK = readable_data['frame']['MASK'],
    Payload_len = readable_data['frame']['Payload_len'];
    
    // if recive frame is in fragment
    if (!FIN) {
      // save the first fragment's Opcode
      if (Opcode) _buffer.Opcode = Opcode;
      payload_data = Buffer.concat([_buffer.f_payload_data, payload_data]);
    } else {
      payload_data = readable_data['frame']['Payload_data'];
      // don't fragment or the last fragment
      // translate raw Payload_data
      switch (Opcode) {
        // continue frame
        // the last fragment
        case 0x0:
          payload_data = Buffer.concat([_buffer.f_payload_data, payload_data]);
          // when the whole fragment recived
          // get the Opcode from _buffer
          Opcode = _buffer.Opcode;
          // init the fragment _buffer
          _buffer.f_payload_data = new Buffer(0);
        // non-control frame
        // system level text data
        case 0x1:
          try {
            payload_data = JSON.parse(payload_data.toString());
          } catch (e) {
            // cut this frame and skip to remain_frame
            utils.error(e);
          }
          // now payload_data is an JSON object or a string
          event = payload_data.hasOwnProperty('event') ? 
                  payload_data['event'] : new Error('Payload_data translate error');
          rawdata = payload_data.hasOwnProperty('data') ? 
                    payload_data['data'] : new Error('Payload_data translate error');
          
          if (event instanceof Error) {
            utils.error(event);
          } else if (rawdata instanceof Error) {
            utils.error(rawdata);
          } else {
            // if nothing goes wrong, emit event to Server
            client.sysEmit(event, rawdata);
          }
          break;
        // system level binary data
        case 0x2:
          head_len = payload_data.readUInt8(0);
          event = payload_data.slice(1, head_len + 1).toString();
          rawdata = payload_data.slice(head_len + 1);
          client.sysEmit(event, rawdata);
          break;
        
        // control frame
        // Close Frame
        case 0x8:
          // client may send a code
          state_code = payload_data.length ? 
                       payload_data.readUInt16BE(0) : 1000;
          client.sysEmit('closing', state_code);
          server && server.sysEmit('closing', client);
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
            utils.log('client id: ' + client.id + ' is PINGING the server');
          }
          utils.log('server is PINGING the current client');
          client.emitCtrl(0xA, null, null);
          break;
        // PONG
        case 0xA:
          client.sysEmit('pong');
          if (server) {
            server.sysEmit('pong', client);
            utils.log('client, id: ' + client.id + ' send a PONG to the server');
          }
          utils.log('server send a PONG to the current client');
          break;
      }
    }
    // the rest buffered data
    _buffer.r_queue = readable_data.r_queue;
  }
};