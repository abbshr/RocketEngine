var utils = require('../utils');

/* this has been binded to Server instance */
/* arguments @client and @cache has been pre-setted */
module.exports = function (client, cache, data) {
  var server = this;

  var readable_data, payload_data, event, rawdata, head_len;
  var FIN, Opcode, MASK, Payload_len;

  // concat the buffer with last time resolved frame
  // because sometimes a lot of 'data' event may be triggered in one time,
  // node treat them as one-time event,
  // if not do so, some data could be lost
  cache.frame = Buffer.concat([cache.frame, data]);

  // the "while loop" to get all right data remain in cache
  while (readable_data = utils.decodeFrame(cache.frame)) {
    FIN = readable_data['frame']['FIN'],
    Opcode = readable_data['frame']['Opcode'],
    MASK = readable_data['frame']['MASK'],
    Payload_len = readable_data['frame']['Payload_len'];
    
    // if recive frame is in fragment
    if (!FIN) {
      // save the first fragment's Opcode
      if (Opcode) cache.Opcode = Opcode;
      payload_data = Buffer.concat([cache.fragmentCache, payload_data]);
    } else {
      payload_data = readable_data['frame']['Payload_data'];
      // don't fragment or the last fragment
      // translate raw Payload_data
      switch (Opcode) {
        // continue frame
        // the last fragment
        case 0x0:
          payload_data = Buffer.concat([cache.fragmentCache, payload_data]);
          // when the whole fragment recived
          // get the Opcode from cache
          Opcode = cache.Opcode;
          // init the fragment cache
          cache.fragmentCache = new Buffer(0);
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
          payload_data = payload_data.toString();
          client.sysEmit('closing', client);
          server.sysEmit('closing', client);
          // CLOSE Handshake process
          // don't forget to add a 2 byte status code
          // normal CLOSE
          client.emitCtrl(0x8, 1000, 'u r requesting for closing the connection');
          client.close();
          break;
        // PING
        case 0x9:
          client.sysEmit('ping', client);
          server.sysEmit('ping', client);
          utils.log('client id: ' + client.id + ' is PINGING the server');
          client.emitCtrl(0xA, null, null);
          break;
        // PONG
        case 0xA:
          client.sysEmit('pong', client);
          server.sysEmit('pong', client);
          utils.log('client, id: ' + client.id + ' send a PONG to the server');
          break;
      }
    }
    // the rest frame data
    cache.frame = readable_data['remain_frame'];
  }
};