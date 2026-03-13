const sql = require('mssql');

const config = {
  server: 'NEELUPC\\CLIENT1',
  port: 57805,
  user: 'sa',
  password: 'Guljag#123',
  database: 'ac25',
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

let isConnected = false;

const poolPromise = new sql.ConnectionPool(config)
  .connect()
  .then(pool => {
    isConnected = true;
    console.log('Connected to SQL Server');
    return pool;
  })
  .catch(err => {
    console.error('Database connection error:', err);
    isConnected = false;
    return Promise.reject(err);
  });

const isDbConnected = () => isConnected;

module.exports = {
  sql,
  poolPromise,
  isDbConnected
};