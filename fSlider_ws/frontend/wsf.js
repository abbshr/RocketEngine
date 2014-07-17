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
* property
* .autoreconnect <Boolean>: whether reconnect after losing connection to server, default to true
* .expire <Number>: reconnect waiting expire, default to 6s
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

  // util
  // overwrite typeof keyword
  var typeOf = function (obj) {
    return Object.prototype.toString.call(obj).slice(8, -1).toLowerCase();
  };
  // generate random number
  var genRandomNumber = function () {
    var intview = new Uint32Array(1);
    return crypto.getRandomValues(intview)[0];
  };

  var EventEmitter = global.EventEmitter;

  var wsf = new EventEmitter({ bubbles: false, cancelable: false });

  wsf.ref = {};

  // the underlying of wsf#connect() and reconnect_cb
  // @reconnect_info <Object>: { id: <Number> }
  wsf._originConnect = function (reconnect_info, ws_url, cb) {
    var socket = new EventEmitter({ bubbles: false, cancelable: false });

    if (!ws_url) {
      throw new Error('URL is needed');
    } else if (typeOf(ws_url) != 'string') {
      throw new Error('Unknow ws URL pattern');
    } else if (!ws_url.match(/^(ws:\/\/)|(wss:\/\/)/)) {
      throw new Error('Unknow ws URL pattern');
    } else {
      if (cb instanceof Function) 
        // async
        this.on('connect', cb);
      
      socket.originEmit = socket.emit;

      socket.cb = cb;
      socket.url = ws_url;
      // whether allow to auto-reconnect when there is no connection alive
      socket.autoreconnect = true;
      // reconnect expire
      // default to 6s (new conn) / origin expire (reconnect)
      socket.expire = (reconnect_info ? reconnect_info.expire : 6000) || 6000;

      socket.ws = new WebSocket(ws_url);

      // set binary data format
      socket.ws.binaryType = 'blob';
      socket.ws.onmessage = function(e) {
        var data = e.data;
        var head_len, event;
        if (data instanceof Blob) {
          var fr = new FileReader();
          fr.onload = function () {
            head_len = new DataView(this.result);
            head_len = head_len.getUint8(0);
            event = data.slice(1, head_len + 1);
            data = data.slice(head_len + 1);
            this.onload = function () {
              event = this.result;
              socket.originEmit(event, data);
            };
            this.readAsText(event);
          };
          head_len = data.slice(0, 1);
          fr.readAsArrayBuffer(head_len);
        } else if (typeOf(data) == 'string') {
          data = JSON.parse(data);
          event = data['event'];
          data = data['data'];
          socket.originEmit(event, data);
        }
      };
      socket.ws.onopen = function (e) {
        var random;
        if (reconnect_info) {
          clearTimeout(wsf.ref[reconnect_info.id]);
          random = reconnect_info.id;
        } else {
          random = genRandomNumber();
          wsf.ref[random] = true;
        }
        // identify the client
        socket.id = random;
        console.info('connection established');
        socket.originEmit('open');
      };
      socket.ws.onclose = function (e) {
        var close_info = {
          code: e.code,
          reason: e.reason,
          clean: e.wasClean
        };
        console.warn('lose connection');
        socket.originEmit('close', close_info);
        wsf.emit('disconnect', socket);
      };
      socket.ws.onerror = function (e) {
        console.error('an error happened in connection');
        socket.originEmit('error', e);
      };
      socket.emit = function (e, data) {
        var payload_data = data;
        var head_len;
        if (data instanceof Blob) {
          head_len = new DataView(new ArrayBuffer(1));
          e = new Blob([e]);
          // write in big endian
          head_len.setUint8(0, e.size);
          head_len = new Blob([head_len.buffer]);
          payload_data = new Blob([head_len, e, data]);
        } else if (typeOf(data) == 'string') {
          payload_data = {
            'event': +e || '',
            'data': +data || ''
          };
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

  wsf.connect = wsf._originConnect.bind(wsf, false);

  wsf.on('disconnect', function (e) {
    var socket = e.detail;
    if (!socket.autoreconnect)
      return;
    var reconnect_info = {
      isNew: false,
      id: socket.id,
      expire: socket.expire
    };
    var reconnect_cb = wsf._originConnect.bind(wsf, reconnect_info, socket.url, socket.cb);
    // auto reconnect after 6s
    wsf.ref[socket.id] = setTimeout(reconnect_cb, socket.expire);
    console.warn('reconnecting...');
  });

  global.wsf = wsf;

})(this);