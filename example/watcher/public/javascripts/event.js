
/* a Customable async UI-non-blocking Event library for browser */
/*
* EventEmitter
* @options : { MAXListener: <Number> }
* method:
* .emit @eName, @data
* .on @eName, @cb(@e): @data
* .once @eName, @cb(@e): the eName event can only triggered one time 
* .removeListener @eName, @cb: remove the given listener for eName
*
*/
(function (global) {

  if (!global.CustomEvent)
    throw new Error('your browser doesnt support custom events');

  var EventEmitter = function (options) {
    this.MAXListener = options ? (options.MAXListener || 100) : 100;
    this.listener = 0;
    // make the _eventStack property private and readonly
    Object.defineProperty(this, '_eventStack', {
      value: {},
      writeable: false,
      enumerable: false,
      configurable: false
    });
  };

  EventEmitter.prototype.emit = function (eName, data) {
    var _self = this;
    setTimeout(function () {
      _self._eventStack[eName] && _self._eventStack[eName].forEach(function (cb) {
        cb(data);
      });
    });
  };

  EventEmitter.prototype.on = function (eName, cb) {
    var _self = this;
    if (_self.listener + 1 > _self.MAXListener)
      return new Error('up to MAX Listeners limit');

    // ref to the real callback for removing operation
    cb._supercb = function (e) {
      cb(e);
    };
    _self._eventStack[eName] ?
      _self._eventStack[eName].push(cb._supercb) : _self._eventStack[eName] = [cb._supercb];
    _self.listener++;
  };

  EventEmitter.prototype.once = function (eName, cb) {
    var _self = this;
    if (_self.listener + 1 > _self.MAXListener)
      return new Error('up to MAX Listeners limit');

    cb._supercb = function (e) {
      cb(e);
      _self.removeListener(eName, cb);
      _self.listener--;
    };
    _self._eventStack[eName] ?
      _self._eventStack[eName].push(cb._supercb) : _self._eventStack[eName] = [cb._supercb];
    _self.listener++;
  };

  EventEmitter.prototype.removeListener = function (eName, cb) {
    var _self = this;
    var cb_index = _self._eventStack[eName] ? _self._eventStack[eName].indexOf(cb._supercb) : -1;
    if (cb_index == -1) 
      return;
    else
      _self._eventStack[eName].splice(cb_index, 1);
  };

  global.EventEmitter = EventEmitter;
})(this);