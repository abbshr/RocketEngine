var util = require('util');

// extends origin module util
var utils = module.exports = Object.create(util);
utils.genMasking_key = require('./genmask');
utils.typeOf = require('./typeOf');
utils.coolLogo = require('./coolLogo');
utils.isHttpServer = require('./isHttpServer');

// make magic str readonly
Object.defineProperty(utils, 'MAGIC_STRING', {
  value: '258EAFA5-E914-47DA-95CA-C5AB0DC85B11',
  writable: false,
  configurable: false
});