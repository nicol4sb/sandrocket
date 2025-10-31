const express = require('express');
const router = express.Router();

module.exports = (db) => {
  router.post('/login', async (req, res) => {
    try {
      const { passwordHash } = req.body;
      
      if (!passwordHash) {
        return res.status(400).json({ error: 'Password hash required' });
      }
      
      const isValid = await db.verifyPasswordHash(passwordHash);
      
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

  router.post('/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
  });

  router.get('/status', (req, res) => {
    res.json({ authenticated: !!req.session.authenticated });
  });

  return router;
};

