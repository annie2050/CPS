const sql = require('mssql');

let isDbConnected = false;

const config = {
  server: 'localhost',
  port: 57805,
  user: 'sa',
  password: 'Guljag#123',
  database: 'ac25',
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

sql.connect(config)
  .then(() => console.log("Connected"))
  .catch(err => console.log(err));

// const poolPromise = new sql.ConnectionPool(config)
//   .connect()
//   .then(pool => {
//     isDbConnected = true;
//     console.log('Connected to SQL Server');
//     return pool;
//   })
//   .catch(err => {
//     isDbConnected = false;
//     console.log('Server running. Database not connected.');
//     console.log('Error:', err.message);
//   });

// module.exports = {
//   sql,
//   poolPromise,
//   isDbConnected: () => isDbConnected
// };
