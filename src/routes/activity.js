const express = require('express');
const router = express.Router();

module.exports = (db) => {
  router.get('/', async (req, res) => {
    try {
      const { limit } = req.query;
      const activities = await db.getActivityLog(limit ? parseInt(limit) : 50);
      
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

  router.get('/weekly', async (req, res) => {
    try {
      const stats = await db.getWeeklyStats();
      res.json(stats);
    } catch (error) {
      console.error('Get weekly stats error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  return router;
};

