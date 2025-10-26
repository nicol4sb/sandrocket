const express = require('express');
const Database = require('../../database');

const router = express.Router();
const db = new Database();

// Get all epics
router.get('/', (req, res) => {
  db.getEpics((err, epics) => {
    if (err) {
      console.error('Error fetching epics:', err);
      res.status(500).json({ error: 'Failed to fetch epics' });
    } else {
      res.json(epics);
    }
  });
});

// Create new epic
router.post('/', async (req, res) => {
  const { name, pastilleColor, position } = req.body;
  
  if (!name || name.trim().length === 0) {
    return res.status(400).json({ error: 'Epic name is required' });
  }
  
  db.createEpic(name, pastilleColor || '#FF6B6B', position || 0, (err, epicId) => {
    if (err) {
      console.error('Error creating epic:', err);
      res.status(500).json({ error: 'Failed to create epic' });
    } else {
      // Log activity with more details
      db.logActivity(req.session.userId, 'epic_created', null, `Created epic "${name}" with color ${pastilleColor} at position ${position}`, () => {});
      
      // Broadcast to all connected clients
      req.app.get('io').emit('epic_created', { id: epicId, name, pastilleColor, position });
      
      res.json({ id: epicId, name, pastilleColor, position });
    }
  });
});

// Update epic
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, pastilleColor, position } = req.body;
  
  if (!name || name.trim().length === 0) {
    return res.status(400).json({ error: 'Epic name is required' });
  }
  
  db.updateEpic(id, name, pastilleColor, position, (err) => {
    if (err) {
      console.error('Error updating epic:', err);
      res.status(500).json({ error: 'Failed to update epic' });
    } else {
      // Log activity with more details
      db.logActivity(req.session.userId, 'epic_updated', null, `Updated epic "${name}" with color ${pastilleColor} at position ${position}`, () => {});
      
      // Broadcast to all connected clients
      req.app.get('io').emit('epic_updated', { id, name, pastilleColor, position });
      
      res.json({ success: true });
    }
  });
});

// Delete epic
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  
  // First, get epic name for logging
  db.getEpics((err, epics) => {
    if (err) {
      console.error('Error fetching epics for deletion:', err);
      return res.status(500).json({ error: 'Failed to delete epic' });
    }
    
    const epic = epics.find(e => e.id == id);
    const epicName = epic ? epic.name : 'Unknown';
    
    db.deleteEpic(id, (err) => {
      if (err) {
        console.error('Error deleting epic:', err);
        res.status(500).json({ error: 'Failed to delete epic' });
      } else {
        // Log activity
        db.logActivity(req.session.userId, 'epic_deleted', null, `Deleted epic "${epicName}"`, () => {});
        
        // Broadcast to all connected clients
        req.app.get('io').emit('epic_deleted', { id });
        
        res.json({ success: true });
      }
    });
  });
});

module.exports = router;
