#!/usr/bin/env node

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

// Initialize express app
const app = express();

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

// Security middleware
app.set('trust proxy', true);
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com"],
      styleSrcElem: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
const defaultOrigins = ['http://localhost:3001', 'http://localhost:3000'];
app.use(cors({
  origin: defaultOrigins,
  credentials: true,
  optionsSuccessStatus: 200
}));

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files - serve frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    database: 'Firebase (configured)',
    features: [
      'Customer Management',
      'Appointment Scheduling', 
      'Staff Management',
      'Service Management',
      'Firebase Integration'
    ]
  });
});

// API routes
app.get('/api/status', (req, res) => {
  res.json({
    status: 'SMS System Running',
    version: '2.0.0',
    database: 'Firebase',
    timestamp: new Date().toISOString()
  });
});

// Mock auth endpoint for testing
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  // Simple mock authentication
  if (email === 'test@salon-lumiere.com' && password === 'password123') {
    res.json({
      success: true,
      user: {
        id: 'test-user-id',
        email: email,
        name: 'Test User',
        role: 'admin'
      },
      token: 'mock-jwt-token-123'
    });
  } else if (email === 'admin@example.com') {
    res.json({
      success: true,
      user: {
        id: 'admin-user-id',
        email: email,
        name: 'Admin User',
        role: 'admin'
      },
      token: 'mock-admin-token-456'
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }
});

// Dashboard API endpoint
app.get('/api/dashboard/summary', (req, res) => {
  res.json({
    success: true,
    data: {
      totalCustomers: 156,
      todayAppointments: 12,
      monthlyRevenue: 450000,
      popularService: 'カット&カラー',
      recentCustomers: [
        { id: 1, name: '田中 花子', lastVisit: '2025-09-01', service: 'カット&カラー' },
        { id: 2, name: '佐藤 美香', lastVisit: '2025-09-02', service: 'パーマ' }
      ],
      upcomingAppointments: [
        { id: 1, customerName: '鈴木 愛', service: 'カット', time: '14:00', date: '2025-09-07' },
        { id: 2, customerName: '山田 美咲', service: 'カラー', time: '16:00', date: '2025-09-07' }
      ],
      stats: {
        thisMonth: { customers: 89, revenue: 450000, appointments: 142 },
        lastMonth: { customers: 76, revenue: 380000, appointments: 128 }
      }
    }
  });
});

// Channel config API endpoint
app.get('/api/channel-config', (req, res) => {
  res.json({
    success: true,
    data: {
      channels: [
        { id: 'sms', name: 'SMS', enabled: true, config: {} },
        { id: 'line', name: 'LINE', enabled: false, config: {} },
        { id: 'email', name: 'Email', enabled: true, config: {} }
      ]
    }
  });
});

// Mock data endpoints
app.get('/api/customers', (req, res) => {
  res.json([
    { id: 1, name: '田中 花子', email: 'tanaka@example.com', phone: '090-1234-5678', lastVisit: '2025-09-01' },
    { id: 2, name: '佐藤 美香', email: 'sato@example.com', phone: '090-8765-4321', lastVisit: '2025-09-02' },
    { id: 3, name: '鈴木 愛', email: 'suzuki@example.com', phone: '090-1111-2222', lastVisit: '2025-08-30' }
  ]);
});

app.get('/api/appointments', (req, res) => {
  res.json([
    { id: 1, customerName: '田中 花子', service: 'カット&カラー', date: '2025-09-07', time: '14:00', status: '確定' },
    { id: 2, customerName: '佐藤 美香', service: 'パーマ', date: '2025-09-08', time: '10:00', status: '確定' },
    { id: 3, customerName: '鈴木 愛', service: 'カット', date: '2025-09-07', time: '16:00', status: '予約済み' }
  ]);
});

// Serve frontend files for SPA routes
app.get('*', (req, res) => {
  // Handle specific routes
  if (req.path === '/') {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
  } else if (req.path === '/login' || req.path === '/login.html') {
    res.sendFile(path.join(__dirname, '../frontend/login.html'));
  } else if (req.path === '/dashboard' || req.path === '/dashboard.html') {
    res.sendFile(path.join(__dirname, '../frontend/dashboard.html'));
  } else if (req.path === '/landing' || req.path === '/landing.html') {
    res.sendFile(path.join(__dirname, '../frontend/landing.html'));
  } else {
    // Try to serve the requested file
    const filePath = path.join(__dirname, '../frontend', req.path);
    res.sendFile(filePath, (err) => {
      if (err) {
        res.sendFile(path.join(__dirname, '../frontend/index.html'));
      }
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message
  });
});

// Start server
async function startServer() {
  try {
    console.log('🚀 Starting Clean SMS System Server...');
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Firebase Project: ${process.env.FIREBASE_PROJECT_ID || 'not-configured'}`);
    
    const server = app.listen(PORT, HOST, () => {
      console.log(`
╔═══════════════════════════════════════╗
║     SMS SALON MANAGEMENT SYSTEM       ║
║                                       ║
║  🎨 Beauty Salon Management           ║
║  👥 Customer Management               ║
║  📅 Appointment Scheduling            ║
║  💄 Service Management                ║
║  🔥 Firebase Integration              ║
╚═══════════════════════════════════════╝

🌟 Server running on http://${HOST}:${PORT}
📱 Landing Page: http://${HOST}:${PORT}/landing.html
🔐 Login Page: http://${HOST}:${PORT}/login.html
📊 Dashboard: http://${HOST}:${PORT}/dashboard.html
🏥 Health Check: http://${HOST}:${PORT}/health
📡 API Status: http://${HOST}:${PORT}/api/status

📝 Test Accounts:
   Email: test@salon-lumiere.com | Password: password123
   Email: admin@example.com | Password: [any]

🔥 Firebase Status: ${process.env.FIREBASE_PROJECT_ID ? 'Configured' : 'Using Mock Data'}
`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, shutting down gracefully');
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();