const express = require('express');
const jwt = require('jsonwebtoken');
const sql = require('mssql');
const { connectDB } = require('../config/db');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'kjfawgefawgefgwuet7wefweyu7ew7fte7tf';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh_secret_example_please_change';

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const pool = await connectDB();
    
    const result = await pool.request()
      .input('email', sql.VarChar, email)
      .query('SELECT user_id AS id, email, full_name AS name, company_name, sm19_unqid, role, password_hash AS password FROM users WHERE email = @email AND is_active = 1');

    if (result.recordset.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.recordset[0];

    const isMatch = (password === user.password);

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Create access and refresh tokens
    const accessToken = jwt.sign(
      { id: user.id, email: user.email, name: user.name, company: user.company_name, sm19_unqid: user.sm19_unqid, role: user.role },
      JWT_SECRET,
      { expiresIn: '15m' }
    );
    const refreshToken = jwt.sign(
      { id: user.id, email: user.email, name: user.name, company: user.company_name, sm19_unqid: user.sm19_unqid, role: user.role },
      JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    // Persist refresh token as HttpOnly cookie
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // true in production
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({
      message: 'Login successful',
      token: accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        company: user.company_name,
        sm19_unqid: user.sm19_unqid,
        role: user.role
      }
    });

  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Server error during login' });
  }
});

// Refresh access token
router.post('/refresh', (req, res) => {
  try {
    const refreshToken = req.cookies?.refresh_token;
    if (!refreshToken) {
      return res.status(401).json({ error: 'No refresh token' });
    }
    const payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    // Rotate refresh token as part of refresh flow
    const newRefresh = jwt.sign(
      { id: payload.id, email: payload.email, name: payload.name, company: payload.company },
      JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );
    // Send new refresh token cookie (rotate)
    res.cookie('refresh_token', newRefresh, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const newAccess = jwt.sign(
      { id: payload.id, email: payload.email, name: payload.name, company: payload.company },
      JWT_SECRET,
      { expiresIn: '15m' }
    );
    return res.json({ token: newAccess });
  } catch (err) {
      console.error('Refresh token error:', err.message);
      // User-friendly message for expired/invalid session
      return res.status(401).json({ error: 'you have logged out , please try again' });
    }
});

// Logout: clear refresh token cookie
router.post('/logout', (req, res) => {
  res.clearCookie('refresh_token');
  return res.json({ message: 'Logged out' });
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
      .query('SELECT password_hash AS password FROM users WHERE user_id = @userId');

    if (userResult.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isMatch = (currentPassword === userResult.recordset[0].password);

    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    const hashedNewPassword = newPassword;

    await pool.request()
      .input('userId', sql.NVarChar(50), decoded.id)
      .input('newPassword', sql.VarChar, hashedNewPassword)
      .query('UPDATE users SET password_hash = @newPassword WHERE user_id = @userId');

    return res.json({ success: true, message: 'Password changed successfully' });

  } catch (err) {
    console.error('Change password error:', err);
    return res.status(500).json({ success: false, message: 'Failed to change password' });
  }
});

module.exports = router;
