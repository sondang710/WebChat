const express = import('express');
const http = import('http');
const socketIo = import('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

io.on('connection', (socket) => {
  console.log('A user connected');

  // Lắng nghe khi client gửi offer và chuyển tiếp cho client khác
  socket.on('offer', (offer) => {
    socket.broadcast.emit('offer', offer);
  });

  // Lắng nghe khi client gửi answer và chuyển tiếp cho client khác
  socket.on('answer', (answer) => {
    socket.broadcast.emit('answer', answer);
  });

  // Lắng nghe ICE candidate và chuyển tiếp cho client khác
  socket.on('iceCandidate', (candidate) => {
    socket.broadcast.emit('iceCandidate', candidate);
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});

server.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});