const express = require('express');
const router = express.Router();

module.exports = (db, io) => {
  router.get('/', async (req, res) => {
    try {
      const epics = await db.getEpics();
      res.json(epics);
    } catch (error) {
      console.error('Get epics error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  router.post('/', async (req, res) => {
    try {
      const { name, pastilleColor } = req.body;
      const result = await db.createEpic(name, pastilleColor);
      const epic = await db.get('SELECT * FROM epics WHERE id = ?', [result.id]);
      
      await db.logActivity('epic_created', null, epic.id, `Created epic "${epic.name}"`);
      
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

  router.put('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const originalEpic = await db.get('SELECT * FROM epics WHERE id = ?', [id]);
      await db.updateEpic(id, updates);
      
      const epic = await db.get('SELECT * FROM epics WHERE id = ?', [id]);
      
      // Log activity for epic name changes
      if (updates.name && updates.name !== originalEpic.name) {
        await db.logActivity('epic_updated', null, id, `Updated epic "${epic.name}"`);
        const activity = await db.get('SELECT * FROM activity_log WHERE epic_id = ? ORDER BY timestamp DESC LIMIT 1', [id]);
        if (activity) {
          activity.timestamp = new Date(activity.timestamp).toISOString();
          io.emit('activity_created', activity);
        }
      }
      
      io.emit('epic_updated', epic);
      res.json(epic);
    } catch (error) {
      console.error('Update epic error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const epic = await db.getEpicById(id);
      await db.deleteEpic(id);
      
      await db.logActivity('epic_deleted', null, parseInt(id), `Deleted epic "${epic ? epic.name : 'Unknown'}"`);
      
      const activity = await db.get('SELECT * FROM activity_log WHERE epic_id = ? ORDER BY timestamp DESC LIMIT 1', [id]);
      if (activity) {
        activity.timestamp = new Date(activity.timestamp).toISOString();
        io.emit('activity_created', activity);
      }
      
      io.emit('epic_deleted', { id: parseInt(id) });
      res.json({ success: true });
    } catch (error) {
      console.error('Delete epic error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  return router;
};

