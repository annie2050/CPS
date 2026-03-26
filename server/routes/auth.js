const express = require('express');
const jwt = require('jsonwebtoken');
const sql = require('mssql');
const { connectDB } = require('../config/db');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'kjfawgefawgefgwuet7wefweyu7ew7fte7tf';

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const pool = await connectDB();
    
    const result = await pool.request()
      .input('email', sql.VarChar, email)
      .query('SELECT unqid AS id, sm19_17 AS email, sm19_5 AS name, sm19_12 AS password FROM sm19 WHERE sm19_17 = @email');

    if (result.recordset.length === 0) {
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

router.put('/change-password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const pool = await connectDB();
    
    const userResult = await pool.request()
      .input('userId', sql.NVarChar(50), decoded.id)
      .query('SELECT sm19_12 AS password FROM sm19 WHERE unqid = @userId');

    if (userResult.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (userResult.recordset[0].password !== currentPassword) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    await pool.request()
      .input('userId', sql.NVarChar(50), decoded.id)
      .input('newPassword', sql.VarChar, newPassword)
      .query('UPDATE sm19 SET sm19_12 = @newPassword WHERE unqid = @userId');

    return res.json({ success: true, message: 'Password changed successfully' });

  } catch (err) {
    console.error('Change password error:', err);
    return res.status(500).json({ success: false, message: 'Failed to change password' });
  }
});

module.exports = router;
