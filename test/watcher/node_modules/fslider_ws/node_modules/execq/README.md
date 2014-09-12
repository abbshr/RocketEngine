###execQ

pending the commands and execute them in a right time.

used in project [fSlider_ws-Rainy](https://github.com/abbshr/fSlider_ws)

####Install

```bash
npm install execq
```

####Usages

```js
var execQ = new require('execq');

execQ.pend([socket, socket.write, argv]);
execQ.pend([socket, socket.write, argv]);
execQ.pend([socket, socket.write, argv]);
execQ.pend([socket, socket.write, [arg1, arg2...]]);
execQ.pend(function(){ // the codes });

// once some important jobs done
worker.on('works done', function () {
  // now go on execute the pended codes remain in queue
  execQ.goon();
});

```

####API

```js
// init the max pending-queue lenght
var execQ = new require('exdecq')(maxlen);
```

```js
// add a job to pending-queue
execQ.pend(operation);
```

+ operation {Array | Function}

ex:
```js
// array
[object, function, [arg1, arg2, ..., argn]]
```

```js
// execute a series of pended commands with a seqnum
execQ.goon(seqnum);
```
execute the commands from the seqnum

+ seqnum {Number} (option)

```js
// clean the pending-queue
execQ.clean();
```

execQ will emit event `pending` on invoking `.pend()`, and emit event `continue` on finish invoking `.goon()`
