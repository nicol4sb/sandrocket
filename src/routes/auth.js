const express = require('express');
const bcrypt = require('bcryptjs');
const Database = require('../../database');

const router = express.Router();
const db = new Database();

// Login endpoint
router.post('/login', async (req, res) => {
  const { password } = req.body;
  
  if (!password) {
    return res.status(400).json({ error: 'Password is required' });
  }
  
  try {
    // Get stored password hash
    db.getConfig('password_hash', (err, result) => {
      if (err) {
        console.error('Error getting password hash:', err);
        return res.status(500).json({ error: 'Server error' });
      }
      
      if (!result) {
        // First time setup - create default password
        const defaultPassword = 'rocket123';
        bcrypt.hash(defaultPassword, 10, (err, hash) => {
          if (err) {
            console.error('Error hashing password:', err);
            return res.status(500).json({ error: 'Server error' });
          }
          
          db.setConfig('password_hash', hash, (err) => {
            if (err) {
              console.error('Error setting password hash:', err);
              return res.status(500).json({ error: 'Server error' });
            }
            
            // Check if password matches default
            if (password === defaultPassword) {
              req.session.authenticated = true;
              req.session.userId = 'default-user';
              res.json({ success: true, message: 'Logged in successfully' });
            } else {
              res.status(401).json({ error: 'Invalid password' });
            }
          });
        });
      } else {
        // Check password against stored hash
        bcrypt.compare(password, result, (err, isMatch) => {
          if (err) {
            console.error('Error comparing password:', err);
            return res.status(500).json({ error: 'Server error' });
          }
          
          if (isMatch) {
            req.session.authenticated = true;
            req.session.userId = 'default-user';
            res.json({ success: true, message: 'Logged in successfully' });
          } else {
            res.status(401).json({ error: 'Invalid password' });
          }
        });
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Logout endpoint
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ error: 'Server error' });
    }
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

// Auth status endpoint
router.get('/status', (req, res) => {
  res.json({ 
    authenticated: !!req.session.authenticated,
    userId: req.session.userId 
  });
});

module.exports = router;
