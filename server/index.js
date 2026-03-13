const express = require('express');
const cors = require('cors');
const { poolPromise, isDbConnected } = require('./config/db');
const authRoutes = require('./routes/auth');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);

app.get('/api/health', (req, res) => {
  const dbStatus = isDbConnected();
  res.json({ 
    status: 'ok', 
    message: 'Customer Portal Service is running',
    database: dbStatus ? 'connected' : 'not connected'
  });
});

async function startServer() {
  try {
    await poolPromise;
    console.log('Connected to SQL Server');

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });

  } catch (err) {
    console.error('Database connection failed:', err);
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT} (without database)`);
    });
  }
}

startServer();
