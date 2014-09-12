event.js V0.1.0
===

a async & UI-non-blocking event-customable frontend library

it can create JavaScript Obejcts obtain HTMLElement's feature---Event Driven

all the events' workflow is providen by DOM Event Model

##### Notice!

This module is only available in the web browser!

##### install:

```shell
npm install event.js
```

##### example:

```js

  var spore = new EventEmitter();

  spore.on('growup', function (data) {
    console.log(data);
  });

  spore.on('die', function (data) {
    // ...
  });

  spore.emit('born', { size: 0.05, color: blue });

```

##### other usages && options:

```js

  EventEmitter(options)

  the options is an object, all the events follow this setting:
  {
    MAXListener: <Number>,
    bubbles: <Boolean>,
    cancelable: <Boolean>
  }

  method:
    .emit()
    .on()
    .once()
    .removeListener()
```