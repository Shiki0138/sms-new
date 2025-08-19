const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');

// Import routes and middleware
const smsRoutes = require('./routes/sms-routes');
const authRoutes = require('./routes/authRoutes');
const customerRoutes = require('./routes/customerRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const subscriptionRoutes = require('./routes/subscription');
const googleCalendarRoutes = require('./routes/googleCalendar');
const { logRequest } = require('./middleware/auth');
const config = require('../sms-service/src/config');

// Import services
const SMSRemindersService = require('./services/smsReminders');

// Initialize express app
const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Tenant-ID']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Global rate limiting
const globalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: true
});

app.use(globalRateLimit);

// Request logging
app.use(logRequest);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'SMS System',
    version: '1.0.0',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'SMS System API',
    version: '1.0.0',
    description: 'Comprehensive SMS management system with multi-provider support',
    endpoints: {
      sms: {
        'POST /api/sms/send': 'Send single SMS message',
        'POST /api/sms/bulk': 'Send bulk SMS messages',
        'GET /api/sms/status/:jobId': 'Get SMS delivery status',
        'GET /api/sms/stats': 'Get service statistics',
        'GET /api/sms/analytics': 'Get SMS analytics data',
        'POST /api/sms/webhook/:provider': 'Webhook endpoint for delivery updates'
      },
      system: {
        'GET /health': 'System health check',
        'GET /api': 'API documentation'
      }
    },
    authentication: {
      type: 'Bearer Token (JWT)',
      header: 'Authorization: Bearer <token>'
    },
    rateLimit: {
      global: '1000 requests per 15 minutes per IP',
      sms: '100 requests per 15 minutes per tenant',
      bulk: '10 requests per 15 minutes per tenant'
    }
  });
});

// Serve static files
app.use(express.static('public'));
app.use('/public', express.static('public'));
app.use('/css', express.static('public/css'));
app.use('/js', express.static('public/js'));
app.use('/assets', express.static('public/assets'));

// Serve index.html for root path
app.get('/', (req, res) => {
  res.sendFile('index.html', { root: 'public' });
});

// Serve login.html for /login path
app.get('/login', (req, res) => {
  res.sendFile('login.html', { root: 'public' });
});

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/sms', smsRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/google-calendar', googleCalendarRoutes);

// Public API routes for booking widget
app.use('/api/public/salons/:salonId', require('./routes/publicBooking'));

// 404 handler for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);

  // Handle validation errors
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      error: 'Invalid JSON payload',
      message: 'Request body contains invalid JSON'
    });
  }

  // Handle payload too large errors
  if (error.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      error: 'Payload too large',
      message: 'Request body exceeds size limit'
    });
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Invalid token',
      message: error.message
    });
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Token expired',
      message: 'Please refresh your authentication token'
    });
  }

  // Handle rate limit errors
  if (error.status === 429) {
    return res.status(429).json({
      success: false,
      error: 'Rate limit exceeded',
      message: 'Too many requests, please try again later',
      retryAfter: error.retryAfter
    });
  }

  // Generic error response
  res.status(error.status || 500).json({
    success: false,
    error: error.status === 500 ? 'Internal server error' : (error.message || 'Unknown error'),
    message: process.env.NODE_ENV === 'development' ? error.stack : 'An error occurred processing your request',
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id'] || 'unknown'
  });
});

// Graceful shutdown handler
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  process.exit(0);
});

module.exports = app;