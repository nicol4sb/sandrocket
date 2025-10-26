const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const session = require('express-session');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

// Import configuration
const config = require('./config');

// Import middleware
const { requireAuth } = require('./middleware/auth');

// Import routes
const authRoutes = require('./routes/auth');
const epicRoutes = require('./routes/epics');
const taskRoutes = require('./routes/tasks');
const activityRoutes = require('./routes/activity');

// Import WebSocket handler
const { setupSocketHandlers } = require('./websocket/socketHandler');

// Create Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: config.cors
});

// Make io available to routes
app.set('io', io);

// Middleware
app.use(helmet(config.helmet));
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Session configuration
app.use(session(config.session));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/epics', requireAuth, epicRoutes);
app.use('/api/tasks', requireAuth, taskRoutes);
app.use('/api/activity', requireAuth, activityRoutes);

// Serve main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Setup WebSocket handlers
setupSocketHandlers(io);

// Start server
const startServer = () => {
  server.listen(config.port, () => {
    console.log(`🚀 Sand Rocket server running on port ${config.port}`);
    console.log(`📱 Open http://localhost:${config.port} to access the app`);
  });
};

module.exports = { app, server, startServer };

