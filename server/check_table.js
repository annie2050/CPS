const { connectDB } = require('./config/db');

async function checkTable() {
  try {
    const pool = await connectDB();
    const result = await pool.request().query('SELECT TOP 1 * FROM users');
    console.log('Columns:', Object.keys(result.recordset[0]));
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit();
  }
}

checkTable();
