module.exports = (io) => {
  io.on('connection', (socket) => {
    socket.on('join_workspace', () => {
      socket.join('workspace');
    });
  });
};

