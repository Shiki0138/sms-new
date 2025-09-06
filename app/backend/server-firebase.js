#!/usr/bin/env node

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

// Route imports
const authRoutes = require('./routes/authRoutes');
const customerRoutes = require('./routes/customerRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const salonRoutes = require('./routes/salonRoutes');

// Middleware
const { errorHandler } = require('./middleware/errorMiddleware');

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

// Static files - serve frontend with cache control
app.use(express.static(path.join(__dirname, '../frontend'), {
  setHeaders: (res, path) => {
    // CSS files with long cache for versioned files
    if (path.endsWith('.css')) {
      if (path.includes('?v=')) {
        // Versioned CSS files can be cached for 1 year
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      } else {
        // Non-versioned CSS files cached for 1 hour
        res.setHeader('Cache-Control', 'public, max-age=3600');
      }
    }
    // JavaScript files
    else if (path.endsWith('.js')) {
      res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day
    }
    // Image files
    else if (path.match(/\.(jpg|jpeg|png|gif|ico|svg)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=604800'); // 1 week
    }
    // HTML files - no cache to ensure fresh content
    else if (path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
    // Default cache control
    else {
      res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 hour
    }
  }
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    database: 'Firebase (salon-system-138)',
    salon: 'ボタン(VOTAN)',
    features: [
      'Customer Management',
      'Appointment Scheduling', 
      'Staff Management',
      'Service Management',
      'Firebase Integration',
      'Real Salon Data'
    ]
  });
});

// API routes
app.get('/api/status', (req, res) => {
  res.json({
    status: 'SMS System Running with Firebase',
    version: '2.0.0',
    database: 'Firebase',
    project: process.env.FIREBASE_PROJECT_ID,
    salon: 'ボタン(VOTAN)',
    timestamp: new Date().toISOString()
  });
});

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/salon', salonRoutes);

// Mock auth endpoint for compatibility
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  // Simple mock authentication for VOTAN salon
  if (email === 'votan@salon.com' && password === 'votan2025') {
    res.json({
      success: true,
      user: {
        id: 'votan-admin-001',
        email: email,
        name: 'VOTAN Admin',
        salon: 'ボタン(VOTAN)',
        role: 'admin'
      },
      token: 'votan-admin-token-2025'
    });
  } else if (email === 'admin@votan.com') {
    res.json({
      success: true,
      user: {
        id: 'votan-manager-001',
        email: email,
        name: 'VOTAN Manager',
        salon: 'ボタン(VOTAN)',
        role: 'manager'
      },
      token: 'votan-manager-token-2025'
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'ログイン情報が正しくありません'
    });
  }
});

// Firebase Data Test Endpoints (for development and verification)
app.get('/api/firebase-test/salon', async (req, res) => {
  try {
    const { db } = require('../shared/firebase-config');
    const salonDoc = await db.collection('salons').doc('salon_votan_001').get();
    
    if (!salonDoc.exists) {
      return res.json({ success: false, message: 'Salon data not found' });
    }
    
    res.json({
      success: true,
      data: { id: salonDoc.id, ...salonDoc.data() }
    });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.get('/api/firebase-test/staff', async (req, res) => {
  try {
    const { db } = require('../shared/firebase-config');
    const staffSnapshot = await db.collection('staff')
      .where('salonId', '==', 'salon_votan_001')
      .get();
    
    const staffList = [];
    staffSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.isActive) {
        staffList.push({ id: doc.id, ...data });
      }
    });
    
    // JavaScriptで経験年数順にソート
    staffList.sort((a, b) => (b.experience || 0) - (a.experience || 0));
    
    res.json({
      success: true,
      count: staffList.length,
      data: staffList
    });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.get('/api/firebase-test/services', async (req, res) => {
  try {
    const { db } = require('../shared/firebase-config');
    const servicesSnapshot = await db.collection('services')
      .where('salonId', '==', 'salon_votan_001')
      .get();
    
    const servicesList = [];
    servicesSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.isActive) {
        servicesList.push({ id: doc.id, ...data });
      }
    });
    
    // JavaScriptで価格順にソート
    servicesList.sort((a, b) => (a.price || 0) - (b.price || 0));
    
    // カテゴリ別にグループ化
    const grouped = servicesList.reduce((groups, service) => {
      const category = service.category;
      if (!groups[category]) groups[category] = [];
      groups[category].push(service);
      return groups;
    }, {});
    
    res.json({
      success: true,
      count: servicesList.length,
      data: servicesList,
      grouped: grouped
    });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
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

// Settings API endpoint - this will show VOTAN's actual business hours
app.get('/api/settings', (req, res) => {
  res.json({
    success: true,
    setting: {
      businessHours: {
        monday: { isOpen: false, open: null, close: null },
        tuesday: { isOpen: false, open: null, close: null },
        wednesday: { isOpen: true, open: '09:00', close: '18:00' },
        thursday: { isOpen: true, open: '09:00', close: '18:00' },
        friday: { isOpen: true, open: '09:00', close: '18:00' },
        saturday: { isOpen: true, open: '09:00', close: '18:00' },
        sunday: { isOpen: true, open: '09:00', close: '18:00' }
      },
      serviceHours: {
        cut: { start: '09:00', end: '18:00' },
        color: { start: '09:00', end: '17:00' },
        perm: { start: '09:00', end: '17:00' },
        straight: { start: '09:00', end: '16:00' }
      },
      holidays: [],
      temporaryClosures: [],
      salon: {
        name: 'ボタン(VOTAN)',
        address: '愛知県西尾市徳永町稲場70-6',
        phone: '0563-65-5823'
      }
    }
  });
});

// Favicon handling
app.get('/favicon.ico', (req, res) => {
  res.status(204).send(); // No content for favicon
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
  } else if (req.path.startsWith('/admin')) {
    res.sendFile(path.join(__dirname, '../frontend/dashboard.html'));
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
app.use(errorHandler);

// Start server
async function startServer() {
  try {
    console.log('🚀 Starting VOTAN Firebase SMS System Server...');
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Firebase Project: ${process.env.FIREBASE_PROJECT_ID || 'not-configured'}`);
    
    const server = app.listen(PORT, HOST, () => {
      console.log(`
╔═══════════════════════════════════════╗
║    VOTAN SMS MANAGEMENT SYSTEM        ║
║         美容室ボタン専用システム        ║
║                                       ║
║  🎨 Beauty Salon: ボタン(VOTAN)       ║
║  📍 西尾市徳永町稲場70-6               ║
║  📞 0563-65-5823                      ║
║  👥 スタッフ: 7名                     ║
║  💄 サービス: 6種類                   ║
║  🔥 Firebase Real Data                ║
╚═══════════════════════════════════════╝

🌟 Server running on http://${HOST}:${PORT}
📱 Landing Page: http://${HOST}:${PORT}/landing.html
🔐 Login Page: http://${HOST}:${PORT}/login.html
📊 Dashboard: http://${HOST}:${PORT}/dashboard.html
🏥 Health Check: http://${HOST}:${PORT}/health
📡 API Status: http://${HOST}:${PORT}/api/status

📝 VOTAN Login Accounts:
   Email: votan@salon.com | Password: votan2025
   Email: admin@votan.com | Password: [any]

🔥 Firebase Status: ${process.env.FIREBASE_PROJECT_ID ? 'Live Data Connected' : 'Mock Data'}
📊 Salon Data: Real VOTAN information loaded
👥 Staff Count: 7 (including フジイ, オカベ)
💄 Services: カット¥5,800～, プレミアム美髪トリートメント等
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