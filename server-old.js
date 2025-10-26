const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const Database = require('./database');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;
const db = new Database();

// Middleware
app.use(helmet({
  contentSecurityPolicy: false // Disable for development
}));
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
app.use(session({
  secret: 'sand-rocket-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, // Set to true in production with HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Authentication middleware
const requireAuth = (req, res, next) => {
  if (req.session.authenticated) {
    next();
  } else {
    res.status(401).json({ error: 'Authentication required' });
  }
};

// API Routes

// Authentication
app.post('/api/auth/login', async (req, res) => {
  const { password } = req.body;
  
  try {
    const storedHash = await new Promise((resolve, reject) => {
      db.getConfig('password_hash', (err, hash) => {
        if (err) reject(err);
        else resolve(hash);
      });
    });

    if (!storedHash) {
      // First time setup - create default password
      const defaultPassword = 'rocket123';
      const hash = await bcrypt.hash(defaultPassword, 10);
      await new Promise((resolve, reject) => {
        db.setConfig('password_hash', hash, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      
      const isValid = await bcrypt.compare(password, hash);
      if (isValid) {
        req.session.authenticated = true;
        req.session.userId = 'user_' + Date.now();
        res.json({ success: true, message: 'Logged in successfully' });
      } else {
        res.status(401).json({ error: 'Invalid password' });
      }
    } else {
      const isValid = await bcrypt.compare(password, storedHash);
      if (isValid) {
        req.session.authenticated = true;
        req.session.userId = 'user_' + Date.now();
        res.json({ success: true, message: 'Logged in successfully' });
      } else {
        res.status(401).json({ error: 'Invalid password' });
      }
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true, message: 'Logged out successfully' });
});

app.get('/api/auth/status', (req, res) => {
  res.json({ authenticated: !!req.session.authenticated });
});

// Epics
app.get('/api/epics', requireAuth, (req, res) => {
  db.getEpics((err, epics) => {
    if (err) {
      console.error('Error fetching epics:', err);
      res.status(500).json({ error: 'Failed to fetch epics' });
    } else {
      res.json(epics);
    }
  });
});

app.post('/api/epics', requireAuth, (req, res) => {
  const { name, pastilleColor, position } = req.body;
  
  db.createEpic(name, pastilleColor || '#FF6B6B', position || 0, (err, epicId) => {
    if (err) {
      console.error('Error creating epic:', err);
      res.status(500).json({ error: 'Failed to create epic' });
    } else {
      // Log activity
      db.logActivity(req.session.userId, 'epic_created', null, `Created epic "${name}"`, () => {});
      
      // Broadcast to all connected clients
      io.emit('epic_created', { id: epicId, name, pastilleColor, position });
      
      res.json({ id: epicId, name, pastilleColor, position });
    }
  });
});

app.put('/api/epics/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const { name, pastilleColor, position } = req.body;
  
  db.updateEpic(id, name, pastilleColor, position, (err) => {
    if (err) {
      console.error('Error updating epic:', err);
      res.status(500).json({ error: 'Failed to update epic' });
    } else {
      // Log activity
      db.logActivity(req.session.userId, 'epic_updated', null, `Updated epic "${name}"`, () => {});
      
      // Broadcast to all connected clients
      io.emit('epic_updated', { id, name, pastilleColor, position });
      
      res.json({ success: true });
    }
  });
});

app.delete('/api/epics/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  
  db.deleteEpic(id, (err) => {
    if (err) {
      console.error('Error deleting epic:', err);
      res.status(500).json({ error: 'Failed to delete epic' });
    } else {
      // Log activity
      db.logActivity(req.session.userId, 'epic_deleted', null, `Deleted epic`, () => {});
      
      // Broadcast to all connected clients
      io.emit('epic_deleted', { id });
      
      res.json({ success: true });
    }
  });
});

// Tasks
app.get('/api/tasks', requireAuth, (req, res) => {
  db.getTasks((err, tasks) => {
    if (err) {
      console.error('Error fetching tasks:', err);
      res.status(500).json({ error: 'Failed to fetch tasks' });
    } else {
      res.json(tasks);
    }
  });
});

app.post('/api/tasks', requireAuth, (req, res) => {
  const { epicId, content, position } = req.body;
  
  if (!content || content.length > 150) {
    return res.status(400).json({ error: 'Task content must be 1-150 characters' });
  }
  
  db.createTask(epicId, content, position || 0, (err, taskId) => {
    if (err) {
      console.error('Error creating task:', err);
      res.status(500).json({ error: 'Failed to create task' });
    } else {
      // Log activity
      db.logActivity(req.session.userId, 'task_created', taskId, `Created task "${content}"`, () => {});
      
      // Broadcast to all connected clients
      io.emit('task_created', { id: taskId, epicId, content, position });
      
      res.json({ id: taskId, epicId, content, position, isCompleted: false });
    }
  });
});

app.put('/api/tasks/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const { epicId, content, position, isCompleted } = req.body;
  
  if (content && content.length > 150) {
    return res.status(400).json({ error: 'Task content must be 1-150 characters' });
  }
  
  db.updateTask(id, epicId, content, position, isCompleted, (err) => {
    if (err) {
      console.error('Error updating task:', err);
      res.status(500).json({ error: 'Failed to update task' });
    } else {
      // Log activity
      const action = isCompleted ? 'task_completed' : 'task_updated';
      const details = isCompleted ? `Completed task "${content}"` : `Updated task "${content}"`;
      db.logActivity(req.session.userId, action, id, details, () => {});
      
      // Broadcast to all connected clients
      io.emit('task_updated', { id, epicId, content, position, isCompleted });
      
      res.json({ success: true });
    }
  });
});

app.put('/api/tasks/:id/position', requireAuth, (req, res) => {
  const { id } = req.params;
  const { position } = req.body;
  
  if (typeof position !== 'number' || position < 0) {
    return res.status(400).json({ error: 'Invalid position value' });
  }
  
  db.updateTaskPosition(id, position, (err) => {
    if (err) {
      console.error('Error updating task position:', err);
      res.status(500).json({ error: 'Failed to update task position' });
    } else {
      // Log activity
      db.logActivity(req.session.userId, 'task_reordered', id, `Reordered task to position ${position}`, () => {});
      
      // Broadcast to all connected clients
      io.emit('task_position_updated', { id, position });
      
      res.json({ success: true });
    }
  });
});

app.delete('/api/tasks/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  
  db.deleteTask(id, (err) => {
    if (err) {
      console.error('Error deleting task:', err);
      res.status(500).json({ error: 'Failed to delete task' });
    } else {
      // Log activity
      db.logActivity(req.session.userId, 'task_deleted', id, 'Deleted task', () => {});
      
      // Broadcast to all connected clients
      io.emit('task_deleted', { id });
      
      res.json({ success: true });
    }
  });
});

// Activity log
app.get('/api/activity', requireAuth, (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  
  db.getActivityLog(limit, (err, activities) => {
    if (err) {
      console.error('Error fetching activity log:', err);
      res.status(500).json({ error: 'Failed to fetch activity log' });
    } else {
      res.json(activities);
    }
  });
});

// Serve the main app
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
  
  // Join a room for real-time updates
  socket.on('join_workspace', () => {
    socket.join('workspace');
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Sand Rocket server running on port ${PORT}`);
  console.log(`📱 Open http://localhost:${PORT} to access the app`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down Sand Rocket server...');
  db.close();
  server.close(() => {
    console.log('✅ Server closed successfully');
    process.exit(0);
  });
});
