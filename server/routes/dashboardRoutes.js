const express = require('express');
const { protect } = require('../middleware/auth');
const { poolPromise, isDbConnected, sql } = require('../config/db');

const router = express.Router();

// Basic protected dashboard endpoint
router.get('/', protect, (req, res) => {
  res.json({
    success: true,
    message: 'Dashboard data',
    user: req.user,
  });
});

router.get('/orders', protect, async (req, res) => {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({ success: false, message: 'Database not connected. Please try again later.' });
    }

    const customerGuidFromToken = req.user?.id;
    const customerGuid = req.query.customerGuid || customerGuidFromToken;

    if (!customerGuid) {
      // If somehow we have no customer in token and none in query,
      // just return an empty list instead of an error so the UI can still render.
      return res.json({
        success: true,
        customerGuid: null,
        orders: [],
      });
    }

    const pool = await poolPromise;
    if (!pool) {
      return res.status(503).json({ success: false, message: 'Database connection unavailable.' });
    }

    const query = `
      SELECT
        sm1016.sm1016_5 AS bookingNo,
        FORMAT(sm1016.sm1016_6, 'dd-MM-yyyy') AS bookingDate,
        sm1016.SM1016_7 AS customerGuid,
        sm19.sm19_5 AS customerName,
        sm1016.SM1016_4 AS branchGuid,
        sm1002.sm1002_7 AS branchName,
        sm1016.SM1016_8 AS productGuid,
        sm206.sm206_7 AS productName,
        sm1016.sm1016_11 AS qty,
        sm1016.sm1016_34 AS strength,
        sm1016.sm1016_12 AS unitGuid,
        sm209.sm209_7 AS unitName,
        sm1016.sm1016_35 AS netQty,
        sm1016.sm1016_23 AS paymentTerm
      FROM sm1016
      LEFT JOIN sm19   ON sm19.unqid      = sm1016.SM1016_7
      LEFT JOIN sm1002 ON sm1002.sm1002_5 = sm1016.SM1016_4
      LEFT JOIN sm206  ON sm206.sm206_2   = sm1016.SM1016_8
      LEFT JOIN sm209  ON sm209.unqid     = sm1016.sm1016_12
      WHERE sm19.unqid = @customerGuid
      ORDER BY CAST(sm1016.sm1016_5 AS NUMERIC(18, 0)) ASC;
    `;

    const result = await pool.request()
      .input('customerGuid', sql.NVarChar(50), String(customerGuid))
      .query(query);

    return res.json({
      success: true,
      customerGuid,
      orders: result.recordset || [],
    });
  } catch (err) {
    console.error('Orders dashboard error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch orders.' });
  }
});

module.exports = router;

