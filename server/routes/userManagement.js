const express = require('express');
const router = express.Router();
const sql = require('mssql');
const { connectDB } = require('../config/db');
const bcrypt = require('bcryptjs');
const { protect } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

// Get all users for the current company
router.get('/', protect, async (req, res) => {
  try {
    const pool = await connectDB();
    
    // Get the company GUID of the current user
    const currentUser = await pool.request()
      .input('userId', sql.NVarChar(50), req.user.id)
      .query('SELECT sm19_unqid FROM users WHERE user_id = @userId');

    if (currentUser.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const companyUnqid = currentUser.recordset[0].sm19_unqid;

    const result = await pool.request()
      .input('companyUnqid', sql.NVarChar(50), companyUnqid)
      .query('SELECT user_id, email, full_name, role, phone, company_name FROM users WHERE sm19_unqid = @companyUnqid');
    
    res.json({ success: true, users: result.recordset });
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Add a new user for the company
router.post('/', protect, async (req, res) => {
  try {
    if (req.user.role !== 'MANAGER') {
      return res.status(403).json({ success: false, message: 'Only managers can add new users.' });
    }
    const { email, password, fullName, role, phone } = req.body;
    const pool = await connectDB();
    
    // Fetch creator's company details
    const creatorResult = await pool.request()
      .input('creatorId', sql.NVarChar(50), req.user.id)
      .query('SELECT sm19_unqid, sm19_acc_code, company_name, address, gstin, state FROM users WHERE user_id = @creatorId');
    
    if (creatorResult.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Creator not found' });
    }
    
    const creator = creatorResult.recordset[0];
    const hashedPassword = password;
    const userId = crypto.randomUUID();

    await pool.request()
      .input('userId', sql.UniqueIdentifier, userId)
      .input('sm19_unqid', sql.UniqueIdentifier, creator.sm19_unqid)
      .input('sm19_acc_code', sql.NVarChar(50), creator.sm19_acc_code)
      .input('company_name', sql.NVarChar(255), creator.company_name)
      .input('email', sql.NVarChar(100), email)
      .input('password', sql.NVarChar(255), hashedPassword)
      .input('fullName', sql.NVarChar(100), fullName)
      .input('role', sql.NVarChar(50), role)
      .input('phone', sql.NVarChar(20), phone)
      .input('address', sql.NVarChar(255), creator.address)
      .input('gstin', sql.NVarChar(50), creator.gstin)
      .input('state', sql.NVarChar(50), creator.state)
      .input('created_by', sql.NVarChar(50), req.user.name || 'SYSTEM')
      .input('created_at', sql.DateTime, new Date())
      .query(`INSERT INTO users (
                user_id, sm19_unqid, sm19_acc_code, company_name, full_name, email, 
                phone, password_hash, role, is_active, address, gstin, state, 
                created_by, created_at
              ) VALUES (
                @userId, @sm19_unqid, @sm19_acc_code, @company_name, @fullName, @email, 
                @phone, @password, @role, 1, @address, @gstin, @state, 
                @created_by, @created_at
              )`);
    
    res.json({ success: true, message: 'User added successfully' });
  } catch (err) {
    console.error('Error adding user:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
