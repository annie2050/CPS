const sql = require('mssql');
require('dotenv').config();

const sqlConfig = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || 'Guljag#123',
  server: process.env.DB_SERVER || '144.143.142.7',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 57805,
  database: process.env.DB_NAME || 'ac25',
  options: {
    encrypt: process.env.DB_ENCRYPT ? process.env.DB_ENCRYPT === 'true' : false,
    trustServerCertificate: true,
    enableArithAbort: true,
  },
  pool: {
    max: process.env.DB_POOL_MAX ? Number(process.env.DB_POOL_MAX) : 10,
    min: process.env.DB_POOL_MIN ? Number(process.env.DB_POOL_MIN) : 0,
    idleTimeoutMillis: process.env.DB_POOL_IDLE_MS ? Number(process.env.DB_POOL_IDLE_MS) : 30000,
  },
};

let _isConnected = false;

// Use a single shared connection pool promise across the app.
const poolPromise = new sql.ConnectionPool(sqlConfig)
  .connect()
  .then((pool) => {
    _isConnected = true;
    console.log('✅ Connected to MSSQL');
    return pool;
  })
  .catch((err) => {
    _isConnected = false;
    console.error('❌ DB error:', err?.message || err);
    // Allow app to boot; routes can check isDbConnected()
    return null;
  });

async function connectDB() {
  const pool = await poolPromise;
  if (!pool) {
    throw new Error('Database connection unavailable');
  }
  return pool;
}

function isDbConnected() {
  return _isConnected;
}

module.exports = { sql, poolPromise, connectDB, isDbConnected };