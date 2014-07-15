/* frontend script for fSlider-WebSocketFramework */
/*
* wsf
* method
* .on: bind listener on system level event
* .emit: trigger an event on wsf
* .removeListener: opposite to method .on
* .connect @url, @cb(wsf.socket): return wsf.socket
* sys_event
* #connect: on method .connect success
* #disconnect: on connection closed
* object
* wsf.socket: returned by wsf.connect() or wsf.connect callback's first argument 
* method
* .on: bind listener on any event
* .emit: emit an event to server on any level
* .send: send normal data to server
* .recive: recive normal data from server
* .close: close the connection
* sys_event
* #open: on connection established
* #close: on connection closed
* #error: on error happened
*/

(function (global) {
  global.WebSocket ||  new Error('only supported in explorer');

  var wsf = { 
    _events: {
      'connect': [],
      'disconnect': [] 
    } 
  };

  wsf.on = function (eName, cb) {
    this._events[eName] ? this._events[eName].push(cb) : (this._events[eName] = [cb]);
  };

  wsf.emit = function (eName, data) {
    this._events[eName] && this._events[eName].forEach(function (cb) {
      setTimeout(cb.bind(null, data), 0);
    });
  };

  wsf.removeListener = function (eName, cb) {
    var index = this._events[eName] && this._events[eName].indexOf(cb);
    this._events[eName].splice(index, 1);
  };

  wsf.connect = function (ws_url, cb) {
    var socket = { 
      _events: { 
        'open': [],
        'close': [],
        'error': [] 
      } 
    };
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
      socket.ws = new WebSocket(ws_url);

      // set binary data format
      socket.ws.binaryType = 'blob';
      socket.ws.onmessage = function(e) {
        // TODO: judge the recive-data type

        // if type is 'text'
        /*var payload_data = JSON.parse(e.data);
        var event = payload_data['event'];
        var data = payload_data['data'];
        //var type = payload_data['type'];*/
        socket._events['data'] && socket._events['data'].forEach(function (cb) {
          setTimeout(cb.bind(null, e), 0);
        });
      };
      socket.ws.onopen = function (e) {
        socket._events['open'].forEach(function (cb) {
          setTimeout(cb.bind(null, e), 0);
        });
      };
      socket.ws.onclose = function (e) {
        socket._events['close'].forEach(function (cb) {
          setTimeout(cb.bind(null, e), 0);
        });
        wsf.emit('disconnect', socket);
      };
      socket.ws.onerror = function (e) {
        socket._events['error'].forEach(function (cb) {
          setTimeout(cb.bind(null, e), 0);
        });
      };
      socket.on = function (e, cb) {
        this._events[e] ? this._events[e].push(cb) : (this._events[e] = [cb]);
      };
      socket.emit = function (e, data) {
        var type = 'text';
        var payload_data = data;
        // TODO: judge the data type 
        if (data instanceof Blob || data instanceof ArrayBuffer) {
          type = 'binary';

          // TODO: handle bin data

        } else {
          // the 'text' data
          payload_data = {
            'event': e || '',
            'data': data || ''
          }, 
          payload_data = JSON.stringify(payload_data);
        }
        this.ws.send(payload_data);
      };
      // suger
      socket.send = function (data) {
        this.emit("data", data);
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