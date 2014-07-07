
// @frame: a JSON obj as readable_data resolved by decoder
module.exports = function (frame) {

  // for control bit: FIN, Opcode, MASK, Payload_len
  var preBytes = [];

  // encode the payload_data
  var payBytes = new Buffer(frame['Payload_data']);
  var dataLength = payBytes.length;

  preBytes.push((frame['FIN'] << 7) + frame['Opcode']);

  if (dataLength < 126)
    preBytes.push((frame['MASK'] << 7) + dataLength);

  else if (dataLength < 65536)
    preBytes.push(
      (frame['MASK'] << 7) + 126, 
      (dataLength & 0xFF00) >> 8,
      dataLength & 0xFF
    );

  else
    preBytes.push(
      (frame['MASK'] << 7) + 127,
      0, 0, 0, 0,
      (dataLength & 0xFF000000) >> 24,
      (dataLength & 0xFF0000) >> 16,
      (dataLength & 0xFF00) >> 8,
      dataLength & 0xFF
    );

  // encode control bit data
  preBytes = new Buffer(preBytes);

  // return the raw frame
  return Buffer.concat([preBytes, payBytes]);
};