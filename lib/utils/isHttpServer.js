var http = require('http').Server;
var https = require('https').Server;

module.exports = function (s) {
  if (s instanceof http)
    return true;
  if (s instanceof https)
    return true;
  return false;
};