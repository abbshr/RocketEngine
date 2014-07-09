
/* reference usage */
wsf.connect('ws://loaclhost:3000', function (socket) {
  wsf.on('close');
  wsf.on('open');
  wsf.on('error');
  socket.on('data');
  socket.send(data);
  socket.on('eName', function (data) {});
  socket.emit('eName', data); 
  socket.close();
  socket.open();
});