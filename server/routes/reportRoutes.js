const express = require('express');
const { protect } = require('../middleware/auth');
const { poolPromise, sql } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Raise a complaint
router.post('/', protect, async (req, res) => {
  try {
    const { orderId, category, message } = req.body;
    const customerGuid = req.user.id;

    if (!category || !message) {
      return res.status(400).json({ success: false, message: 'Category and message are required.' });
    }

    const pool = await poolPromise;
    const complaintId = uuidv4();
    const normalizedOrderId = orderId && orderId.trim() !== '' ? orderId : null;

    await pool.request()
      .input('unqid', sql.NVarChar(64), complaintId)
      .input('customerGuid', sql.NVarChar(64), customerGuid)
      .input('orderId', sql.NVarChar(64), normalizedOrderId)
      .input('category', sql.NVarChar(100), category)
      .input('message', sql.NVarChar(sql.MAX), message)
      .query(`
        INSERT INTO sm1018_complaints (unqid, customer_guid, order_id, category, message)
        VALUES (@unqid, @customerGuid, @orderId, @category, @message)
      `);

    res.json({ success: true, message: 'Complaint raised successfully', complaintId });
  } catch (err) {
    console.error('Raise complaint error:', err);
    res.status(500).json({ success: false, message: 'Failed to raise complaint.' });
  }
});

// Get customer's complaints
router.get('/', protect, async (req, res) => {
  try {
    const customerGuid = req.user.id;
    const pool = await poolPromise;
    const result = await pool.request()
      .input('customerGuid', sql.NVarChar(64), customerGuid)
      .query(`
        SELECT unqid, order_id, category, message, status, entry_date 
        FROM sm1018_complaints 
        WHERE customer_guid = @customerGuid 
        ORDER BY entry_date DESC
      `);

    res.json({ success: true, complaints: result.recordset || [] });
  } catch (err) {
    console.error('Fetch complaints error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch complaints.' });
  }
});

module.exports = router;
