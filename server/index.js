const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const { isDbConnected } = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;

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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Database: not connected');
});
