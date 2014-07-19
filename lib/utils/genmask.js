
/* genaretor Masking_key */
var crypto = require('crypto');
module.exports = crypto.randomBytes(4).toJSON();