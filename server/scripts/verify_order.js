const { connectDB, sql } = require('../config/db');

async function verify() {
  try {
    const pool = await connectDB();
    const customerGuid = '9E788529-375A-4BAA-96C5-BC0156B977F4';
    
    const result = await pool.request()
      .input('customerGuid', sql.NVarChar(64), customerGuid)
      .query(`SELECT unqid, booking_date, payment_mode FROM sm1017_p WHERE customer_guid = @customerGuid`);

    if (result.recordset.length > 0) {
      console.log(`✅ Found ${result.recordset.length} order(s) for customer ${customerGuid}`);
      console.table(result.recordset);
    } else {
      console.log(`❌ No orders found for customer ${customerGuid}`);
    }
  } catch (err) {
    console.error('Error verifying order:', err);
  }
}

verify();
