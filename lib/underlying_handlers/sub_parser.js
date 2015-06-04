var util = require('../util');

exports.binaryParser = function (payload_data, callback) {
  var head_len, event, rawdata;
  try {
    head_len = payload_data.readUInt8(0);
    event = payload_data.slice(1, head_len + 1).toString();
    rawdata = payload_data.slice(head_len + 1);
    payload_data = {
      event: event,
      rawdata: rawdata
    };
  } catch (e) {
    // cut this frame and skip to remain_frame
    console.error(e);
    payload_data = null;
  }
  callback(payload_data);
}

exports.textParser = function (payload_data, callback) {
  var event, rawdata;
  try {
    payload_data = JSON.parse(payload_data.toString());
    // now payload_data is an JSON object or a string
    event = payload_data['event'];
    rawdata = payload_data['data'];

    if (util.isNullOrUndefined(event) || util.isNullOrUndefined(rawdata)) {
      throw new Error('Payload_data translate error');
    } else {
      payload_data = {
        event: event,
        rawdata: rawdata
      };
    }
  } catch (e) {
    // cut this frame and skip to remain_frame
    console.error(e);
    payload_data = null;
  }
  callback(payload_data);
}
