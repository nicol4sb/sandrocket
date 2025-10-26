const express = require('express');
const Database = require('../../database');

const router = express.Router();
const db = new Database();

// Get activity log
router.get('/', (req, res) => {
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

module.exports = router;
