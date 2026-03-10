const express = require('express');
const jwt = require('jsonwebtoken');
const sql = require('mssql');
const { poolPromise, isDbConnected } = require('../config/db');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({ error: 'Database not connected. Please try again later.' });
    }

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const pool = await poolPromise;
    
    const result = await pool.request()
      .input('email', sql.VarChar, email)
      .query('SELECT * FROM sm19 WHERE sm19_17 = @email');

    if (result.recordset.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.recordset[0];

    if (user.sm19_12 !== password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.sm19_recid, email: user.sm19_17, name: user.sm19_5 },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.sm19_recid,
        email: user.sm19_17,
        name: user.sm19_5
      }
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login' });
  }
});

module.exports = router;
