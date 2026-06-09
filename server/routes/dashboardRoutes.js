const express = require('express');
const { protect } = require('../middleware/auth');
const { connectDB, isDbConnected, sql, poolPromise } = require('../config/db');
const { getCache, setCache } = require('../config/cache');

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
    const customerGuidFromToken = req.user?.sm19_unqid;
    const customerGuid = req.query.customerGuid || customerGuidFromToken;

    if (!customerGuid) {
      return res.json({ success: true, customerGuid: null, orders: [] });
    }

    const pool = await poolPromise;

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
      WHERE S.SM1016_7 = @sm19_unqid
      GROUP BY 
        S.SM1016_5, P.SM206_7, S.SM1016_35, 
        S.SM1016_11, S.SM1016_23
      ORDER BY S.SM1016_5 DESC
    `;

    const result = await pool.request()
      .input('sm19_unqid', sql.NVarChar(50), String(customerGuid))
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
    const customerGuidFromToken = req.user?.sm19_unqid;
    const customerGuid = req.query.customerGuid || customerGuidFromToken;

    if (!customerGuid) {
      return res.json({ success: true, customerGuid: null, data: null });
    }

    const pool = await poolPromise;

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
        ISNULL(O.TOTAL_ORDERS,0) AS TOTAL_ORDERS,
        ISNULL(P.PENDING_ORDERS,0) AS PENDING_ORDERS,
        ISNULL(F.OVERDUE_AMOUNT,0) AS OVERDUE_AMOUNT,
        ISNULL(F.TOTAL_DUE,0) AS DUE_AMOUNT
      FROM SM19 C
      LEFT JOIN ORDERS O ON C.UNQID = O.CUSTOMERUNQ
      LEFT JOIN PENDING P ON C.UNQID = P.CUSTOMERUNQ
      LEFT JOIN FINANCE F ON C.UNQID = F.CUSTOMERUNQ
      WHERE C.UNQID = @sm19_unqid
    `;

    const result = await pool.request()
      .input('sm19_unqid', sql.NVarChar(50), String(customerGuid))
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
    const cacheKey = 'dashboard_products';
    const cachedData = getCache(cacheKey);
    if (cachedData) return res.json({ success: true, products: cachedData });

    const pool = await poolPromise;
    const result = await pool.request().query(
      "SELECT sm206_2 AS unqid, sm206_7 AS ProductN FROM sm206 WHERE sm206_7 IS NOT NULL AND sm206_7 <> '' ORDER BY sm206_7"
    );
    const products = result.recordset || [];
    setCache(cacheKey, products);
    return res.json({ success: true, products });
  } catch (err) {
    console.error('Products error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch products.' });
  }
});

// Manufacturers
router.get('/manufacturers', protect, async (req, res) => {
  try {
    const cacheKey = 'dashboard_manufacturers';
    const cachedData = getCache(cacheKey);
    if (cachedData) return res.json({ success: true, manufacturers: cachedData });

    const pool = await poolPromise;
    const result = await pool.request().query(
      "SELECT unqid, sm113_6 AS ManufactureN FROM sm113 WHERE sm113_6 IS NOT NULL AND sm113_6 <> '' ORDER BY sm113_6"
    );
    const manufacturers = result.recordset || [];
    setCache(cacheKey, manufacturers);
    return res.json({ success: true, manufacturers });
  } catch (err) {
    console.error('Manufacturers error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch manufacturers.' });
  }
});

// Categories
router.get('/categories', protect, async (req, res) => {
  try {
    const cacheKey = 'dashboard_categories';
    const cachedData = getCache(cacheKey);
    if (cachedData) return res.json({ success: true, categories: cachedData });

    const pool = await poolPromise;
    const result = await pool.request().query(
      "SELECT unqid, sm17_6 AS CategoryN FROM sm17 WHERE sm17_6 IS NOT NULL AND sm17_6 <> '' ORDER BY sm17_6"
    );
    const categories = result.recordset || [];
    setCache(cacheKey, categories);
    return res.json({ success: true, categories });
  } catch (err) {
    console.error('Categories error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch categories.' });
  }
});

// Units
router.get('/units', protect, async (req, res) => {
  try {
    const cacheKey = 'dashboard_units';
    const cachedData = getCache(cacheKey);
    if (cachedData) return res.json({ success: true, units: cachedData });

    const pool = await poolPromise;
    const result = await pool.request().query(
      "SELECT unqid, sm209_7 AS unitN FROM sm209 WHERE sm209_7 IS NOT NULL AND sm209_7 <> '' ORDER BY sm209_7"
    );
    const units = result.recordset || [];
    setCache(cacheKey, units);
    return res.json({ success: true, units });
  } catch (err) {
    console.error('Units error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch units.' });
  }
});

// Branches (Filtered by customer access)
router.get('/branches', protect, async (req, res) => {
  try {
    const customerGuid = req.query.customerGuid;
    if (!customerGuid) {
       return res.status(400).json({ success: false, message: 'Customer GUID is required.' });
    }
    
    const cacheKey = `branches_${customerGuid}`;
    const cachedData = getCache(cacheKey);
    if (cachedData) return res.json({ success: true, branches: cachedData });

    const pool = await poolPromise;
    
    // SQL logic to get branches allowed for this customer
    const result = await pool.request()
      .input('customerguid', sql.NVarChar(64), customerGuid)
      .query(`
        DECLARE @branch NVARCHAR(MAX);
        SET @branch = (SELECT sm19_63 FROM sm19 WHERE unqid = @customerguid);
        
        SELECT 
          SM1002_5 AS unqid, 
          SM1002_7 AS BranchN
        FROM SM1002
        WHERE SM1002_5 IN (SELECT data FROM dbo.split(ISNULL(@branch, ''), ','))
        ORDER BY SM1002_7 ASC;
      `);
      
    const branches = result.recordset || [];
    setCache(cacheKey, branches);
    return res.json({ success: true, branches });
  } catch (err) {
    console.error('Branches error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch branches.' });
  }
});

// Bind branches by customer name (e.g., Karma Enterprises)
router.get('/branches-by-name', protect, async (req, res) => {
  try {
    const customerName = req.query.customerName
    console.log('DEBUG: Received customerName:', customerName);
    
    if (!customerName) {
      return res.status(400).json({ success: false, message: 'Customer name is required.' })
    }
    const pool = await poolPromise;
    
    // Resolve customer GUID from name (best effort: match on name or email field if available)
    const guidResult = await pool.request()
      .input('name', sql.NVarChar(255), customerName)
      .query(`SELECT TOP 1 unqid, sm19_63 FROM sm19 WHERE LOWER(sm19_5) = LOWER(@name) OR LOWER(sm19_17) = LOWER(@name)`);
    
    console.log('DEBUG: Resolved customer record:', guidResult.recordset[0]);
    
    const guid = guidResult.recordset[0]?.unqid
    if (!guid) {
      return res.status(404).json({ success: false, message: 'Customer not found.' })
    }

    const branchResult = await pool.request()
      .input('customerguid', sql.NVarChar(64), guid)
      .query(`
        DECLARE @branch NVARCHAR(MAX);
        SET @branch = (SELECT sm19_63 FROM sm19 WHERE unqid = @customerguid);
        SELECT 
          SM1002_5 AS UNQID, 
          SM1002_7 AS Dname, 
          1 AS ord
        FROM SM1002
        WHERE SM1002_5 IN (SELECT data FROM dbo.split(ISNULL(@branch, ''), ','))
        ORDER BY SM1002_7 ASC, ord ASC;
      `)
      
    console.log('DEBUG: Branches found in SM1002:', branchResult.recordset);
    
    res.json({ success: true, branches: branchResult.recordset })
  } catch (err) {
    console.error('Dashboard branches-by-name error:', err)
    res.status(500).json({ success: false, message: 'Failed to fetch branches by name.' })
  }
})

// Product details - dependent dropdowns based on product selection
router.get('/product-details', protect, async (req, res) => {
  try {
    const { productGuid } = req.query;
    
    if (!productGuid) {
      return res.json({ success: true, manufacturers: [], categories: [], units: [] });
    }
    
    const pool = await poolPromise;
    
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
    
    const pool = await poolPromise;
    
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

// Save new order
router.post('/save-order', protect, async (req, res) => {
  try {
    const {
      customerGuid,
      bookingDate,
      paymentTerm,
      validTill,
      branchGuid,
      paymentMode,
      items // Array of items
    } = req.body;

    // Validate required fields
    if (!customerGuid || !bookingDate || !branchGuid || !paymentMode || !items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Missing required order fields.' });
    }

    const pool = await connectDB();
    const transaction = new sql.Transaction(pool);

    try {
      await transaction.begin();

      // Using a simple ID generator since randomUUID might not be available in older node versions
      const orderUnqid = 'ORD-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
      
      // 1. Insert Header
      const headerQuery = `
        INSERT INTO sm1017_p (unqid, customer_guid, booking_date, payment_term, valid_till, branch_guid, payment_mode)
        VALUES (@unqid, @customerGuid, @bookingDate, @paymentTerm, @validTill, @branchGuid, @paymentMode)
      `;
      
      await transaction.request()
        .input('unqid', sql.NVarChar(64), orderUnqid)
        .input('customerGuid', sql.NVarChar(64), customerGuid)
        .input('bookingDate', sql.DateTime, new Date(bookingDate))
        .input('paymentTerm', sql.NVarChar(255), paymentTerm)
        .input('validTill', sql.DateTime, validTill ? new Date(validTill) : null)
        .input('branchGuid', sql.NVarChar(64), branchGuid)
        .input('paymentMode', sql.NVarChar(50), paymentMode)
        .query(headerQuery);

      // 2. Insert Items
      for (const item of items) {
        const itemUnqid = 'ITEM-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
        const itemQuery = `
          INSERT INTO sm1017_pc (unqid, parent_id, product_guid, mfg_guid, category_guid, unit_guid, qty, rate, request_rate, amount, delivery_date)
          VALUES (@unqid, @parentId, @productGuid, @mfgGuid, @categoryGuid, @unitGuid, @qty, @rate, @requestRate, @amount, @deliveryDate)
        `;
        
        await transaction.request()
          .input('unqid', sql.NVarChar(64), itemUnqid)
          .input('parentId', sql.NVarChar(64), orderUnqid)
          .input('productGuid', sql.NVarChar(64), item.productGuid)
          .input('mfgGuid', sql.NVarChar(64), item.mfgGuid)
          .input('categoryGuid', sql.NVarChar(64), item.categoryGuid)
          .input('unitGuid', sql.NVarChar(64), item.unitGuid)
          .input('qty', sql.Decimal(18, 4), item.qty)
          .input('rate', sql.Decimal(18, 4), item.rate)
          .input('requestRate', sql.Decimal(18, 3), item.requestRate ?? null)
          .input('amount', sql.Decimal(18, 4), item.amount)
          .input('deliveryDate', sql.DateTime, item.deliveryDate ? new Date(item.deliveryDate) : null)
          .query(itemQuery);
      }

      await transaction.commit();
      res.json({ success: true, message: 'Order saved successfully', orderId: orderUnqid });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    console.error('Save order error:', err);
    res.status(500).json({ success: false, message: 'Failed to save order.' });
  }
});

module.exports = router;
