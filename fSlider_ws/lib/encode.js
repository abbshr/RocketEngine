
module.exports = function (frame) {
  var preBytes = [];
  var payBytes = new Buffer(frame['Payload_data']);
  var dataLength = payBytes.length;

  preBytes.push((frame['FIN'] << 7) + frame['Opcode']);

  if (dataLength < 126)
    preBytes.push((frame['MASK'] << 7) + dataLength);

  else if (dataLength < Math.pow(2, 16))
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

  preBytes = new Buffer(preBytes);
  return Buffer.concat([preBytes, payBytes]);
};