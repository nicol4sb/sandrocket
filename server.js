const express = require('express');
const https = require('https');
const fs = require('fs');
const socketIo = require('socket.io');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const path = require('path');
const os = require('os');
const Database = require('./database');
const config = require('./src/config');
const { requireAuth } = require('./src/middleware/auth');
const authRoutes = require('./src/routes/auth');
const epicRoutes = require('./src/routes/epics');
const taskRoutes = require('./src/routes/tasks');
const activityRoutes = require('./src/routes/activity');
const setupSocket = require('./src/websocket/socketHandler');

const app = express();

// Load SSL certificates
const certPath = path.join(__dirname, 'cert.pem');
const keyPath = path.join(__dirname, 'key.pem');

if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
  console.error('❌ SSL certificates not found!');
  console.error('   Generate them with: openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes -config cert.conf');
  process.exit(1);
}

const sslOptions = {
  cert: fs.readFileSync(certPath),
  key: fs.readFileSync(keyPath)
};

const server = https.createServer(sslOptions, app);
const io = socketIo(server, {
  cors: config.cors
});

const db = new Database();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Rate limiting
const limiter = rateLimit(config.rateLimit);
app.use('/api/', limiter);

// Session middleware
app.use(session({
  ...config.sessionConfig,
  secret: config.sessionSecret
}));

// Initialize database
db.init().catch(console.error);

// Routes
app.use('/api/auth', authRoutes(db));
app.use('/api/epics', requireAuth, epicRoutes(db, io));
app.use('/api/tasks', requireAuth, taskRoutes(db, io));
const activityRouter = activityRoutes(db);
app.use('/api/activity', requireAuth, activityRouter);
app.use('/api/stats', requireAuth, activityRouter); // stats routes are in activity.js

// Serve main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// WebSocket setup
setupSocket(io);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Get local network IP
function getLocalIp() {
  const networkInterfaces = os.networkInterfaces();
  for (const interfaceName of Object.keys(networkInterfaces)) {
    for (const iface of networkInterfaces[interfaceName]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return null;
}

// Start server
server.listen(config.port, () => {
  const localIp = getLocalIp();
  
  console.log(`🚀 Sand Rocket server running on HTTPS port ${config.port}`);
  console.log(`📱 Local: https://localhost:${config.port}`);
  if (localIp) {
    console.log(`📱 Network: https://${localIp}:${config.port}`);
    console.log(`   (Accept the self-signed certificate warning on your phone)`);
  }
  console.log(`🔒 HTTPS enabled`);
  console.log(`🔑 Default password: rocket123`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down Sand Rocket server...');
  db.close();
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

module.exports = { app, server, io, db };
