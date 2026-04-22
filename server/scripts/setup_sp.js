const fs = require('fs');
const path = require('path');
const { connectDB, sql } = require('../config/db');

async function applyStoredProcedures() {
  try {
    const pool = await connectDB();
    const sqlPath = path.join(__dirname, '../sp_create.sql');
    const sqlScript = fs.readFileSync(sqlPath, 'utf8');

    console.log('Applying stored procedures from sp_create.sql...');
    
    // SQL Server doesn't support multiple batches (GO) in a single query() call.
    // We need to split by 'GO' and execute each part.
    const batches = sqlScript.split(/\r?\nGO\r?\n/i).filter(batch => batch.trim() !== '');

    for (let i = 0; i < batches.length; i++) {
      await pool.request().query(batches[i]);
      console.log(`Batch ${i + 1}/${batches.length} applied successfully.`);
    }

    console.log('✅ All stored procedures and types applied successfully.');
  } catch (err) {
    console.error('❌ Error applying stored procedures:', err);
    process.exit(1);
  }
}

applyStoredProcedures();
