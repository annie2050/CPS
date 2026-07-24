const express = require('express');
const router = express.Router();
const sql = require('mssql');
const { connectDB } = require('../config/db');
const { protect } = require('../middleware/auth');
const crypto = require('crypto');
const { canManage, canManageAny } = require('../utils/roles');

// Get all users for the current company
router.get('/', protect, async (req, res) => {
  try {
    const pool = await connectDB();

    const currentUser = await pool.request()
      .input('userId', sql.NVarChar(50), req.user.id)
      .query('SELECT sm19_unqid FROM users WHERE user_id = @userId');

    if (currentUser.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const companyUnqid = currentUser.recordset[0].sm19_unqid;

    const result = await pool.request()
      .input('companyUnqid', sql.NVarChar(50), companyUnqid)
      .query('SELECT user_id, email, full_name, role, phone, company_name, is_active FROM users WHERE sm19_unqid = @companyUnqid');

    const users = result.recordset.map(u => ({
      ...u,
      manageable: canManage(req.user.role, u.role),
    }));

    res.json({ success: true, users });
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Add a new user for the company
router.post('/', protect, async (req, res) => {
  try {
    if (!canManageAny(req.user.role)) {
      return res.status(403).json({ success: false, message: 'You do not have permission to add users.' });
    }

    const { email, password, fullName, role, phone } = req.body;

    if (!canManage(req.user.role, role)) {
      return res.status(403).json({ success: false, message: `You cannot create a user with role ${role}.` });
    }

    const pool = await connectDB();

    const creatorResult = await pool.request()
      .input('creatorId', sql.NVarChar(50), req.user.id)
      .query('SELECT sm19_unqid, sm19_acc_code, company_name, address, gstin, state FROM users WHERE user_id = @creatorId');

    if (creatorResult.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Creator not found' });
    }

    const creator = creatorResult.recordset[0];
    const userId = crypto.randomUUID();

    await pool.request()
      .input('userId', sql.UniqueIdentifier, userId)
      .input('sm19_unqid', sql.UniqueIdentifier, creator.sm19_unqid)
      .input('sm19_acc_code', sql.NVarChar(50), creator.sm19_acc_code)
      .input('company_name', sql.NVarChar(255), creator.company_name)
      .input('email', sql.NVarChar(100), email)
      .input('password', sql.NVarChar(255), password)
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

// Update a user
router.put('/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, email, phone, role } = req.body;

    const pool = await connectDB();

    const targetResult = await pool.request()
      .input('userId', sql.NVarChar(50), id)
      .query('SELECT role, sm19_unqid FROM users WHERE user_id = @userId');

    if (targetResult.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const target = targetResult.recordset[0];

    const currentUserCompany = await pool.request()
      .input('userId', sql.NVarChar(50), req.user.id)
      .query('SELECT sm19_unqid FROM users WHERE user_id = @userId');

    if (currentUserCompany.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Current user not found' });
    }

    if (currentUserCompany.recordset[0].sm19_unqid !== target.sm19_unqid) {
      return res.status(403).json({ success: false, message: 'You can only manage users in your own company.' });
    }

    if (!canManage(req.user.role, target.role)) {
      return res.status(403).json({ success: false, message: 'You do not have permission to edit this user.' });
    }

    if (role && !canManage(req.user.role, role)) {
      return res.status(403).json({ success: false, message: `You cannot assign the role ${role}.` });
    }

    await pool.request()
      .input('userId', sql.NVarChar(50), id)
      .input('fullName', sql.NVarChar(100), fullName)
      .input('email', sql.NVarChar(100), email)
      .input('phone', sql.NVarChar(20), phone)
      .input('role', sql.NVarChar(50), role || target.role)
      .query(`UPDATE users SET full_name = @fullName, email = @email, phone = @phone, role = @role WHERE user_id = @userId`);

    res.json({ success: true, message: 'User updated successfully' });
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete a user
router.delete('/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;

    const pool = await connectDB();

    const targetResult = await pool.request()
      .input('userId', sql.NVarChar(50), id)
      .query('SELECT role, sm19_unqid FROM users WHERE user_id = @userId');

    if (targetResult.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const target = targetResult.recordset[0];

    const currentUserCompany = await pool.request()
      .input('userId', sql.NVarChar(50), req.user.id)
      .query('SELECT sm19_unqid FROM users WHERE user_id = @userId');

    if (currentUserCompany.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Current user not found' });
    }

    if (currentUserCompany.recordset[0].sm19_unqid !== target.sm19_unqid) {
      return res.status(403).json({ success: false, message: 'You can only manage users in your own company.' });
    }

    if (!canManage(req.user.role, target.role)) {
      return res.status(403).json({ success: false, message: 'You do not have permission to delete this user.' });
    }

    await pool.request()
      .input('userId', sql.NVarChar(50), id)
      .query('DELETE FROM users WHERE user_id = @userId');

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
