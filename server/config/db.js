const sql = require('mssql');

// Prefer environment variables, fall back to existing defaults for local dev
const config = {
  server: process.env.DB_SERVER || '144.143.142.7',
  port: Number(process.env.DB_PORT) || 57805,
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || 'Guljag#123',
  database: process.env.DB_NAME || 'ac25',
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

let isConnected = false;
let pool = null;

const poolPromise = new sql.ConnectionPool(config)
  .connect()
  .then((p) => {
    isConnected = true;
    pool = p;
    console.log('Connected to SQL Server');
    return p;
  })
  .catch((err) => {
    console.error('Database connection error:', err);
    isConnected = false;
    return Promise.reject(err);
  });

const isDbConnected = () => isConnected;

const connectDB = async () => {
  if (pool) {
    return pool;
  }
  pool = await poolPromise;
  return pool;
};

const getPool = () => {
  if (!pool) {
    throw new Error('Database pool not initialized. Call connectDB() first.');
  }
  return pool;
};

module.exports = {
  sql,
  poolPromise,
  connectDB,
  getPool,
  isDbConnected,
};