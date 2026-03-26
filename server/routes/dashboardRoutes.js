const express = require('express');
const { protect } = require('../middleware/auth');
const { connectDB, isDbConnected, sql } = require('../config/db');

 const router = express.Router();
 let dashboardDataSource = 'v2';

// Basic protected dashboard endpoint
router.get('/', protect, (req, res) => {
  res.json({
    success: true,
    message: 'Dashboard data',
    user: req.user,
  });
});

// Orders data for a customer
router.get('/orders', protect, async (req, res) => {
  try {
    const customerGuidFromToken = req.user?.id;
    const customerGuid = req.query.customerGuid || customerGuidFromToken;

    if (!customerGuid) {
      return res.json({ success: true, customerGuid: null, orders: [] });
    }

    const pool = await connectDB();

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
    console.error('Orders error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch orders.' });
  }
});

// Dashboard summary data
// Removed dashboard data source switch; revert to single data path
// (Removed) Dashboard data source toggle endpoint

router.get('/dashboard-data', protect, async (req, res) => {
  try {
    const customerGuidFromToken = req.user?.id;
    const customerGuid = req.query.customerGuid || customerGuidFromToken;

    if (!customerGuid) {
      return res.json({ success: true, customerGuid: null, data: null });
    }

    const pool = await connectDB();

    const query = `
      WITH ORDERS AS (
        SELECT SM1016_7 AS CUSTOMERUNQ, COUNT(*) AS TOTAL_ORDERS
        FROM SM1016 GROUP BY SM1016_7
      ),
      PENDING AS (
        SELECT S.SM1016_7 AS CUSTOMERUNQ, COUNT(*) AS PENDING_ORDERS
        FROM SM1016 S
        OUTER APPLY (
          SELECT SUM(SM1008_10) AS CHALLANQTY FROM SM1008 WHERE SM1008_31 = S.UNQID
        ) C
        WHERE ISNULL(C.CHALLANQTY,0) < S.SM1016_35
        GROUP BY S.SM1016_7
      )
      SELECT 
        ISNULL(O.TOTAL_ORDERS,0) AS TOTAL_ORDERS,
        ISNULL(P.PENDING_ORDERS,0) AS PENDING_ORDERS,
        0 AS OVERDUE_AMOUNT,
        0 AS DUE_AMOUNT
      FROM SM19 C
      LEFT JOIN ORDERS O ON C.UNQID = O.CUSTOMERUNQ
      LEFT JOIN PENDING P ON C.UNQID = P.CUSTOMERUNQ
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

// Products
router.get('/products', protect, async (req, res) => {
  try {
    const pool = await connectDB();
    const result = await pool.request().query(
      "SELECT sm206_2 AS unqid, sm206_7 AS ProductN FROM sm206 WHERE sm206_7 IS NOT NULL AND sm206_7 <> '' ORDER BY sm206_7"
    );
    return res.json({ success: true, products: result.recordset || [] });
  } catch (err) {
    console.error('Products error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch products.' });
  }
});

// Manufacturers
router.get('/manufacturers', protect, async (req, res) => {
  try {
    const pool = await connectDB();
    const result = await pool.request().query(
      "SELECT unqid, sm113_6 AS ManufactureN FROM sm113 WHERE sm113_6 IS NOT NULL AND sm113_6 <> '' ORDER BY sm113_6"
    );
    return res.json({ success: true, manufacturers: result.recordset || [] });
  } catch (err) {
    console.error('Manufacturers error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch manufacturers.' });
  }
});

// Categories
router.get('/categories', protect, async (req, res) => {
  try {
    const pool = await connectDB();
    const result = await pool.request().query(
      "SELECT unqid, sm17_6 AS CategoryN FROM sm17 WHERE sm17_6 IS NOT NULL AND sm17_6 <> '' ORDER BY sm17_6"
    );
    return res.json({ success: true, categories: result.recordset || [] });
  } catch (err) {
    console.error('Categories error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch categories.' });
  }
});

// Units
router.get('/units', protect, async (req, res) => {
  try {
    const pool = await connectDB();
    const result = await pool.request().query(
      "SELECT unqid, sm209_7 AS unitN FROM sm209 WHERE sm209_7 IS NOT NULL AND sm209_7 <> '' ORDER BY sm209_7"
    );
    return res.json({ success: true, units: result.recordset || [] });
  } catch (err) {
    console.error('Units error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch units.' });
  }
});

// Branches
router.get('/branches', protect, async (req, res) => {
  try {
    const pool = await connectDB();
    const result = await pool.request().query(
      'SELECT SM1002_5 AS unqid, SM1002_7 AS BranchN FROM sm1002 ORDER BY SM1002_7'
    );
    return res.json({ success: true, branches: result.recordset || [] });
  } catch (err) {
    console.error('Branches error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch branches.' });
  }
});

// Product details - dependent dropdowns based on product selection
router.get('/product-details', protect, async (req, res) => {
  try {
    const { productGuid } = req.query;
    
    if (!productGuid) {
      return res.json({ success: true, manufacturers: [], categories: [], units: [] });
    }
    
    const pool = await connectDB();
    
    let manufacturers = [];
    let categories = [];
    let units = [];
    
    try {
      const manufacturersQuery = `
        SELECT DISTINCT m.unqid, m.sm113_6 AS ManufactureN
        FROM sm206_c c
        INNER JOIN sm113 m ON m.unqid = c.sm206_c7
        WHERE c.sm206_c6 = @productGuid
          AND m.sm113_6 IS NOT NULL AND m.sm113_6 <> ''
        ORDER BY m.sm113_6
      `;
      const manuResult = await pool.request()
        .input('productGuid', sql.NVarChar(50), productGuid)
        .query(manufacturersQuery);
      manufacturers = manuResult.recordset || [];
    } catch (e) {
      console.log('Manufacturers query skipped:', e.message);
    }
    
    try {
      const categoriesQuery = `
        SELECT DISTINCT c.unqid, c.sm17_6 AS CategoryN
        FROM sm206 p
        INNER JOIN sm17 c ON c.unqid = p.sm206_13
        WHERE p.sm206_2 = @productGuid
          AND c.sm17_6 IS NOT NULL AND c.sm17_6 <> ''
        ORDER BY c.sm17_6
      `;
      const catResult = await pool.request()
        .input('productGuid', sql.NVarChar(50), productGuid)
        .query(categoriesQuery);
      categories = catResult.recordset || [];
    } catch (e) {
      console.log('Categories query skipped:', e.message);
    }
    
    try {
      const unitsQuery = `
        SELECT p.sm206_12 AS unitGuid, u.sm209_7 AS unitN
        FROM sm206 p
        LEFT JOIN sm209 u ON u.unqid = p.sm206_12
        WHERE p.sm206_2 = @productGuid
      `;
      const unitResult = await pool.request()
        .input('productGuid', sql.NVarChar(50), productGuid)
        .query(unitsQuery);
      units = unitResult.recordset || [];
    } catch (e) {
      console.log('Units query skipped:', e.message);
    }
    
    return res.json({
      success: true,
      manufacturers,
      categories,
      units
    });
  } catch (err) {
    console.error('Product details error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch product details.' });
  }
});

// Dynamic rate based on product, branch, and mode of payment
router.get('/rate', protect, async (req, res) => {
  try {
    const { productGuid, branchGuid, mode } = req.query;
    
    if (!productGuid || !branchGuid || !mode) {
      return res.json({ success: true, rate: 0 });
    }
    
    const pool = await connectDB();
    
    let rate = 0;
    
    try {
      let rateQuery;
      if (mode === 'Cash') {
        rateQuery = `
          SELECT TOP 1 SM1017_C10 AS Rate
          FROM SM1017_C1 
          WHERE SM1017_C6 = @productGuid 
            AND SM1017_C10 > 0
          ORDER BY SM1017_C1 DESC
        `;
      } else {
        rateQuery = `
          SELECT TOP 1 SM1017_C11 AS Rate
          FROM SM1017_C1 
          WHERE SM1017_C6 = @productGuid 
            AND SM1017_C11 > 0
          ORDER BY SM1017_C1 DESC
        `;
      }
      
      const rateResult = await pool.request()
        .input('productGuid', sql.NVarChar(50), productGuid)
        .query(rateQuery);
      
      rate = rateResult.recordset[0]?.Rate || 0;
    } catch (e) {
      console.log('Rate query error:', e.message);
    }
    
    return res.json({ success: true, rate });
  } catch (err) {
    console.error('Rate error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch rate.' });
  }
});

module.exports = router;
