var util = require('../util');
var handshake_handler = require('./handshake_handler')

/* 'upgrade' event callback */
/* namespace's routing in the first layer */
/* this has been binded to object rocken */
module.exports = function (req, socket) {
  var rocken = this;
  var namespace = req.url;

  // if no match founded, reject the request
  rocken._servers.some(function (server, i) {
    if (server.namespace == namespace)
      return handshake_handler.call(server, req, socket);
    return false;
  }) || util.error('Reject the request of namespace [' + namespace + ']: handler not match!');
};