const express = require('express');
const jwt = require('jsonwebtoken');
const sql = require('mssql');
const { poolPromise, isDbConnected } = require('../config/db');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    console.log('Login attempt:', req.body?.email);
    
    if (!isDbConnected()) {
      console.error('Database not connected during login');
      return res.status(503).json({ error: 'Database not connected. Please try again later.' });
    }

    const pool = await poolPromise;
    if (!pool) {
      console.error('Pool is null during login');
      return res.status(503).json({ error: 'Database connection unavailable.' });
    }

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    const result = await pool.request()
      .input('email', sql.VarChar, email)
      .query(`
        SELECT
          unqid AS id,
          sm19_17 AS email,
          sm19_5  AS name,
          sm19_12 AS password
        FROM sm19
        WHERE sm19_17 = @email
      `);

    if (result.recordset.length === 0) {
      console.log('No user found for email:', email);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.recordset[0];

    if (user.password !== password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('Login successful for:', email);
    return res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });

  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Server error during login' });
  }
});

module.exports = router;
