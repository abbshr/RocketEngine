/* WebSocket Frame Parser */

/*
* @r_queue<Buffer>: raw buffer data
* return: { frame<JSON>, remain_frame<Buffer> } 
*/
module.exports = function (r_queue) {

  // if the queue is not include FIN, Opcode, MASK, Payload_len intergrally
  // it told that the frame is broken
  if (r_queue.length < 2) return null;
  
  // cursor
  var counter = 0;

  // to buffer the Payload_data
  var Payload_data = null;
  var Masking_key;
  
  var fin_offset = 7,
      opcode_offset = 0x0F,
      mask_offset = 7,
      payload_len_offset = 0x7F;

  // bit value in frame
  var FIN = r_queue[counter] >> fin_offset,
      Opcode = r_queue[counter++] & opcode_offset,
      MASK = r_queue[counter] >> mask_offset,
      Payload_len = r_queue[counter++] & payload_len_offset;

  if (r_queue.length < counter + Payload_len) return null;

  // if payload length equals to 126
  // the next 16 bit length is payload length
  Payload_len === 126 && 
  (Payload_len = r_queue.readUInt16BE(counter)) && 
  
  // skip to payload/mask first index
  (counter += 2); 

  // if payload length equals to 127
  // the next 32 bit length is payload length
  // the high 8 bit remain null
  Payload_len === 127 && 
  (Payload_len = r_queue.readUInt32BE(counter + 4)) && 
  
  // skip to payload/mask first index
  (counter += 8);
  
  // create a buffer size of Payload_len
  Payload_data = new Buffer(Payload_len);

  if (MASK) {
    // get mask key
    Masking_key = r_queue.slice(counter, counter + 4);

    // skip to payload first index
    counter += 4;

    for (var i = 0; i < Payload_len; i++)
      Payload_data[i] = r_queue[counter + i] ^ Masking_key[i & 3];

  } else {
    Payload_data = r_queue.slice(counter, counter + Payload_len);
  }

  // finally counter skip to payload_data first index

  // if queue size is smaller than payload's length, it told that the frame is broken
  if (r_queue.length < counter + Payload_len) return null;
  
  // get the remain buffer after payload data
  r_queue = r_queue.slice(counter + Payload_len);

  // if nothing goes wrong, return the readable frame and remain buffer 
  return {
    frame: {
      FIN: FIN,
      Opcode: Opcode,
      MASK: MASK,
      Payload_len: Payload_len,
      Payload_data: Payload_data
    }, 
    r_queue: r_queue
  };
};