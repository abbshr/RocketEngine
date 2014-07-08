
/*
* @frame<Buffer>: raw buffer data
* return: { frame<JSON>, remain_frame<Buffer> } 
*/
module.exports = function (frame) {

  // if the frame is not include FIN, Opcode, MASK, Payload_len intergrally
  // it told that the frame is broken
  if (frame.length < 2) return null;
  
  // cursor
  var counter = 0;
  
  var fin_offset = 7,
    opcode_offset = parseInt(1111, 2),
    mask_offset = 7,
    payload_len_offset = parseInt(1111111, 2);

  // bit value in frame
  var FIN = frame[counter] >> fin_offset,
    Opcode = frame[counter++] & opcode_offset,
    MASK = frame[counter] >> mask_offset,
    Payload_len = frame[counter++] & payload_len_offset;

  // if payload length equals to 126
  // the next 16 bit length is payload length
  Payload_len === 126 && 
  (Payload_len = frame.readUInt16BE(counter)) && 
  
  // skip to payload/mask first index
  (counter += 2); 

  // if payload length equals to 127
  // the next 32 bit length is payload length
  // the high 8 bit remain null
  Payload_len === 127 && 
  (Payload_len = frame.readUInt32BE(counter + 4)) && 
  
  // skip to payload/mask first index
  (counter += 8);
  
  // create a buffer size of Payload_len
  var buffer = new Buffer(Payload_len);

  if (MASK) {
    // get mask key
    var Masking_key = frame.slice(counter, counter + 4);

    // skip to payload first index
    counter += 4;

    for (var i = 0; i < Payload_len; i++) {
      var j = i % 4;
      buffer[i] = frame[counter + i] ^ Masking_key[j];
    }
  }

  // finally counter skip to payload_data first index

  // if frame size is smaller than payload's length, it told that the frame is broken
  if (frame.length < counter + Payload_len) return undefined;
  
  // get the remain frame after payload data
  frame = frame.slice(counter + Payload_len);

  // if nothing goes wrong, return the readable frame and remain frame 
  return {
    frame: {
      FIN: FIN,
      Opcode: Opcode,
      MASK: MASK,
      Payload_len: Payload_len,
      Payload_data: buffer
    }, 
    remain_frame: frame
  };
};