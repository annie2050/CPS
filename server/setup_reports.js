const { connectDB, poolPromise } = require('./config/db');
const fs = require('fs');
const path = require('path');

async function setup() {
  try {
    const pool = await poolPromise;
    const sql = fs.readFileSync(path.join(__dirname, 'scripts/setup_reports.sql'), 'utf8');
    await pool.request().query(sql);
    console.log('✅ Complaints table created successfully');
  } catch (err) {
    console.error('❌ Error creating complaints table:', err.message);
  } finally {
    process.exit();
  }
}

setup();
