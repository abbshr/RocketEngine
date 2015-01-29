
/* genaretor Masking_key */
var crypto = require('crypto');
module.exports = function () {
  return crypto.randomBytes(4);
};