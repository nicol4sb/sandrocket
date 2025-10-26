// WebSocket event handlers
const setupSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    
    // Join workspace room for real-time updates
    socket.on('join_workspace', () => {
      socket.join('workspace');
      console.log(`User ${socket.id} joined workspace`);
    });
    
    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
    
    // Handle custom events if needed
    socket.on('task_updated', (data) => {
      // Broadcast to other clients in the workspace
      socket.to('workspace').emit('task_updated', data);
    });
    
    socket.on('epic_updated', (data) => {
      // Broadcast to other clients in the workspace
      socket.to('workspace').emit('epic_updated', data);
    });
  });
};

module.exports = {
  setupSocketHandlers
};

