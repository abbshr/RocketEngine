var EventEmitter = require('events').EventEmitter;
var ExecQ = function (maxlen) {
  this._queue = [];
  this.maxLength = maxlen || 1000;
};

ExecQ.prototype = Object.create(EventEmitter.prototype);

/* operation is an array */
/* 
* operation = [ object, object.function, argv ]
*/
ExecQ.prototype.pend = function (operation) {
  if (this._queue.length + 1 > this.maxLength)
    return;
  if (Array.isArray(operation))
    this._queue.push(operation);
  else if (typeof operation == 'function')
    this._queue.push([null, operation, []]);
  this.emit('pending', operation);
};
ExecQ.prototype.goon = function (num) {
  if (!this._queue.length)
    return;
  num = num >= 0 ? num : 0;
  // clean the goon-queue right now
  var q = this._queue.splice(num);
  q.forEach(function (operation) {
    // execute the remain operation in goon-queue
    setImmediate(function (operation) {
      var o = operation[0]
      var f = operation[1];
      var argv = operation[2];
      f.apply(o, argv);
    }, operation);
  });
  this.emit('continue', this._queue);
};
ExecQ.prototype.clean = function () {
  this._queue = [];
};

module.exports = ExecQ;
