const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const winston = require('winston');
require('dotenv').config();

// Import Supabase client to verify connection
const { supabase } = require('../config/supabase/client');

// Import routes
const authRoutes = require('./routes/auth-supabase');
const healthRoutes = require('./routes/health');
const customerRoutes = require('./routes/customers-supabase');
const reservationRoutes = require('./routes/reservations-supabase');
const messageRoutes = require('./routes/messages-supabase');
const staffRoutes = require('./routes/staff-supabase');
const serviceRoutes = require('./routes/services-supabase');
const dashboardRoutes = require('./routes/dashboard-supabase');
const settingsRoutes = require('./routes/settings-supabase');
const channelConfigRoutes = require('./routes/channelConfig');

// Import middleware
const { supabaseAuth, optionalAuth } = require('./middleware/supabase-auth');
const errorMiddleware = require('./middleware/errorMiddleware');

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'sms-api' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// ==================== MIDDLEWARE ====================

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", process.env.SUPABASE_URL]
    }
  }
}));

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',');
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api', limiter);

// Request logging
app.use((req, res, next) => {
  logger.info({
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

// Static files (public directory)
app.use(express.static(path.join(__dirname, '../public')));

// ==================== API ROUTES ====================

// Health check routes (public)
app.use('/api/health', healthRoutes);

// Auth routes (public)
app.use('/api/auth', authRoutes);

// Protected routes (require authentication)
app.use('/api/customers', supabaseAuth, customerRoutes);
app.use('/api/reservations', supabaseAuth, reservationRoutes);
app.use('/api/messages', supabaseAuth, messageRoutes);
app.use('/api/staff', supabaseAuth, staffRoutes);
app.use('/api/services', supabaseAuth, serviceRoutes);
app.use('/api/dashboard', supabaseAuth, dashboardRoutes);
app.use('/api/settings', supabaseAuth, settingsRoutes);
app.use('/api/channel-config', supabaseAuth, channelConfigRoutes);

// Public booking widget endpoint (optional auth)
app.use('/api/public/booking', optionalAuth, require('./routes/public-booking-supabase'));

// ==================== ERROR HANDLING ====================

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    error: 'Not found',
    message: `Cannot ${req.method} ${req.url}`
  });
});

// Global error handler
app.use(errorMiddleware);

// ==================== SERVER STARTUP ====================

async function startServer() {
  try {
    // Test Supabase connection
    logger.info('Testing Supabase connection...');
    const { error } = await supabase.from('tenants').select('count').limit(1);
    
    if (error) {
      throw new Error(`Supabase connection failed: ${error.message}`);
    }
    
    logger.info('✅ Supabase connection successful');

    // Start server
    app.listen(PORT, () => {
      logger.info(`
        🚀 SMS Server (Supabase) is running!
        ===================================
        - Local:      http://localhost:${PORT}
        - API:        http://localhost:${PORT}/api
        - Health:     http://localhost:${PORT}/api/health
        - Supabase:   ${process.env.SUPABASE_URL ? 'Connected' : 'Not configured'}
        - Environment: ${process.env.NODE_ENV || 'development'}
        ===================================
      `);
    });

    // Graceful shutdown
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

async function gracefulShutdown() {
  logger.info('Received shutdown signal, closing server gracefully...');
  
  // Give ongoing requests 10 seconds to complete
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);

  process.exit(0);
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Start the server
startServer();

module.exports = app;