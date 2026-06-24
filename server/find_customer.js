const { connectDB } = require('./config/db');

async function findCustomer() {
  try {
    const pool = await connectDB();
    const result = await pool.request().query('SELECT TOP 1 unqid FROM sm19');
    console.log('Found unqid:', result.recordset[0].unqid);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit();
  }
}

findCustomer();
