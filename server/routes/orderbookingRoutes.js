const express = require('express')
const { protect } = require('../middleware/auth')
const { poolPromise, sql, isDbConnected } = require('../config/db')

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

// Get rate for a product (and manu) – branch-context can be added later
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

module.exports = router
