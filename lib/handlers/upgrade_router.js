var utils = require('../utils');
var handshake_handler = require('./handshake_handler.js')

/* 'upgrade' event callback */
/* namespace's routing in the first layer */
/* this has been binded to object wsf */
module.exports = function (req, socket) {
  var wsf = this;
  var namespace = req.url;

  // if no match founded, reject the request
  wsf._servers.some(function (server, i) {
    if (server.namespace == namespace)
      return handshake_handler.call(server, req, socket);
    return false;
  }) || utils.error('Reject the request of namespace [' + namespace + ']: handler not match!');
};