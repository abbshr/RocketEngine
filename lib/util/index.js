var util = require('util');
var http = require('http').Server;
var https = require('https').Server;

// extends origin module util
var utils = module.exports = Object.create(util);

utils.genMasking_key = require('./genmask');
utils.coolLogo = require('./coolLogo');

var typeOf = utils.typeof = function (obj) {
  return Object.prototype.toString.call(obj).slice(8, -1).toLowerCase();
};

// make magic str readonly
Object.defineProperty(utils, 'MAGIC_STRING', {
  value: '258EAFA5-E914-47DA-95CA-C5AB0DC85B11',
  writable: false,
  configurable: false
});

// additional test
utils.isHttpServer = function (s) {
  return s instanceof http || s instanceof https;
};
