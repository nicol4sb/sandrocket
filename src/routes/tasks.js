const express = require('express');
const router = express.Router();

module.exports = (db, io) => {
  router.post('/reorder', async (req, res) => {
    try {
      const { updates } = req.body;
      for (const update of updates) {
        await db.updateTask(update.id, { position: update.position });
      }
      res.json({ success: true });
    } catch (error) {
      console.error('Reorder tasks error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  router.get('/', async (req, res) => {
    try {
      const { epicId } = req.query;
      const tasks = await db.getTasks(epicId ? parseInt(epicId) : null);
      res.json(tasks);
    } catch (error) {
      console.error('Get tasks error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  router.post('/', async (req, res) => {
    try {
      const { epicId, content } = req.body;
      const result = await db.createTask(epicId, content);
      const task = await db.get('SELECT * FROM tasks WHERE id = ?', [result.id]);
      
      await db.logActivity('task_created', task.id, task.epic_id, `Task created: "${task.content.substring(0, 50)}${task.content.length > 50 ? '...' : ''}"`);
      
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

  router.put('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const originalTask = await db.getTaskById(id);
      await db.updateTask(id, updates);
      const updatedTask = await db.get('SELECT * FROM tasks WHERE id = ?', [id]);
      
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

  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const task = await db.getTaskById(id);
      await db.deleteTask(id);
      
      await db.logActivity('task_deleted', parseInt(id), task ? task.epic_id : null, `Task deleted: "${task ? task.content.substring(0, 50) + (task.content.length > 50 ? '...' : '') : 'Unknown'}"`);
      
      io.emit('task_deleted', { id: parseInt(id) });
      res.json({ success: true });
    } catch (error) {
      console.error('Delete task error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  router.post('/:id/complete', async (req, res) => {
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

  router.post('/:id/reopen', async (req, res) => {
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

  router.get('/completed', async (req, res) => {
    try {
      const tasks = await db.getCompletedTasks();
      res.json(tasks);
    } catch (error) {
      console.error('Get completed tasks error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  return router;
};

