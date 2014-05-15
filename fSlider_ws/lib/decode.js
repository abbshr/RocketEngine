
module.exports = function (frame) {
  if (frame.length < 2) return null;
  
  var counter = 0;
  
  var fin_offset = 7,
    opcode_offset = parseInt(1111, 2),
    mask_offset = 7,
    payload_len_offset = parseInt(1111111, 2);

  var FIN = frame[counter] >> fin_offset,
    Opcode = frame[counter++] & opcode_offset,
    MASK = frame[counter] >> mask_offset,
    Payload_len = frame[counter++] & payload_len_offset;

  Payload_len === 126 && 
  (Payload_len = frame.readUInt16BE(counter)) && 
  (counter += 2);

  Payload_len === 127 && 
  (Payload_len = frame.readUInt32BE(counter + 4)) && 
  (counter += 8);
  
  var buffer = new Buffer(Payload_len);
  if (MASK) {
    var Masking_key = frame.slice(counter, counter + 4);

    counter += 4;

    for (var i = 0; i < Payload_len; i++) {
      var j = i % 4;
      buffer[i] = frame[counter + i] ^ Masking_key[j];
    }
  }

  if (frame.length < counter + Payload_len) return undefined;
  
  frame = frame.slice(counter + Payload_len);

  return {
    FIN: FIN,
    Opcode: Opcode,
    MASK: MASK,
    Payload_len: Payload_len,
    Payload_data: buffer, 
    frame: frame
  }
};