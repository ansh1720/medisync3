/**
 * MediSync Backend Server
 * Main Express server with MongoDB connection and Socket.IO
 * Updated: 2025-12-28 - WHO/CDC/PubMed News Integration
 */

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Startup validation

// Route imports
const authRoutes = require('./routes/authRoutes');
const diseaseRoutes = require('./routes/diseaseRoutes');

const app = express();
const server = createServer(app);

// Trust proxy - required for Render deployment
app.set('trust proxy', 1);

// Socket.IO setup
const { initializeSocket } = require('./utils/socket');
const { io, broadcastAlert } = initializeSocket(server);

// Appointment reminder scheduler
const { startAppointmentReminder } = require('./utils/appointmentReminder');

// Global middleware
app.use(helmet());
app.use(compression());

// CORS configuration - allow both development and production origins
const allowedOrigins = [
  process.env.CLIENT_URL || "http://localhost:3000",
  "http://localhost:5173",
  "https://localhost:5173",
  "http://localhost:3000",
  "https://localhost:3000",
  "https://ansh1720.github.io",
  "https://ansh1720.github.io/medisync2"
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn('CORS rejected origin:', origin);
      callback(new Error('CORS policy: origin not allowed'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Production rate limit for medical API
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  // Skip rate limiting in development for localhost
  skip: (req) => {
    if (process.env.NODE_ENV === 'development') {
      return req.ip === '127.0.0.1' || req.ip === '::1' || req.ip.includes('localhost');
    }
    return false;
  }
});
app.use('/api/', limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ Connected to MongoDB');
  // Start appointment reminder scheduler after DB connection
  startAppointmentReminder();
})
.catch((error) => {
  console.error('❌ MongoDB connection error:', error);
  process.exit(1);
});

// Routes
app.get('/api', (req, res) => {
  res.status(200).json({ 
    message: 'MediSync API is running', 
    status: 'ok', 
    timestamp: new Date().toISOString() 
  });
});
app.use('/api/auth', authRoutes);
app.use('/api/diseases', diseaseRoutes);
app.use('/api/risk', require('./routes/riskRoutes'));
app.use('/api/equipment', require('./routes/equipmentRoutes'));
app.use('/api/hospitals', require('./routes/hospitalRoutes'));
app.use('/api/consultation', require('./routes/consultationRoutes'));
app.use('/api/forum', require('./routes/forumRoutes'));
// Health news from WHO, CDC, and PubMed
app.use('/api/news', require('./routes/newsRoutes'));
app.use('/api/verification', require('./routes/verificationRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    },
    message: 'MediSync API is running'
  });
});

// Make io available to routes for any remaining legacy code
app.set('io', io);

// Global error handler
app.use((error, req, res, next) => {
  console.error('Error:', error);
  
  // Mongoose validation error
  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map(err => err.message);
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }
  
  // Mongoose duplicate key error
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];
    return res.status(400).json({
      success: false,
      message: `${field} already exists`,
    });
  }
  
  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
  
  // Default error
  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;