const express = require('express');
const Database = require('../../database');

const router = express.Router();
const db = new Database();

// Get all tasks
router.get('/', (req, res) => {
  db.getTasks((err, tasks) => {
    if (err) {
      console.error('Error fetching tasks:', err);
      res.status(500).json({ error: 'Failed to fetch tasks' });
    } else {
      res.json(tasks);
    }
  });
});

// Get completed tasks
router.get('/completed', (req, res) => {
  db.getCompletedTasks((err, tasks) => {
    if (err) {
      console.error('Error fetching completed tasks:', err);
      res.status(500).json({ error: 'Failed to fetch completed tasks' });
    } else {
      res.json(tasks);
    }
  });
});

// Create new task
router.post('/', async (req, res) => {
  const { epicId, content, position } = req.body;
  
  if (!epicId || !content || content.trim().length === 0) {
    return res.status(400).json({ error: 'Epic ID and content are required' });
  }
  
  if (content.length > 150) {
    return res.status(400).json({ error: 'Task content must be 1-150 characters' });
  }
  
  db.createTask(epicId, content, position || 0, (err, taskId) => {
    if (err) {
      console.error('Error creating task:', err);
      res.status(500).json({ error: 'Failed to create task' });
    } else {
      // Log activity with more details
      const epic = await new Promise((resolve, reject) => {
        db.getEpic(epicId, (err, epic) => {
          if (err) reject(err);
          else resolve(epic);
        });
      });
      const epicName = epic ? epic.name : 'Unknown Epic';
      db.logActivity(req.session.userId, 'task_created', taskId, `Created task "${content}" in epic "${epicName}"`, () => {});
      
      // Broadcast to all connected clients
      req.app.get('io').emit('task_created', { id: taskId, epicId, content, position });
      
      res.json({ id: taskId, epicId, content, position, isCompleted: false });
    }
  });
});

// Update task
router.put('/:id', async (req, res) => {
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
      // Log activity with more details
      const epic = await new Promise((resolve, reject) => {
        db.getEpic(epicId, (err, epic) => {
          if (err) reject(err);
          else resolve(epic);
        });
      });
      const epicName = epic ? epic.name : 'Unknown Epic';
      
      let action, details;
      if (isCompleted) {
        action = 'task_completed';
        details = `Completed task "${content}" in epic "${epicName}"`;
      } else {
        action = 'task_updated';
        details = `Updated task "${content}" in epic "${epicName}"`;
      }
      db.logActivity(req.session.userId, action, id, details, () => {});
      
      // Broadcast to all connected clients
      req.app.get('io').emit('task_updated', { id, epicId, content, position, isCompleted });
      
      res.json({ success: true });
    }
  });
});

// Update task position
router.put('/:id/position', async (req, res) => {
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
      // Log activity with more details
      const task = await new Promise((resolve, reject) => {
        db.getTasks((err, tasks) => {
          if (err) reject(err);
          else {
            const task = tasks.find(t => t.id == id);
            resolve(task);
          }
        });
      });
      
      const epic = await new Promise((resolve, reject) => {
        if (task) {
          db.getEpic(task.epic_id, (err, epic) => {
            if (err) reject(err);
            else resolve(epic);
          });
        } else {
          resolve(null);
        }
      });
      
      const epicName = epic ? epic.name : 'Unknown Epic';
      const taskContent = task ? task.content : 'Unknown Task';
      db.logActivity(req.session.userId, 'task_reordered', id, `Reordered task "${taskContent}" to position ${position} in epic "${epicName}"`, () => {});
      
      // Broadcast to all connected clients
      req.app.get('io').emit('task_position_updated', { id, position });
      
      res.json({ success: true });
    }
  });
});

// Delete task
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  
  // First, get task content and epic for detailed logging
  const task = await new Promise((resolve, reject) => {
    db.getTasks((err, tasks) => {
      if (err) reject(err);
      else {
        const task = tasks.find(t => t.id == id);
        resolve(task);
      }
    });
  });
  
  const epic = await new Promise((resolve, reject) => {
    if (task) {
      db.getEpic(task.epic_id, (err, epic) => {
        if (err) reject(err);
        else resolve(epic);
      });
    } else {
      resolve(null);
    }
  });
  
  const taskContent = task ? task.content : 'Unknown Task';
  const epicName = epic ? epic.name : 'Unknown Epic';
  
  db.deleteTask(id, (err) => {
    if (err) {
      console.error('Error deleting task:', err);
      res.status(500).json({ error: 'Failed to delete task' });
    } else {
      // Log activity with more details
      db.logActivity(req.session.userId, 'task_deleted', id, `Deleted task "${taskContent}" from epic "${epicName}"`, () => {});
      
      // Broadcast to all connected clients
      req.app.get('io').emit('task_deleted', { id });
      
      res.json({ success: true });
    }
  });
});

module.exports = router;
