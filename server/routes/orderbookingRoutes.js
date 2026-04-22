const express = require('express')
const { protect } = require('../middleware/auth')
const { poolPromise, sql, isDbConnected, connectDB } = require('../config/db')
const { v4: uuidv4 } = require('uuid')

const router = express.Router()

// Get product details for orderbooking (manufacturer, category, unit)
router.get('/product-details', protect, async (req, res) => {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({ success: false, message: 'Database not connected.' })
    }
    const productGuid = req.query.productGuid
    if (!productGuid) {
      return res.status(400).json({ success: false, message: 'Product GUID is required.' })
    }

    const pool = await poolPromise
    const request = pool.request().input('prounqid', sql.NVarChar(50), productGuid)

    const mfgResult = await request.query(`
      SELECT sm206_c7 AS unqid, sm113.sm113_6 AS manuName
      FROM sm206_c
      INNER JOIN sm113 ON sm113.UNQID = sm206_c7
      WHERE sm206_c6 = @prounqid
    `)

    const catResult = await request.query(`
      SELECT sm17.UNQID AS unqid, sm17.sm17_6 AS category
      FROM sm206
      INNER JOIN sm17 ON sm17.UNQID = sm206.sm206_13
      WHERE sm206.sm206_2 = @prounqid
    `)

    const unitResult = await request.query(`
      SELECT sm209.UNQID AS unqid, sm209.sm209_5 AS unitname
      FROM sm209
      INNER JOIN sm206 ON sm206.sm206_12 = sm209.UNQID
      WHERE sm206.sm206_2 = @prounqid
    `)

    const details = {
      manufactureid: mfgResult.recordset[0]?.unqid || '',
      manuName: mfgResult.recordset[0]?.manuName || '',
      categoryunqid: catResult.recordset[0]?.unqid || '',
      category: catResult.recordset[0]?.category || '',
      unit: unitResult.recordset[0]?.unqid || '',
      unitname: unitResult.recordset[0]?.unitname || ''
    }

    res.json({ success: true, details })
  } catch (err) {
    console.error('OrderBooking product-details error:', err)
    res.status(500).json({ success: false, message: 'Failed to fetch product details.' })
  }
})

// Get rate for a product and manufacturer. Branch context can be added later.
router.get('/rate', protect, async (req, res) => {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({ success: false, message: 'Database not connected.' })
    }

    const { productGuid, manuGuid } = req.query
    const pool = await poolPromise
    let query = `SELECT TOP 1 sm1013_4 AS rate FROM sm1013 WHERE 1=1`
    const request = pool.request()
    if (productGuid) {
      query += ` AND sm1013_3 = @productGuid`
      request.input('productGuid', sql.NVarChar(50), productGuid)
    }
    if (manuGuid) {
      query += ` AND sm1013_2 = @manuGuid`
      request.input('manuGuid', sql.NVarChar(50), manuGuid)
    }
    query += ` ORDER BY sm1013_1 DESC`
    const result = await request.query(query)
    res.json({ success: true, rate: result.recordset[0]?.rate || 0 })
  } catch (err) {
    console.error('OrderBooking rate error:', err)
    res.status(500).json({ success: false, message: 'Failed to fetch rate.' })
  }
})

// (Removed: branches endpoint moved to standard dashboard route)

// Helper to parse DD-MM-YYYY or YYYY-MM-DD dates
const parseDate = (dateStr) => {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return dateStr;
  
  // Try DD-MM-YYYY
  const dmy = /^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec(dateStr);
  if (dmy) {
    return new Date(dmy[3], dmy[2] - 1, dmy[1]);
  }
  
  // Fallback to native parsing (handles YYYY-MM-DD)
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
};

// Save Order Route
router.post('/orders', protect, async (req, res) => {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({ success: false, message: 'Database not connected.' });
    }
    
    const { 
      customerGuid, 
      productGuid, 
      unitGuid, 
      manuGuid,
      categoryGuid,
      paymentTerm, 
      bookingDate, 
      validTill,
      branchGuid,
      modeOfPayment,
      rate,
      items
    } = req.body;

    if (!customerGuid || !bookingDate) {
      return res.status(400).json({ success: false, message: 'customerGuid and bookingDate are required.' });
    }

    const itemsToSave = items || [];
    const pool = await poolPromise;

    const orderUnqid = uuidv4();

    // Prepare Order Header TVP
    const headerTable = new sql.Table('dbo.OrderHeaderType');
    headerTable.columns.add('unqid', sql.NVarChar(64), { nullable: false });
    headerTable.columns.add('customer_guid', sql.NVarChar(64), { nullable: false });
    headerTable.columns.add('booking_date', sql.DateTime, { nullable: false });
    headerTable.columns.add('payment_term', sql.NVarChar(255), { nullable: true });
    headerTable.columns.add('valid_till', sql.DateTime, { nullable: true });
    headerTable.columns.add('branch_guid', sql.NVarChar(64), { nullable: true });
    headerTable.columns.add('payment_mode', sql.NVarChar(50), { nullable: true });

    const parsedBookingDate = parseDate(bookingDate);
    if (!parsedBookingDate) {
      return res.status(400).json({ success: false, message: 'Invalid bookingDate format. Please use DD-MM-YYYY or YYYY-MM-DD.' });
    }

    // Handle "30 Days" or other duration strings by defaulting to 30 days from booking date
    let parsedValidTill = parseDate(validTill);
    if (!parsedValidTill) {
      const booking = parsedBookingDate;
      parsedValidTill = new Date(booking);
      parsedValidTill.setDate(booking.getDate() + 30);
    }

    headerTable.rows.add(
      orderUnqid, 
      customerGuid, 
      parsedBookingDate, 
      paymentTerm || '', 
      parsedValidTill, 
      branchGuid, 
      modeOfPayment || ''
    );

    // Prepare Order Items TVP
    const itemsTable = new sql.Table('dbo.OrderItemType');
    itemsTable.columns.add('unqid', sql.NVarChar(64), { nullable: false });
    itemsTable.columns.add('parent_id', sql.NVarChar(64), { nullable: false });
    itemsTable.columns.add('product_guid', sql.NVarChar(64), { nullable: true });
    itemsTable.columns.add('mfg_guid', sql.NVarChar(64), { nullable: true });
    itemsTable.columns.add('category_guid', sql.NVarChar(64), { nullable: true });
    itemsTable.columns.add('unit_guid', sql.NVarChar(64), { nullable: true });
    itemsTable.columns.add('qty', sql.Decimal(18, 4), { nullable: true });
    itemsTable.columns.add('rate', sql.Decimal(18, 4), { nullable: true });
    itemsTable.columns.add('amount', sql.Decimal(18, 4), { nullable: true });
    itemsTable.columns.add('delivery_date', sql.DateTime, { nullable: true });

    for (const item of itemsToSave) {
      const deliveryDate = parseDate(item.deliveryDate) || new Date();

      itemsTable.rows.add(
        uuidv4(),
        orderUnqid,
        productGuid,
        manuGuid || 'default',
        categoryGuid || 'default',
        unitGuid,
        item.qty,
        rate || 0,
        (rate || 0) * item.qty,
        deliveryDate
      );
    }

    const request = pool.request();
    request.input('OrderHeader', headerTable);
    request.input('OrderItems', itemsTable);
    
    await request.execute('dbo.usp_SaveOrder');

    res.json({ success: true, message: 'Order saved successfully', orderId: orderUnqid });
  } catch (err) {
    console.error('Save Order Error Details:', {
      message: err.message,
      code: err.code,
      stack: err.stack
    });
    res.status(500).json({ success: false, message: 'Failed to save order.' });
  }
});

// List Orders Route
router.get('/list', protect, async (req, res) => {
  try {
    console.log('Fetching orders for customer:', req.user.id);
    const pool = await poolPromise;
    const result = await pool.request()
      .input('customerGuid', sql.NVarChar(64), req.user.id)
      .query(`
        SELECT 
          p.unqid, 
          p.booking_date, 
          p.payment_mode,
          (SELECT STRING_AGG(CAST(prod.sm206_7 AS NVARCHAR(MAX)), ', ') 
           FROM sm1017_pc pc2 
           JOIN sm206 prod ON CAST(pc2.product_guid AS NVARCHAR(64)) = CAST(prod.sm206_2 AS NVARCHAR(64))
           WHERE pc2.parent_id = p.unqid) AS products,
          (SELECT SUM(qty) FROM sm1017_pc WHERE parent_id = p.unqid) AS total_qty
        FROM sm1017_p p
        WHERE p.customer_guid = @customerGuid
        ORDER BY p.entry_date DESC
      `);

    console.log('Orders found:', result.recordset.length);
    res.json({ success: true, orders: result.recordset });
  } catch (err) {
    console.error('List Orders Error:', err);
    res.status(500).json({ success: false, message: 'Failed to list orders.' });
  }
});

// Seed Dummy Order Route
router.post('/seed-dummy', protect, async (req, res) => {
  try {
    console.log('Seeding dummy order for customer:', req.user.id);
    const pool = await poolPromise;
    const orderUnqid = uuidv4();
    
    await pool.request()
      .input('orderUnqid', sql.NVarChar(64), orderUnqid)
      .input('customerGuid', sql.NVarChar(64), req.user.id)
      .input('bookingDate', sql.DateTime, new Date())
      .input('paymentMode', sql.NVarChar(50), 'Dummy Payment')
      .query(`
        INSERT INTO sm1017_p (unqid, customer_guid, booking_date, payment_mode, entry_date)
        VALUES (@orderUnqid, @customerGuid, @bookingDate, @paymentMode, GETDATE())
      `);

    console.log('Dummy order inserted:', orderUnqid);
    res.json({ success: true, message: 'Dummy order seeded successfully', orderId: orderUnqid });
  } catch (err) {
    console.error('Seed Dummy Order Error:', err);
    res.status(500).json({ success: false, message: 'Failed to seed dummy order.' });
  }
});

// Get Order Details for editing
router.get('/orders/:id', protect, async (req, res) => {
  try {
    const orderId = req.params.id;
    const pool = await poolPromise;
    
    // 1. Get Header
    const headerResult = await pool.request()
      .input('orderId', sql.NVarChar(64), orderId)
      .input('customerGuid', sql.NVarChar(64), req.user.id)
      .query(`SELECT unqid, customer_guid, booking_date, payment_term, valid_till, branch_guid, payment_mode FROM sm1017_p WHERE unqid = @orderId AND customer_guid = @customerGuid`);
    
    if (headerResult.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }
    
    const header = headerResult.recordset[0];
    
    // 2. Get Items
    const itemsResult = await pool.request()
      .input('orderId', sql.NVarChar(64), orderId)
      .query(`SELECT unqid, parent_id, product_guid, mfg_guid, category_guid, unit_guid, qty, rate, amount, delivery_date FROM sm1017_pc WHERE parent_id = @orderId`);
    
    const items = itemsResult.recordset;
    
    // 3. Get the primary product for the form (since the current form only handles one main product)
    const mainItem = items[0] || {};
    
    res.json({ 
      success: true, 
      order: {
        customerGuid: header.customer_guid,
        bookingDate: header.booking_date,
        paymentTerm: header.payment_term,
        validTill: header.valid_till,
        branchGuid: header.branch_guid,
        modeOfPayment: header.payment_mode,
        productGuid: mainItem.product_guid,
        unitGuid: mainItem.unit_guid,
        qty: items.reduce((sum, item) => sum + Number(item.qty), 0),
        items: items.map(item => ({
          qty: item.qty,
          deliveryDate: item.delivery_date
        }))
      } 
    });
  } catch (err) {
    console.error('Get Order Detail Error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch order details.' });
  }
});

// Update Order Route
router.put('/orders/:id', protect, async (req, res) => {
  let transaction;
  try {
    if (!isDbConnected()) {
      return res.status(503).json({ success: false, message: 'Database not connected.' });
    }
    
    const orderId = req.params.id;
    const { 
      productGuid, 
      unitGuid, 
      manuGuid,
      categoryGuid,
      paymentTerm, 
      bookingDate, 
      validTill,
      branchGuid,
      modeOfPayment,
      rate,
      items
    } = req.body;

    const parsedBookingDate = parseDate(bookingDate);
    if (!parsedBookingDate) {
      return res.status(400).json({ success: false, message: 'Invalid bookingDate format. Please use DD-MM-YYYY or YYYY-MM-DD.' });
    }

    const pool = await poolPromise;
    transaction = new sql.Transaction(pool);
    await transaction.begin();

    // 1. Update Header
    const updateResult = await transaction.request()
      .input('orderId', sql.NVarChar(64), orderId)
      .input('customerGuid', sql.NVarChar(64), req.user.id)
      .input('bookingDate', sql.DateTime, parsedBookingDate)
      .input('paymentTerm', sql.NVarChar(255), paymentTerm || '')
      .input('validTill', sql.DateTime, parseDate(validTill))
      .input('branchGuid', sql.NVarChar(64), branchGuid)
      .input('paymentMode', sql.NVarChar(50), modeOfPayment || '')
      .query(`
        UPDATE sm1017_p 
        SET booking_date = @bookingDate, payment_term = @paymentTerm, valid_till = @validTill, 
            branch_guid = @branchGuid, payment_mode = @paymentMode, modify_date = GETDATE()
        WHERE unqid = @orderId AND customer_guid = @customerGuid
      `);

    if (updateResult.rowsAffected[0] === 0) {
      await transaction.rollback();
      transaction = null;
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    // 2. Delete old items and re-insert (simplest way to handle item updates)
    await transaction.request()
      .input('orderId', sql.NVarChar(64), orderId)
      .query(`DELETE FROM sm1017_pc WHERE parent_id = @orderId`);

    const itemsTable = new sql.Table('dbo.OrderItemType');
    itemsTable.columns.add('unqid', sql.NVarChar(64), { nullable: false });
    itemsTable.columns.add('parent_id', sql.NVarChar(64), { nullable: false });
    itemsTable.columns.add('product_guid', sql.NVarChar(64), { nullable: true });
    itemsTable.columns.add('mfg_guid', sql.NVarChar(64), { nullable: true });
    itemsTable.columns.add('category_guid', sql.NVarChar(64), { nullable: true });
    itemsTable.columns.add('unit_guid', sql.NVarChar(64), { nullable: true });
    itemsTable.columns.add('qty', sql.Decimal(18, 4), { nullable: true });
    itemsTable.columns.add('rate', sql.Decimal(18, 4), { nullable: true });
    itemsTable.columns.add('amount', sql.Decimal(18, 4), { nullable: true });
    itemsTable.columns.add('delivery_date', sql.DateTime, { nullable: true });

    for (const item of (items || [])) {
      itemsTable.rows.add(
        uuidv4(),
        orderId,
        productGuid,
        manuGuid || 'default',
        categoryGuid || 'default',
        unitGuid,
        item.qty,
        rate || 0,
        (rate || 0) * item.qty,
        parseDate(item.deliveryDate) || new Date()
      );
    }

    const request = transaction.request();
    request.input('OrderItems', itemsTable);
    await request.query(`INSERT INTO sm1017_pc (unqid, parent_id, product_guid, mfg_guid, category_guid, unit_guid, qty, rate, amount, delivery_date) 
                         SELECT * FROM @OrderItems`);

    await transaction.commit();
    transaction = null;
    res.json({ success: true, message: 'Order updated successfully' });
  } catch (err) {
    if (transaction) {
      try {
        await transaction.rollback();
      } catch (rollbackErr) {
        console.error('Rollback error:', rollbackErr);
      }
    }
    console.error('Update Order Error:', err);
    res.status(500).json({ success: false, message: 'Failed to update order.' });
  }
});

// Delete Order Route
router.delete('/orders/:id', protect, async (req, res) => {
  let transaction;
  try {
    const orderId = req.params.id;
    const pool = await poolPromise;
    
    transaction = new sql.Transaction(pool);
    await transaction.begin();
    
    // 1. Delete children first to avoid FK violation
    await transaction.request()
      .input('orderId', sql.NVarChar(64), orderId)
      .query(`DELETE FROM sm1017_pc WHERE parent_id = @orderId`);
    
    // 2. Delete parent
    const result = await transaction.request()
      .input('orderId', sql.NVarChar(64), orderId)
      .input('customerGuid', sql.NVarChar(64), req.user.id)
      .query(`DELETE FROM sm1017_p WHERE unqid = @orderId AND customer_guid = @customerGuid`);

    if (result.rowsAffected[0] === 0) {
      throw new Error('Order not found or you do not have permission to delete it.');
    }

    await transaction.commit();
    res.json({ success: true, message: 'Order deleted successfully' });
  } catch (err) {
    if (transaction) {
      try {
        await transaction.rollback();
      } catch (rollbackErr) {
        console.error('Rollback error:', rollbackErr);
      }
    }
    console.error('Delete Order Error:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to delete order.' });
  }
});


module.exports = router
