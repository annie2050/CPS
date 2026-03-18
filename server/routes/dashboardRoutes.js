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
        S.SM1016_5 AS ORDER_ID,
        P.SM206_7 AS PRODUCT,
        CASE 
          WHEN ISNULL(SUM(C.SM1008_10),0) >= S.SM1016_35 
          THEN 'Delivered'
          ELSE 'Processing'
        END AS STATUS,
        S.SM1016_35 AS QTY,
        ISNULL(S.SM1016_35 * S.SM1016_11,0) AS AMOUNT,
        CASE 
          WHEN S.SM1016_23 = 'PAID' THEN 'Paid'
          ELSE 'Overdue'
        END AS PAYMENT
      FROM SM1016 S
      LEFT JOIN SM1008 C ON C.SM1008_31 = S.UNQID
      LEFT JOIN SM206 P ON P.SM206_2 = S.SM1016_8
      WHERE S.SM1016_7 = @customerGuid
      GROUP BY 
        S.SM1016_5, P.SM206_7, S.SM1016_35, 
        S.SM1016_11, S.SM1016_23
      ORDER BY S.SM1016_5 DESC
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

router.get('/dashboard-data', protect, async (req, res) => {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({ success: false, message: 'Database not connected. Please try again later.' });
    }

    const customerGuidFromToken = req.user?.id;
    const customerGuid = req.query.customerGuid || customerGuidFromToken;

    if (!customerGuid) {
      return res.json({
        success: true,
        customerGuid: null,
        data: null,
      });
    }

    const pool = await poolPromise;
    if (!pool) {
      return res.status(503).json({ success: false, message: 'Database connection unavailable.' });
    }

    const query = `
      WITH ORDERS AS (
        SELECT 
          SM1016_7 AS CUSTOMERUNQ,
          COUNT(*) AS TOTAL_ORDERS,
          SUM(SM1016_35) AS TOTAL_QTY
        FROM SM1016
        GROUP BY SM1016_7
      ),
      PENDING AS (
        SELECT 
          S.SM1016_7 AS CUSTOMERUNQ,
          COUNT(*) AS PENDING_ORDERS
        FROM SM1016 S
        OUTER APPLY (
          SELECT SUM(SM1008_10) AS CHALLANQTY
          FROM SM1008 
          WHERE SM1008_31 = S.UNQID
        ) C
        WHERE ISNULL(C.CHALLANQTY,0) < S.SM1016_35
        GROUP BY S.SM1016_7
      ),
      FINANCE AS (
        SELECT 
          SM19.UNQID AS CUSTOMERUNQ,
          SUM(ISNULL(IN_11,0)) AS TOTAL_DUE,
          SUM(CASE 
            WHEN DATEDIFF(DAY, IN_14, GETDATE()) > 0 
            THEN ISNULL(IN_11,0) 
            ELSE 0 
          END) AS OVERDUE_AMOUNT
        FROM SM19
        LEFT JOIN INVN ON SM19.UNQID = INVN.IN_12
        WHERE ISNULL(IN_7,'OO') = 'OO'
        GROUP BY SM19.UNQID
      )
      SELECT 
        C.SM19_5 AS CUSTOMER,
        ISNULL(O.TOTAL_ORDERS,0) AS TOTAL_ORDERS,
        ISNULL(P.PENDING_ORDERS,0) AS PENDING_ORDERS,
        ISNULL(F.OVERDUE_AMOUNT,0) AS OVERDUE_AMOUNT,
        ISNULL(F.TOTAL_DUE,0) AS DUE_AMOUNT
      FROM SM19 C
      LEFT JOIN ORDERS O ON C.UNQID = O.CUSTOMERUNQ
      LEFT JOIN PENDING P ON C.UNQID = P.CUSTOMERUNQ
      LEFT JOIN FINANCE F ON C.UNQID = F.CUSTOMERUNQ
      WHERE C.UNQID = @customerGuid
    `;

    const result = await pool.request()
      .input('customerGuid', sql.NVarChar(50), String(customerGuid))
      .query(query);

    return res.json({
      success: true,
      customerGuid,
      data: result.recordset[0] || null,
    });
  } catch (err) {
    console.error('Dashboard data error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch dashboard data.' });
  }
});

router.get('/products', protect, async (req, res) => {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({ success: false, message: 'Database not connected.' });
    }

    const pool = await poolPromise;
    const query = `SELECT sm206_2 AS unqid, sm206_7 AS productName FROM sm206 WHERE sm206_7 IS NOT NULL AND sm206_7 != '' ORDER BY sm206_7`;
    const result = await pool.request().query(query);

    return res.json({ success: true, products: result.recordset || [] });
  } catch (err) {
    console.error('Products error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch products.' });
  }
});

router.get('/manufacturers', protect, async (req, res) => {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({ success: false, message: 'Database not connected.' });
    }

    const pool = await poolPromise;
    const query = `SELECT unqid, sm113_6 AS manuName FROM sm113 WHERE sm113_6 IS NOT NULL AND sm113_6 != '' ORDER BY sm113_6`;
    const result = await pool.request().query(query);

    return res.json({ success: true, manufacturers: result.recordset || [] });
  } catch (err) {
    console.error('Manufacturers error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch manufacturers.' });
  }
});

router.get('/categories', protect, async (req, res) => {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({ success: false, message: 'Database not connected.' });
    }

    const pool = await poolPromise;
    const query = `SELECT unqid, sm17_6 AS category FROM sm17 WHERE sm17_6 IS NOT NULL AND sm17_6 != '' ORDER BY sm17_6`;
    const result = await pool.request().query(query);

    return res.json({ success: true, categories: result.recordset || [] });
  } catch (err) {
    console.error('Categories error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch categories.' });
  }
});

router.get('/units', protect, async (req, res) => {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({ success: false, message: 'Database not connected.' });
    }

    const pool = await poolPromise;
    const query = `SELECT unqid, sm209_7 AS unitName FROM sm209 WHERE sm209_7 IS NOT NULL AND sm209_7 != '' ORDER BY sm209_7`;
    const result = await pool.request().query(query);

    return res.json({ success: true, units: result.recordset || [] });
  } catch (err) {
    console.error('Units error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch units.' });
  }
});

router.get('/branches', protect, async (req, res) => {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({ success: false, message: 'Database not connected.' });
    }

    const pool = await poolPromise;
    const query = `SELECT SM1002_5 AS unqid, SM1002_7 AS branch FROM sm1002 ORDER BY SM1002_7`;
    const result = await pool.request().query(query);

    return res.json({ success: true, branches: result.recordset || [] });
  } catch (err) {
    console.error('Branches error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch branches.' });
  }
});

router.get('/product-details', protect, async (req, res) => {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({ success: false, message: 'Database not connected.' });
    }

    const { productGuid } = req.query;
    if (!productGuid) {
      return res.status(400).json({ success: false, message: 'Product GUID is required.' });
    }

    const pool = await poolPromise;
    const request = pool.request().input('prounqid', sql.NVarChar(50), productGuid);

    const mfgResult = await request.query(`
      SELECT sm206_c7 AS unqid, sm113.sm113_6 AS manufacurename
      FROM sm206_c
      INNER JOIN sm113 ON sm113.UNQID = sm206_c7
      WHERE sm206_c6 = @prounqid
    `);

    const catResult = await request.query(`
      SELECT sm17.UNQID AS unqid, sm17.sm17_6 AS category
      FROM sm206
      INNER JOIN sm17 ON sm17.UNQID = sm206.sm206_13
      WHERE sm206.sm206_2 = @prounqid
    `);

    const unitResult = await request.query(`
      SELECT sm209.UNQID AS unqid, sm209.sm209_5 AS unitname
      FROM sm209
      INNER JOIN sm206 ON sm206.sm206_12 = sm209.UNQID
      WHERE sm206.sm206_2 = @prounqid
    `);

    const details = {
      manufactureid: mfgResult.recordset[0]?.unqid || '',
      manufacurename: mfgResult.recordset[0]?.manufacurename || '',
      categoryunqid: catResult.recordset[0]?.unqid || '',
      category: catResult.recordset[0]?.category || '',
      unit: unitResult.recordset[0]?.unqid || '',
      unitname: unitResult.recordset[0]?.unitname || ''
    };

    console.log('Product details result:', details);

    return res.json({ success: true, details });
  } catch (err) {
    console.error('Product details error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch product details.' });
  }
});

router.get('/rate-master', protect, async (req, res) => {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({ success: false, message: 'Database not connected.' });
    }

    const { productGuid, manuGuid } = req.query;
    const pool = await poolPromise;
    
    let query = `SELECT TOP 1 sm1013_4 AS rate FROM sm1013 WHERE 1=1`;
    const request = pool.request();
    
    if (productGuid) {
      query += ` AND sm1013_3 = @productGuid`;
      request.input('productGuid', sql.NVarChar(50), productGuid);
    }
    if (manuGuid) {
      query += ` AND sm1013_2 = @manuGuid`;
      request.input('manuGuid', sql.NVarChar(50), manuGuid);
    }
    
    query += ` ORDER BY sm1013_1 DESC`;
    
    const result = await request.query(query);

    return res.json({ success: true, rate: result.recordset[0]?.rate || 0 });
  } catch (err) {
    console.error('Rate master error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch rate.' });
  }
});

router.post('/orders', protect, async (req, res) => {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({ success: false, message: 'Database not connected.' });
    }

    const pool = await poolPromise;
    const {
      customerGuid, productGuid, productName, branchGuid, branchName,
      qty, netQty, unitGuid, unitName, strength, paymentTerm,
      bookingDate, expectedDeliveryDates, modeOfPayment
    } = req.body;

    const bookingNoQuery = `SELECT ISNULL(MAX(CAST(sm1016_5 AS NUMERIC(18,0))), 0) + 1 AS nextBookingNo FROM sm1016`;
    const bookingResult = await pool.request().query(bookingNoQuery);
    const nextBookingNo = bookingResult.recordset[0].nextBookingNo;

    for (const item of expectedDeliveryDates) {
      const insertQuery = `
        INSERT INTO sm1016 (
          sm1016_5, sm1016_6, SM1016_7, SM1016_4, SM1016_8,
          sm1016_11, sm1016_12, sm1016_35, sm1016_34, sm1016_23,
          sm1016_26, SM1016_24
        ) VALUES (
          @bookingNo, @bookingDate, @customerGuid, @branchGuid, @productGuid,
          @qty, @unitGuid, @netQty, @strength, @paymentTerm,
          @expectedDeliveryDate, @modeOfPayment
        )
      `;
      
      await pool.request()
        .input('bookingNo', sql.NVarChar(50), String(nextBookingNo))
        .input('bookingDate', sql.Date, bookingDate)
        .input('customerGuid', sql.NVarChar(50), customerGuid)
        .input('branchGuid', sql.NVarChar(50), branchGuid || '')
        .input('productGuid', sql.NVarChar(50), productGuid || '')
        .input('qty', sql.Decimal(18, 2), qty)
        .input('unitGuid', sql.NVarChar(50), unitGuid || '')
        .input('netQty', sql.Decimal(18, 2), netQty)
        .input('strength', sql.NVarChar(100), strength || '')
        .input('paymentTerm', sql.NVarChar(100), paymentTerm || '')
        .input('expectedDeliveryDate', sql.Date, item.date)
        .input('modeOfPayment', sql.NVarChar(100), modeOfPayment || '')
        .query(insertQuery);
    }

    return res.json({ success: true, message: 'Order created successfully!', bookingNo: nextBookingNo });
  } catch (err) {
    console.error('Create order error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create order.' });
  }
});

module.exports = router;
