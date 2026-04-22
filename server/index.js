const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const { connectDB } = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const { log, error } = require('./utils/logger');

dotenv.config();


const app = express();
const PORT = process.env.PORT || 5006;


// Parse cookies for refresh-token flow
app.use(cookieParser());
app.use(compression());

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  log(`${req.method} ${req.path}`);
  next();
});

// Routes
  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/dashboard', require('./routes/dashboardRoutes'));
  app.use('/api/orderbooking', require('./routes/orderbookingRoutes'));
  app.use('/api/reports', require('./routes/reportRoutes'));
  // Profile endpoints
  app.use('/api/profile', require('./routes/profile'));

// Dashboard v2 route removed; using only the original protected dashboard endpoints

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: 'Route not found.' });
});

// Global error handler
app.use((err, req, res, next) => {
  error(`Unhandled error at ${req.path}`, err);
  errorHandler(err, req, res, next);
});

// Handle uncaught exceptions

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start server
const start = async () => {
  try {
    await connectDB();
    console.log('✅ Database connected');
  } catch (err) {
    console.error('Failed to connect to database:', err.message);
  }

  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/api/health`);
  });
};

start();
