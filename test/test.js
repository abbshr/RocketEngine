var muk = require('muk');
var rewire = require('rewire');
var assert = require('assert');

var rocket = require('..');
var http = require('http').createServer();
describe('test server instance', function () {
  it('.listen() callback with a same http server', function () {
    rocket.listen(http, function (server) {
      assert.equal(server, http);
    });
  });
});