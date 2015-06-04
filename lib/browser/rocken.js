
(function (global) {

  if (!global.EventEmitter)
    throw new Error('object EventEmitter doesn\'t initially right');
  else if (!global.WebSocket)
    throw new Error('only supported in explorer');
  else if (!global.crypto)
    throw new Error('crypto module not found!');

  // util
  // overwrite typeof keyword
  var typeOf = function (obj) {
    return Object.prototype.toString.call(obj).slice(8, -1).toLowerCase();
  };
  // generate random 32bit integer
  var genRandomNumber = function () {
    var intview = new Uint32Array(1);
    return crypto.getRandomValues(intview)[0];
  };

  var EventEmitter = global.EventEmitter;

  var rocken = new EventEmitter();

  rocken.ref = {};

  // the underlying of rocken#connect() and reconnect_cb
  // @reconnect_info <Object>: { id: <Number>, expire: <Number> }
  rocken._connect = function (reconnect_info, ws_url, cb) {
    var socket = new EventEmitter();

    if (!ws_url) {
      throw new Error('URL is needed');
    } else if (typeOf(ws_url) != 'string') {
      throw new Error('Unknown ws URL pattern');
    } else if (!ws_url.match(/^(ws|wss):\/\//)) {
      throw new Error('Unknown ws URL pattern');
    } else {
      socket.sysEmit = socket.emit;
      socket.cb = cb;
      socket.url = ws_url;
      // whether to allow auto-reconnect when there is no connection alive
      socket.autoreconnect = true;
      // reconnect expire
      // default to 6s (new conn) / (error reconnect, such as can not find the server)
      socket.expire = (reconnect_info ? reconnect_info.expire : 6000) || 6000;

      socket.ws = new WebSocket(ws_url);

      // set binary data format
      socket.ws.binaryType = 'blob';

      if (cb instanceof Function)
        // async
        socket.on('open', cb);
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
              socket.sysEmit(event, data);
            };
            this.readAsText(event);
          };
          head_len = data.slice(0, 1);
          fr.readAsArrayBuffer(head_len);
        } else if (typeOf(data) == 'string') {
          data = JSON.parse(data);
          event = data['event'];
          data = data['data'];
          socket.sysEmit(event, data);
        }
      };
      socket.ws.onopen = function (e) {
        var random;
        if (reconnect_info) {
          random = reconnect_info.id;
        } else {
          // don't think about what the id is in this situation:
          // the connection never establishes successfully by now,
          // and in the future, the connection may establishes.

          // if the connection never establishes successfully
          // the socket here is regarded as a 'reconnect' socket
          // and the socket.id has been valued after the 'error' event triggered.
          // so the statement won't be executed.
          random = genRandomNumber();
        }
        // identify the client
        socket.id = random;
        // init the timer's ref
        rocken.ref[random] = 0;
        console.info('client id:', socket.id, 'connection established');
        socket.sysEmit('open', socket);
      };
      socket.ws.onclose = function (e) {
        var close_info = {
          code: e.code,
          reason: e.reason,
          clean: e.wasClean
        };
        socket.id = socket.id || (reconnect_info.id || genRandomNumber());
        console.warn('client id:', socket.id, 'lose connection');
        socket.sysEmit('close', close_info);
        rocken.emit('disconnect', socket);
      };
      socket.ws.onerror = function (e) {
        // notice the id valued may be here
        socket.id = socket.id || (reconnect_info.id || genRandomNumber());
        console.error('client id:', socket.id, 'an error happened in connection');
        socket.sysEmit('error', e);
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
        } else {
          payload_data = JSON.stringify({
            'event': `${e}`,
            'data': (function () {
              if (data == null)
                data = '';
              else if (typeof data == 'function')
                data = `${src}`;
              return data;
            })()
          });
        }
        this.ws.send(payload_data);
      };
      // sugar
      socket.send = function (data) {
        this.emit("data", data);
      };
      // sugar
      socket.receive = function (cb) {
        this.on('data', cb);
      };
      socket.close = function (code) {
        if (code)
          this.ws.close(+code);
        else
          this.ws.close();
      };
      // sync
      return socket;
    }
  };

  rocken.connect = rocken._connect.bind(rocken, false);

  rocken.on('disconnect', function (socket) {
    if (!socket.autoreconnect)
      return;
    var reconnect_info = {
      isNew: false,
      id: socket.id,
      expire: socket.expire
    };
    var reconnect_cb = rocken._connect.bind(rocken, reconnect_info, socket.url, socket.cb);
    // auto reconnect after expire ms
    rocken.ref[socket.id] = setTimeout(reconnect_cb, socket.expire);
    console.warn('client id:', socket.id, 'reconnecting...');
  });

  global.rocken = rocken;

})(this);
