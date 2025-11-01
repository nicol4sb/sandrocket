const express = require('express');
const router = express.Router();

module.exports = (db, io) => {
  router.post('/reorder', async (req, res) => {
    try {
      const { updates, movedTaskId, oldEpicId, newEpicId, oldPosition, newPosition } = req.body;
      
      // If epic_id needs to change, update it first (before positions)
      if (movedTaskId && oldEpicId !== undefined && newEpicId !== undefined && oldEpicId !== newEpicId) {
        await db.updateTask(movedTaskId, { epic_id: newEpicId }, false); // Don't log - we'll log below
      }
      
      // If this is a move with position info, log it properly
      if (movedTaskId && oldEpicId !== undefined && newEpicId !== undefined) {
        const task = await db.getTaskById(movedTaskId);
        if (task) {
          const oldEpic = oldEpicId ? await db.get('SELECT name FROM epics WHERE id = ?', [oldEpicId]) : null;
          const newEpic = newEpicId ? await db.get('SELECT name FROM epics WHERE id = ?', [newEpicId]) : null;
          
          const taskContent = task.content.length > 50 ? task.content.substring(0, 50) + '...' : task.content;
          let activityMessage = '';
          
          const oldPos = oldPosition !== undefined ? oldPosition + 1 : null; // Convert to 1-based for display
          const newPos = newPosition !== undefined ? newPosition + 1 : null; // Convert to 1-based for display
          
          if (oldEpicId !== newEpicId) {
            // Epic changed - always log this
            if (oldPos !== null && newPos !== null) {
              activityMessage = `Moved task "${taskContent}" from "${oldEpic?.name || 'Unknown'}" (position ${oldPos}) to "${newEpic?.name || 'Unknown'}" (position ${newPos})`;
            } else {
              activityMessage = `Moved task "${taskContent}" from "${oldEpic?.name || 'Unknown'}" to "${newEpic?.name || 'Unknown'}"`;
            }
          } else if (oldPos !== null && newPos !== null && oldPos !== newPos) {
            // Same epic, position changed - only log if position actually changed
            activityMessage = `Moved task "${taskContent}" from position ${oldPos} to position ${newPos} in "${newEpic?.name || 'Unknown'}"`;
          }
          
          if (activityMessage) {
            // Check if we already logged this exact move recently (prevent duplicate logs)
            const recentActivity = await db.get(
              'SELECT * FROM activity_log WHERE task_id = ? AND action_type = ? AND details = ? ORDER BY timestamp DESC LIMIT 1',
              [movedTaskId, 'task_updated', activityMessage]
            );
            
            // Only log if this exact message wasn't logged in the last 2 seconds
            if (!recentActivity || (new Date() - new Date(recentActivity.timestamp)) > 2000) {
              await db.logActivity('task_updated', movedTaskId, newEpicId, activityMessage);
              const activity = await db.get('SELECT * FROM activity_log WHERE task_id = ? ORDER BY timestamp DESC LIMIT 1', [movedTaskId]);
              if (activity) {
                activity.timestamp = new Date(activity.timestamp).toISOString();
                io.emit('activity_created', activity);
              }
            }
          }
        }
      }
      
      // Update all task positions (don't log individual position changes)
      for (const update of updates) {
        await db.updateTask(update.id, { position: update.position }, false); // false = don't log activity
      }
      
      io.emit('tasks_reordered', { updates });
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
      
      const taskContent = task.content.length > 50 ? task.content.substring(0, 50) + '...' : task.content;
      await db.logActivity('task_created', task.id, task.epic_id, `Created task "${taskContent}"`);
      
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
      // Don't log automatically - we'll log manually below with proper messages
      await db.updateTask(id, updates, false);
      const updatedTask = await db.get('SELECT * FROM tasks WHERE id = ?', [id]);
      
      let activityMessage = '';
      const taskContent = originalTask.content.length > 50 ? originalTask.content.substring(0, 50) + '...' : originalTask.content;
      
      // Check if this is a position-only update - skip logging (handled by reorder endpoint)
      const isPositionOnly = Object.keys(updates).length === 1 && updates.position !== undefined;
      if (isPositionOnly) {
        activityMessage = null;
      } else if (updates.content && updates.content !== originalTask.content) {
        const oldContent = originalTask.content.length > 30 ? originalTask.content.substring(0, 30) + '...' : originalTask.content;
        const newContent = updates.content.length > 30 ? updates.content.substring(0, 30) + '...' : updates.content;
        activityMessage = `Edited task "${oldContent}" → "${newContent}"`;
      } else if (updates.epic_id && updates.epic_id !== originalTask.epic_id) {
        // Epic change without position - if position also changes, it will be logged by reorder endpoint
        // Only log here if position isn't being updated (which would be handled by reorder)
        if (!updates.position) {
          const oldEpic = await db.get('SELECT name FROM epics WHERE id = ?', [originalTask.epic_id]);
          const newEpic = await db.get('SELECT name FROM epics WHERE id = ?', [updates.epic_id]);
          activityMessage = `Moved task "${taskContent}" from "${oldEpic?.name || 'Unknown'}" to "${newEpic?.name || 'Unknown'}"`;
        } else {
          // Position will be logged by reorder endpoint, skip here
          activityMessage = null;
        }
      } else if (updates.is_completed !== undefined && updates.is_completed !== originalTask.is_completed) {
        activityMessage = updates.is_completed ? 
          `Completed task "${taskContent}"` :
          `Reopened task "${taskContent}"`;
      } else {
        // Other updates (not position-only, not content, not epic, not completion)
        activityMessage = `Updated task "${taskContent}"`;
      }
      
      if (activityMessage) {
        await db.logActivity('task_updated', id, updatedTask.epic_id, activityMessage);
      }
      
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
      
      const taskContent = task && task.content ? (task.content.length > 50 ? task.content.substring(0, 50) + '...' : task.content) : 'Unknown';
      await db.logActivity('task_deleted', parseInt(id), task ? task.epic_id : null, `Deleted task "${taskContent}"`);
      
      const activity = await db.get('SELECT * FROM activity_log WHERE task_id = ? ORDER BY timestamp DESC LIMIT 1', [parseInt(id)]);
      if (activity) {
        activity.timestamp = new Date(activity.timestamp).toISOString();
        io.emit('activity_created', activity);
      }
      
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
      const originalTask = await db.getTaskById(id);
      await db.completeTask(id);
      const task = await db.get('SELECT * FROM tasks WHERE id = ?', [id]);
      
      const taskContent = originalTask.content.length > 50 ? originalTask.content.substring(0, 50) + '...' : originalTask.content;
      await db.logActivity('task_updated', id, task.epic_id, `Completed task "${taskContent}"`);
      
      const activity = await db.get('SELECT * FROM activity_log WHERE task_id = ? ORDER BY timestamp DESC LIMIT 1', [id]);
      if (activity) {
        activity.timestamp = new Date(activity.timestamp).toISOString();
        io.emit('activity_created', activity);
      }
      
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
      const originalTask = await db.getTaskById(id);
      await db.reopenTask(id);
      const task = await db.get('SELECT * FROM tasks WHERE id = ?', [id]);
      
      const taskContent = originalTask.content.length > 50 ? originalTask.content.substring(0, 50) + '...' : originalTask.content;
      await db.logActivity('task_updated', id, task.epic_id, `Reopened task "${taskContent}"`);
      
      const activity = await db.get('SELECT * FROM activity_log WHERE task_id = ? ORDER BY timestamp DESC LIMIT 1', [id]);
      if (activity) {
        activity.timestamp = new Date(activity.timestamp).toISOString();
        io.emit('activity_created', activity);
      }
      
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

