const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
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
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs (relaxed for development)
  message: {
    error: 'Too many requests, please try again later'
  }
});
app.use('/api/', limiter);

// Session middleware
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

// Initialize database
db.init().catch(console.error);

// Authentication routes
app.post('/api/auth/login', async (req, res) => {
  try {
    const { password } = req.body;
    const isValid = await db.verifyPassword(password);
    
    if (isValid) {
      req.session.authenticated = true;
      res.json({ success: true });
    } else {
      res.status(401).json({ error: 'Invalid password' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

app.get('/api/auth/status', (req, res) => {
  res.json({ authenticated: !!req.session.authenticated });
});

// Epic routes
app.get('/api/epics', requireAuth, async (req, res) => {
  try {
    const epics = await db.getEpics();
    res.json(epics);
  } catch (error) {
    console.error('Get epics error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/epics', requireAuth, async (req, res) => {
  try {
    const { name, pastilleColor } = req.body;
    const result = await db.createEpic(name, pastilleColor);
    const epic = await db.get('SELECT * FROM epics WHERE id = ?', [result.id]);
    
    // Log epic creation
    await db.logActivity('epic_created', null, epic.id, `Epic created: ${epic.name}`);
    
    // Get the activity log entry for real-time update
    const activity = await db.get('SELECT * FROM activity_log WHERE epic_id = ? ORDER BY timestamp DESC LIMIT 1', [epic.id]);
    if (activity) {
      activity.timestamp = new Date(activity.timestamp).toISOString();
      io.emit('activity_created', activity);
    }
    
    io.emit('epic_created', epic);
    res.json(epic);
  } catch (error) {
    console.error('Create epic error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/epics/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    await db.updateEpic(id, updates);
    
    const epic = await db.get('SELECT * FROM epics WHERE id = ?', [id]);
    io.emit('epic_updated', epic);
    res.json(epic);
  } catch (error) {
    console.error('Update epic error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/epics/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get epic info before deletion for activity log
    const epic = await db.getEpicById(id);
    await db.deleteEpic(id);
    
    // Log epic deletion
    await db.logActivity('epic_deleted', null, parseInt(id), `Deleted epic: ${epic ? epic.name : 'Unknown'}`);
    
    io.emit('epic_deleted', { id: parseInt(id) });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete epic error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/tasks/reorder', requireAuth, async (req, res) => {
  try {
    const { updates } = req.body;
    
    // Update all task positions in a transaction
    for (const update of updates) {
      await db.updateTask(update.id, { position: update.position });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Reorder tasks error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Task routes
app.get('/api/tasks', requireAuth, async (req, res) => {
  try {
    const { epicId } = req.query;
    const tasks = await db.getTasks(epicId ? parseInt(epicId) : null);
    res.json(tasks);
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/tasks', requireAuth, async (req, res) => {
  try {
    const { epicId, content } = req.body;
    const result = await db.createTask(epicId, content);
    const task = await db.get('SELECT * FROM tasks WHERE id = ?', [result.id]);
    
    // Log task creation
    await db.logActivity('task_created', task.id, task.epic_id, `Task created: "${task.content.substring(0, 50)}${task.content.length > 50 ? '...' : ''}"`);
    
    // Get the activity log entry for real-time update
    const activity = await db.get('SELECT * FROM activity_log WHERE task_id = ? ORDER BY timestamp DESC LIMIT 1', [task.id]);
    if (activity) {
      activity.timestamp = new Date(activity.timestamp).toISOString();
      io.emit('activity_created', activity);
    }
    
    io.emit('task_created', task);
    res.json(task);
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/tasks/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Get the original task for comparison
    const originalTask = await db.getTaskById(id);
    await db.updateTask(id, updates);
    
    const updatedTask = await db.get('SELECT * FROM tasks WHERE id = ?', [id]);
    
    // Log specific activity based on what changed
    let activityMessage = '';
    if (updates.content && updates.content !== originalTask.content) {
      activityMessage = `Task edited: "${originalTask.content.substring(0, 30)}${originalTask.content.length > 30 ? '...' : ''}" → "${updates.content.substring(0, 30)}${updates.content.length > 30 ? '...' : ''}"`;
    } else if (updates.epic_id && updates.epic_id !== originalTask.epic_id) {
      const oldEpic = await db.get('SELECT name FROM epics WHERE id = ?', [originalTask.epic_id]);
      const newEpic = await db.get('SELECT name FROM epics WHERE id = ?', [updates.epic_id]);
      activityMessage = `Task moved: "${originalTask.content.substring(0, 30)}${originalTask.content.length > 30 ? '...' : ''}" from "${oldEpic?.name || 'Unknown'}" to "${newEpic?.name || 'Unknown'}"`;
    } else if (updates.is_completed !== undefined && updates.is_completed !== originalTask.is_completed) {
      activityMessage = updates.is_completed ? 
        `Task completed: "${originalTask.content.substring(0, 50)}${originalTask.content.length > 50 ? '...' : ''}"` :
        `Task reopened: "${originalTask.content.substring(0, 50)}${originalTask.content.length > 50 ? '...' : ''}"`;
    } else {
      activityMessage = `Task updated: "${originalTask.content.substring(0, 50)}${originalTask.content.length > 50 ? '...' : ''}"`;
    }
    
    await db.logActivity('task_updated', id, updatedTask.epic_id, activityMessage);
    
    // Get the activity log entry for real-time update
    const activity = await db.get('SELECT * FROM activity_log WHERE task_id = ? ORDER BY timestamp DESC LIMIT 1', [id]);
    if (activity) {
      activity.timestamp = new Date(activity.timestamp).toISOString();
      io.emit('activity_created', activity);
    }
    
    io.emit('task_updated', updatedTask);
    res.json(updatedTask);
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/tasks/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get task info before deletion for activity log
    const task = await db.getTaskById(id);
    await db.deleteTask(id);
    
    // Log task deletion
    await db.logActivity('task_deleted', parseInt(id), task ? task.epic_id : null, `Task deleted: "${task ? task.content.substring(0, 50) + (task.content.length > 50 ? '...' : '') : 'Unknown'}"`);
    
    io.emit('task_deleted', { id: parseInt(id) });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/tasks/:id/complete', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await db.completeTask(id);
    
    const task = await db.get('SELECT * FROM tasks WHERE id = ?', [id]);
    io.emit('task_completed', task);
    res.json(task);
  } catch (error) {
    console.error('Complete task error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/tasks/:id/reopen', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await db.reopenTask(id);
    
    const task = await db.get('SELECT * FROM tasks WHERE id = ?', [id]);
    io.emit('task_reopened', task);
    res.json(task);
  } catch (error) {
    console.error('Reopen task error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/tasks/completed', requireAuth, async (req, res) => {
  try {
    const tasks = await db.getCompletedTasks();
    res.json(tasks);
  } catch (error) {
    console.error('Get completed tasks error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Activity log routes
app.get('/api/activity', requireAuth, async (req, res) => {
  try {
    const { limit } = req.query;
    const activities = await db.getActivityLog(limit ? parseInt(limit) : 50);
    
    // Convert timestamps to ISO format for proper timezone handling
    const activitiesWithISO = activities.map(activity => ({
      ...activity,
      timestamp: new Date(activity.timestamp).toISOString()
    }));
    
    res.json(activitiesWithISO);
  } catch (error) {
    console.error('Get activity error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/stats/weekly', requireAuth, async (req, res) => {
  try {
    const stats = await db.getWeeklyStats();
    res.json(stats);
  } catch (error) {
    console.error('Get weekly stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Serve main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
  
  // Join room for real-time updates
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
  console.log(`📱 Open your browser to http://localhost:${PORT}`);
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
