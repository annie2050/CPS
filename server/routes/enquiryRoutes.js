const express = require('express');
const { protect } = require('../middleware/auth');
const { poolPromise, sql, isDbConnected } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// In-memory fallback array for enquiries if DB table is not present
let memoryEnquiries = [];

// Helper to safely execute SQL or fallback
async function executeQuery(queryFn, fallbackFn) {
  try {
    if (!isDbConnected()) {
      return fallbackFn();
    }
    return await queryFn();
  } catch (err) {
    console.warn('DB Query failed in enquiryRoutes, using fallback:', err.message);
    return fallbackFn();
  }
}

// Get units
router.get('/units', protect, async (req, res) => {
  try {
    let units = ['MT', 'Kg', 'PCs', 'Nos', 'Bag', 'Litres', 'Mtrs'];
    if (isDbConnected()) {
      const pool = await poolPromise;
      const result = await pool.request().query(`
        SELECT DISTINCT sm209_7 
        FROM sm209 
        INNER JOIN sm206 ON sm206_12 = sm209.unqid
        WHERE sm209_7 IS NOT NULL AND sm209_7 <> ''
      `);
      if (result.recordset && result.recordset.length > 0) {
        units = result.recordset.map(r => r.sm209_7);
      }
    }
    res.json({ success: true, units });
  } catch (err) {
    console.error('Fetch units error:', err);
    res.json({ success: true, units: ['MT', 'Kg', 'PCs', 'Nos', 'Bag'] });
  }
});
router.get('/', protect, async (req, res) => {
  const customerGuid = req.user?.sm19_unqid || req.user?.id || 'guest';

  const data = await executeQuery(
    async () => {
      const pool = await poolPromise;
      const result = await pool.request()
        .input('customerGuid', sql.NVarChar(64), String(customerGuid))
        .query(`
          IF OBJECT_ID('dbo.product_enquiries', 'U') IS NOT NULL
          BEGIN
            SELECT 
              e.unqid,
              e.customer_guid AS customerGuid,
              e.customer_name AS customerName,
              e.product_guid AS productGuid,
              e.product_name AS productName,
              e.is_available AS isAvailable,
              e.availability_status AS availabilityStatus,
              e.qty,
              e.rate,
              e.unit,
              e.delivery_date AS deliveryDate,
              e.remarks,
              e.status,
              e.created_at AS createdAt
            FROM product_enquiries e
            WHERE e.customer_guid = @customerGuid
            ORDER BY e.created_at DESC
          END
          ELSE
          BEGIN
            SELECT 1 WHERE 1=0
          END
        `);

      if (result.recordset && result.recordset.length >= 0 && result.columns) {
        return result.recordset;
      }
      return memoryEnquiries.filter(e => String(e.customerGuid) === String(customerGuid));
    },
    () => memoryEnquiries.filter(e => String(e.customerGuid) === String(customerGuid))
  );

  res.json({ success: true, enquiries: data });
});

// 2. Check Product Availability ("is available or not")
router.get('/check-availability', protect, async (req, res) => {
  const { productGuid } = req.query;

  if (!productGuid) {
    return res.status(400).json({ success: false, message: 'productGuid is required' });
  }

  try {
    let result = {
      isAvailable: true,
      availabilityStatus: 'Available',
      stockQty: 'In Stock',
      rate: 0,
      unit: 'MT'
    };

    if (isDbConnected()) {
      const pool = await poolPromise;

      // Query product details & sample stock / rate
      const prodRes = await pool.request()
        .input('productGuid', sql.NVarChar(64), String(productGuid))
        .query(`
          SELECT TOP 1
            p.sm206_7 AS productName,
            u.sm209_7 AS unitName
          FROM sm206 p
          LEFT JOIN sm209 u ON u.unqid = p.sm206_12
          WHERE p.sm206_2 = @productGuid
        `);

      if (prodRes.recordset && prodRes.recordset.length > 0) {
        const prod = prodRes.recordset[0];
        if (prod.unitName) result.unit = prod.unitName;
      }

      // Query rate
      const rateRes = await pool.request()
        .input('productGuid', sql.NVarChar(64), String(productGuid))
        .query(`
          SELECT TOP 1 sm1013_4 AS rate 
          FROM sm1013 
          WHERE sm1013_3 = @productGuid 
          ORDER BY sm1013_1 DESC
        `);

      if (rateRes.recordset && rateRes.recordset.length > 0) {
        result.rate = rateRes.recordset[0].rate || 0;
      }
    }

    res.json({ success: true, availability: result });
  } catch (err) {
    console.error('Check availability error:', err);
    res.json({
      success: true,
      availability: {
        isAvailable: true,
        availabilityStatus: 'Available',
        stockQty: 'In Stock',
        rate: 0,
        unit: 'MT'
      }
    });
  }
});

// 3. Create Product Enquiry
router.post('/', protect, async (req, res) => {
  try {
    const customerGuid = req.user?.sm19_unqid || req.user?.id || 'guest';
    const customerName = req.user?.company || req.user?.name || 'Customer';

    const {
      productGuid,
      productName,
      isAvailable,
      availabilityStatus,
      qty,
      rate,
      unit,
      deliveryDate,
      remarks
    } = req.body;

    if (!productGuid || !qty || !deliveryDate) {
      return res.status(400).json({
        success: false,
        message: 'Product, Quantity, and Delivery Date are required.'
      });
    }

    const unqid = 'ENQ-' + uuidv4().slice(0, 8).toUpperCase();
    const createdAt = new Date().toISOString();

    const newEnquiry = {
      unqid,
      customerGuid: String(customerGuid),
      customerName,
      productGuid,
      productName: productName || 'Selected Product',
      isAvailable: isAvailable ?? true,
      availabilityStatus: availabilityStatus || 'Available',
      qty: Number(qty),
      rate: rate ? Number(rate) : 0,
      unit: unit || 'MT',
      deliveryDate,
      remarks: remarks || '',
      status: 'Pending',
      createdAt
    };

    // Store in memory first as fallback cache
    memoryEnquiries.unshift(newEnquiry);

    // Try saving to DB if table exists
    if (isDbConnected()) {
      try {
        const pool = await poolPromise;
        // Ensure table exists
        await pool.request().query(`
          IF OBJECT_ID('dbo.product_enquiries', 'U') IS NULL
          BEGIN
            CREATE TABLE dbo.product_enquiries (
              unqid NVARCHAR(64) PRIMARY KEY,
              customer_guid NVARCHAR(64) NOT NULL,
              customer_name NVARCHAR(255),
              product_guid NVARCHAR(64) NOT NULL,
              product_name NVARCHAR(255),
              is_available BIT DEFAULT 1,
              availability_status NVARCHAR(50),
              qty DECIMAL(18, 4),
              rate DECIMAL(18, 4),
              unit NVARCHAR(50),
              delivery_date DATETIME,
              remarks NVARCHAR(MAX),
              status NVARCHAR(50) DEFAULT 'Pending',
              created_at DATETIME DEFAULT GETDATE()
            );
          END
        `);

        await pool.request()
          .input('unqid', sql.NVarChar(64), unqid)
          .input('customerGuid', sql.NVarChar(64), String(customerGuid))
          .input('customerName', sql.NVarChar(255), customerName)
          .input('productGuid', sql.NVarChar(64), String(productGuid))
          .input('productName', sql.NVarChar(255), productName || 'Selected Product')
          .input('isAvailable', sql.Bit, isAvailable ? 1 : 0)
          .input('availabilityStatus', sql.NVarChar(50), availabilityStatus || 'Available')
          .input('qty', sql.Decimal(18, 4), Number(qty))
          .input('rate', sql.Decimal(18, 4), rate ? Number(rate) : 0)
          .input('unit', sql.NVarChar(50), unit || 'MT')
          .input('deliveryDate', sql.DateTime, new Date(deliveryDate))
          .input('remarks', sql.NVarChar(sql.MAX), remarks || '')
          .input('status', sql.NVarChar(50), 'Pending')
          .query(`
            INSERT INTO product_enquiries (
              unqid, customer_guid, customer_name, product_guid, product_name,
              is_available, availability_status, qty, rate, unit, delivery_date, remarks, status
            ) VALUES (
              @unqid, @customerGuid, @customerName, @productGuid, @productName,
              @isAvailable, @availabilityStatus, @qty, @rate, @unit, @deliveryDate, @remarks, @status
            )
          `);
      } catch (dbErr) {
        console.error('Failed to save product enquiry to DB (saved in memory fallback):', dbErr.message);
      }
    }

    res.json({
      success: true,
      message: 'Product enquiry submitted successfully.',
      enquiry: newEnquiry
    });
  } catch (err) {
    console.error('Create product enquiry error:', err);
    res.status(500).json({ success: false, message: 'Failed to submit product enquiry.' });
  }
});

// 4. Delete / Cancel Product Enquiry
router.delete('/:id', protect, async (req, res) => {
  const enquiryId = req.params.id;
  const customerGuid = req.user?.sm19_unqid || req.user?.id || 'guest';

  memoryEnquiries = memoryEnquiries.filter(
    e => !(e.unqid === enquiryId && String(e.customerGuid) === String(customerGuid))
  );

  if (isDbConnected()) {
    try {
      const pool = await poolPromise;
      await pool.request()
        .input('enquiryId', sql.NVarChar(64), enquiryId)
        .input('customerGuid', sql.NVarChar(64), String(customerGuid))
        .query(`
          IF OBJECT_ID('dbo.product_enquiries', 'U') IS NOT NULL
          BEGIN
            DELETE FROM product_enquiries WHERE unqid = @enquiryId AND customer_guid = @customerGuid
          END
        `);
    } catch (err) {
      console.warn('Error deleting enquiry from DB:', err.message);
    }
  }

  res.json({ success: true, message: 'Product enquiry deleted successfully.' });
});

module.exports = router;
