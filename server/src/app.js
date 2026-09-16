const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const apiRoutes = require('./routes');
const errorHandler = require('./middlewares/error.middleware');

const app = express();

// Security Middlewares
app.use(helmet({
  crossOriginResourcePolicy: false,
}));

// CORS config - allow all for development
app.use(cors());

// Parsing Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is healthy'
  });
});

// API Routes
app.use('/api/v1', apiRoutes);

// Serve uploaded documents statically (Requires path module)
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

// 404 Handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Resource not found'
    }
  });
});

// Global Error Handler
app.use(errorHandler);

module.exports = app;
