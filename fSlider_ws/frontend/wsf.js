/* frontend script for fSlider-WebSocketFramework */
/*
* wsf
* method
* .on @eName, @cb(@e): bind listener on system level event, invoke @e.detail to get event data
* .emit: trigger an event on wsf
* .removeListener: opposite to method .on
* .connect @url, @cb(wsf.socket): return wsf.socket
* sys_event
* #connect: on method .connect success
* #disconnect: on connection closed
* object
* wsf.socket: returned by wsf.connect() or wsf.connect callback's first argument 
* method
* .on @eName, @cb(@e): bind listener on any event, invoke @e.detail to get event data
* .originEmit: origin .emit() method of EventEmitter
* .emit: overwrite the .emit() method of EventEmitter. emit an event to server on any level
* .send @cb(@e): send normal data to server
* .recive: recive normal data from server
* .close: close the connection
* sys_event
* #open: on connection established
* #close: on connection closed
* #error: on error happened
*/

(function (global) {

  if (!global.EventEmitter)
    throw new Error('object EventEmitter isnt initially right');
  else if (!global.WebSocket)
    throw new Error('only supported in explorer');

  var EventEmitter = global.EventEmitter;

  /*var wsf = { 
    _events: {
      'connect': [],
      'disconnect': [] 
    } 
  };*/

  var wsf = new EventEmitter({ bubbles: false, cancelable: false });

  /*
  wsf.on = function (eName, cb) {
    //this._events[eName] ? this._events[eName].push(cb) : (this._events[eName] = [cb]);
    
  };

  wsf.emit = function (eName, data) {
    this._events[eName] && this._events[eName].forEach(function (cb) {
      setTimeout(cb.bind(null, data), 0);
    });
  };

  wsf.removeListener = function (eName, cb) {
    var index = this._events[eName] && this._events[eName].indexOf(cb);
    this._events[eName].splice(index, 1)
  };
  */

  wsf.connect = function (ws_url, cb) {
    /*var socket = { 
      _events: { 
        'open': [],
        'close': [],
        'error': [] 
      } 
    };*/
    var socket = new EventEmitter({ bubbles: false, cancelable: false });

    if (!ws_url) {
      throw new Error('URL is needed');
    } else if (typeof ws_url != 'string') {
      throw new Error('Unknow ws URL pattern');
    } else if (!ws_url.match(/^(ws:\/\/)|(wss:\/\/)/)) {
      throw new Error('Unknow ws URL pattern');
    } else {
      if (cb instanceof Function) 
        // async
        this.on('connect', cb);
      socket.originEmit = socket.emit;
      socket.ws = new WebSocket(ws_url);
      socket.ws.onmessage = function(e) {
        var payload_data = JSON.parse(e.data);
        var event = payload_data['event'];
        var data = payload_data['data'];
        var type = payload_data['type'];
        /*socket._events[event] && socket._events[event].forEach(function (cb) {
          setTimeout(cb.bind(null, data), 0);
        });*/
        socket.originEmit(event, data, type);
      };
      socket.ws.onopen = function (e) {
        /*socket._events['open'].forEach(function (cb) {
          setTimeout(cb.bind(null, e), 0);
        });*/
        socket.originEmit('open', e);
      };
      socket.ws.onclose = function (e) {
        /*socket._events['close'].forEach(function (cb) {
          setTimeout(cb.bind(null, e), 0);
        });*/
        socket.originEmit('close', e);
        wsf.emit('disconnect', socket);
      };
      socket.ws.onerror = function (e) {
        /*socket._events['error'].forEach(function (cb) {
          setTimeout(cb.bind(null, e), 0);
        });*/
        socket.originEmit('error', e);
      };
      /*socket.on = function (e, cb) {
        this._events[e] ? this._events[e].push(cb) : (this._events[e] = [cb]);
      };*/
      socket.emit = function (e, data, type) {
        var payload_data = {
          'event': e || '',
          'data': data || '',
          'type': type || 'string'
        }, 
        payload_data_json = JSON.stringify(payload_data);
        this.ws.send(payload_data_json);
      };
      // suger
      socket.send = function (data, type) {
        this.emit("data", data, type);
      };
      // suger
      socket.recive = function (cb) {
        this.on('data', cb);
      };
      socket.close = function () {
        this.ws.close();
      };
      this.emit('connect', socket);
      // sync
      return socket;
    }
  };

  global.wsf = wsf;

})(this);