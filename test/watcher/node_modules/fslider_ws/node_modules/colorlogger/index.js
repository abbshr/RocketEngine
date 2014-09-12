/* colorlogger.js */
/*
*  author: Ran
*  des: make terminal log more corlorful~
*/

var util = require('util');
var fs   = require('fs');
var path = require('path');

// custom logger
var log = function () {
  var copy = arguments;
  Array.prototype.forEach.call(copy, function (e, i) {
    i && (copy[i] = ' ' + e);
  });
  return util.print.apply(util, copy);
};

/* hash code for background and font */
var _hash = {
  'b': 4,
  'f': 3
};

var styleSelector = {
  'close': '\33[0m',
  'clean': '\33[2J',
  'highlight': '\33[1m',
  'underline': '\33[4m'
};

/* cache the custom style */
var _style = '';

/* 
*  colorSelector['red']('b') // background color red
*  colorSelector['red']('f') // font color red
*/
var colorSelector = {
  'black': function (n) {
    return '\33[' + _hash[n] + '0m';
  },
  'red': function (n) {
    return '\33[' + _hash[n] + '1m';
  },
  'green': function (n) {
    return '\33[' + _hash[n] + '2m';
  },
  'yellow': function (n) {
    return '\33[' + _hash[n] + '3m';
  },
  'blue': function (n) {
    return '\33[' + _hash[n] + '4m';
  },
  'pink': function (n) {
    return '\33[' + _hash[n] + '5m';
  },
  'cyan': function (n) {
    return '\33[' + _hash[n] + '6m';
  },
  'white': function (n) {
    return '\33[' + _hash[n] + '7m';
  }
};

var styleCtrl = function (styleName, on) {
  var style_1 = _style.slice(0, 4),
      style_2 = _style.slice(4, 8);
  if (typeof on == 'boolean' && !on) {
    if (style_1 == styleSelector[styleName])
      _style = _style.slice(4), style_1 = '';
    if (style_2 == styleSelector[styleName])
      _style = style_1 + _style.slice(4, 8);
  } else {
    if (style_1 != styleSelector[styleName] && style_2 != styleSelector[styleName])
      _style = styleSelector[styleName] + _style;
  }
  return this;
};

var colorlogger = {
  logCache: '',
  lastLog: '',
  log: function () {
    var copy = arguments;
    Array.prototype.unshift.call(copy, _style);
    Array.prototype.push.call(copy, styleSelector.close, '\r\n');
    log.apply(null, copy);
    this.lastLog = Array.prototype.join.call(copy, '');
    this.logCache += this.lastLog;
    return this;
  },
  colored: function (color, mod, override) {
    if (typeof mod == 'boolean' || mod == undefined)
      override = mod, mod = 'f';
    if (override) {
      var style_1 = _style.slice(0, 4),
          style_2 = _style.slice(4, 8);
      if (style_1.match(/^(\33\[1m)|(\33\[4m)$/))
        _style = style_1 + colorSelector[color](mod);
      if (style_2.match(/^(\33\[1m)|(\33\[4m)$/))
        _style = style_2 + colorSelector[color](mod);
      else
        _style = colorSelector[color](mod);
    } else {
      var colorName = colorSelector[color](mod);
      var pattern = '\\' + colorName.slice(0, 1) + '\\' + colorName.slice(1);
      if (!_style.match(RegExp(pattern)))
        _style += colorName;
    }
    return this;
  },
  default: function () {
    _style = '';
    return this;
  },
  clean: function () {
    console.log(styleSelector.clean);
    return this;
  },
  close: function () {
    console.log(styleSelector.close);
    return this;
  },
  save: function (dir, options, cb) {
    if (!dir || typeof dir == 'function') {
      cb = dir;
      dir = path.join(__dirname, 'color.log');
      options = {
        record: 'l',
        append: false
      };
    } else if (dir.record || typeof dir.append == 'boolean') {
      options = dir;
      options.record = options.record || 'l';
      dir = path.join(__dirname, 'color.log');
    } else if (!options || typeof options == 'function') {
      cb = options;
      options = {
        record: 'l',
        append: false
      };
    }
    options.record = (options.record == 'l') ? this.lastLog : this.logCache;
    fs.writeFile(dir, options.record, {
      flag: options.append ? 'a' : 'w'
    }, function (err) {
      return (typeof cb == 'function' && cb(err));
    });
  },
  load: function (dir, cb) {
    if (!dir || typeof dir != 'string')
      return util.error(new Error('string path is needed'));
    fs.readFile(dir, function (err, buf) {
      console.log(buf && buf.toString());
      return (typeof cb == 'function' && cb(err));
    });
  }
};

colorlogger.highlight = styleCtrl.bind(colorlogger, 'highlight');
colorlogger.underline = styleCtrl.bind(colorlogger, 'underline');

module.exports = colorlogger;