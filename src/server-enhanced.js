#!/usr/bin/env node

/**
 * Enhanced Server with Security and Monitoring
 * セキュリティ強化とモニタリング機能を統合したサーバー
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const session = require('express-session');

// Enhanced security and services
const { 
  setupSecurity, 
  sessionConfig, 
  auditLogger, 
  logUserActivity,
  TwoFactorAuth,
  DataEncryption
} = require('./middleware/security-enhanced');
const BackupService = require('./services/backupService');
const MonitoringService = require('./services/monitoringService');

// Create Express app
const app = express();

// In-memory database
const db = {
  users: [],
  customers: [],
  appointments: [],
  sales: [],
  medicalRecords: [],
  settings: [],
  messages: [],
  campaigns: [],
  messageTemplates: [],
  twoFactorSecrets: [], // 2FA用
  backupSchedules: [] // バックアップスケジュール
};

// Make db globally accessible
app.locals.db = db;

// Initialize services
const backupService = new BackupService({
  backupDir: path.join(__dirname, '../backups'),
  encryptionKey: process.env.BACKUP_ENCRYPTION_KEY || 'salon-backup-key-2024'
});

const monitoringService = new MonitoringService({
  checkInterval: 30000, // 30秒ごとにチェック
  thresholds: {
    cpu: 80,
    memory: 85,
    errorRate: 5,
    responseTime: 1000
  }
});

// Session configuration
app.use(session(sessionConfig));

// Setup enhanced security
setupSecurity(app);

// Standard middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://salon-lumiere.com'] 
    : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request monitoring middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    monitoringService.recordRequest(
      req.method,
      req.path,
      duration,
      res.statusCode
    );
    
    // Audit logging for important endpoints
    if (req.path.includes('/api/') && req.method !== 'GET') {
      logUserActivity('API_REQUEST', {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      }, req.user?.id);
    }
  });
  
  next();
});

// Error tracking middleware
app.use((err, req, res, next) => {
  monitoringService.recordError(err, {
    method: req.method,
    path: req.path,
    user: req.user?.id
  });
  
  next(err);
});

// Static files
app.use(express.static(path.join(__dirname, '../public')));

// Enhanced auth middleware with audit logging
const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ message: 'Please authenticate' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'salon-lumiere-secret-key');
    const user = db.users.find(u => u.id === decoded.id);
    
    if (!user || !user.isActive) {
      throw new Error();
    }
    
    req.user = user;
    next();
  } catch (error) {
    logUserActivity('AUTH_FAILED', {
      token: token.substring(0, 10) + '...',
      ip: req.ip,
      path: req.path
    });
    
    res.status(401).json({ message: 'Please authenticate' });
  }
};

// Initialize test data with enhanced features
async function initTestData() {
  const hashedPassword = await bcrypt.hash('password123', 10);
  const testUser = {
    id: uuidv4(),
    email: 'test@salon-lumiere.com',
    password: hashedPassword,
    name: 'テストユーザー',
    salonName: 'Salon Lumière',
    phoneNumber: '090-1234-5678',
    planType: 'premium',
    isActive: true,
    emailVerified: true,
    twoFactorEnabled: false,
    twoFactorSecret: null,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  db.users.push(testUser);
  console.log('Test data initialized with enhanced security features');
}

// Health check endpoint with monitoring data
app.get('/health', async (req, res) => {
  const health = await monitoringService.performHealthCheck();
  res.json({
    status: health.status,
    timestamp: health.timestamp,
    uptime: process.uptime(),
    monitoring: monitoringService.calculateUptime(),
    checks: health.checks
  });
});

// Monitoring dashboard endpoint
app.get('/api/monitoring/dashboard', authMiddleware, (req, res) => {
  const dashboardData = monitoringService.getDashboardData();
  res.json(dashboardData);
});

// Audit log endpoint
app.get('/api/security/audit-logs', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  
  const logs = auditLogger.query({
    startDate: req.query.startDate,
    endDate: req.query.endDate,
    userId: req.query.userId,
    eventType: req.query.eventType
  });
  
  res.json({
    logs,
    total: logs.length
  });
});

// 2FA setup endpoints
app.post('/api/auth/2fa/setup', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    
    if (user.twoFactorEnabled) {
      return res.status(400).json({ message: '2FA already enabled' });
    }
    
    const secret = TwoFactorAuth.generateSecret(user.email, user.salonName);
    const qrCode = await TwoFactorAuth.generateQRCode(secret.secret, user.email, user.salonName);
    const backupCodes = TwoFactorAuth.generateBackupCodes();
    
    // 一時的に保存（確認後に有効化）
    db.twoFactorSecrets.push({
      userId: user.id,
      secret: secret.secret,
      backupCodes,
      verified: false
    });
    
    logUserActivity('2FA_SETUP_INITIATED', {
      userId: user.id
    }, user.id);
    
    res.json({
      qrCode,
      secret: secret.secret,
      backupCodes
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to setup 2FA' });
  }
});

app.post('/api/auth/2fa/verify', authMiddleware, (req, res) => {
  const { token } = req.body;
  const user = req.user;
  
  const secretData = db.twoFactorSecrets.find(s => s.userId === user.id && !s.verified);
  
  if (!secretData) {
    return res.status(400).json({ message: '2FA setup not initiated' });
  }
  
  const isValid = TwoFactorAuth.verifyToken(secretData.secret, token);
  
  if (isValid) {
    // 2FAを有効化
    user.twoFactorEnabled = true;
    user.twoFactorSecret = secretData.secret;
    secretData.verified = true;
    
    logUserActivity('2FA_ENABLED', {
      userId: user.id
    }, user.id);
    
    res.json({ message: '2FA enabled successfully' });
  } else {
    res.status(400).json({ message: 'Invalid verification code' });
  }
});

// Backup management endpoints
app.get('/api/backup/list', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  
  try {
    const backups = await backupService.listBackups({
      page: req.query.page,
      limit: req.query.limit
    });
    res.json(backups);
  } catch (error) {
    res.status(500).json({ message: 'Failed to list backups' });
  }
});

app.post('/api/backup/create', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  
  try {
    const backup = await backupService.createBackup(db, {
      type: 'manual',
      description: req.body.description || 'Manual backup',
      userId: req.user.id
    });
    
    logUserActivity('BACKUP_CREATED', {
      backupId: backup.backupId,
      type: 'manual'
    }, req.user.id);
    
    res.json(backup);
  } catch (error) {
    res.status(500).json({ message: 'Backup failed' });
  }
});

app.post('/api/backup/restore/:backupId', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  
  try {
    const result = await backupService.restoreBackup(req.params.backupId, {
      createSafetyBackup: true,
      currentData: db
    });
    
    // データベースを復元
    Object.assign(db, result.data);
    
    logUserActivity('BACKUP_RESTORED', {
      backupId: req.params.backupId
    }, req.user.id);
    
    res.json({
      message: 'Backup restored successfully',
      metadata: result.metadata
    });
  } catch (error) {
    res.status(500).json({ message: 'Restore failed' });
  }
});

// Encryption test endpoint
app.post('/api/test/encrypt', authMiddleware, (req, res) => {
  const { data } = req.body;
  const password = process.env.ENCRYPTION_KEY || 'test-encryption-key';
  
  try {
    const encrypted = DataEncryption.encrypt(data, password);
    const decrypted = DataEncryption.decrypt(encrypted, password);
    
    res.json({
      original: data,
      encrypted,
      decrypted,
      match: data === decrypted
    });
  } catch (error) {
    res.status(500).json({ message: 'Encryption test failed' });
  }
});

// Enhanced login with 2FA
app.post('/api/auth/login', async (req, res) => {
  const { email, password, twoFactorToken } = req.body;
  
  const user = db.users.find(u => u.email === email);
  if (!user) {
    logUserActivity('LOGIN_FAILED', {
      email,
      reason: 'User not found',
      ip: req.ip
    });
    return res.status(401).json({ message: 'Invalid credentials' });
  }
  
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    logUserActivity('LOGIN_FAILED', {
      email,
      reason: 'Invalid password',
      ip: req.ip
    });
    return res.status(401).json({ message: 'Invalid credentials' });
  }
  
  // 2FAチェック
  if (user.twoFactorEnabled) {
    if (!twoFactorToken) {
      return res.json({
        requiresTwoFactor: true,
        message: 'Please provide 2FA code'
      });
    }
    
    const isValidToken = TwoFactorAuth.verifyToken(user.twoFactorSecret, twoFactorToken);
    if (!isValidToken) {
      logUserActivity('2FA_FAILED', {
        userId: user.id,
        ip: req.ip
      }, user.id);
      return res.status(401).json({ message: 'Invalid 2FA code' });
    }
  }
  
  const token = jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET || 'salon-lumiere-secret-key',
    { expiresIn: '24h' }
  );
  
  logUserActivity('LOGIN_SUCCESS', {
    userId: user.id,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  }, user.id);
  
  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      salonName: user.salonName,
      planType: user.planType,
      twoFactorEnabled: user.twoFactorEnabled
    }
  });
});

// Include existing routes
require('./routes/auth')(app, db);
require('./routes/customers')(app, db);
require('./routes/appointments')(app, db);
require('./routes/sales')(app, db);
require('./routes/dashboard')(app, db);
require('./routes/medicalRecords')(app, db);
require('./routes/settings')(app, db);
require('./routes/export')(app, db);

// SMS routes
const smsRoutes = require('./routes/sms-routes');
const smsCampaigns = require('./routes/sms-campaigns');
const smsBulkEnhanced = require('./routes/sms-bulk-enhanced');
app.use('/api/sms', smsRoutes);
app.use('/api/sms', smsCampaigns);
app.use('/api/sms', smsBulkEnhanced);

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
const PORT = process.env.PORT || 3002;

async function startServer() {
  try {
    // Initialize services
    await backupService.initialize();
    await initTestData();
    
    // Start monitoring
    monitoringService.start();
    
    // Setup automatic backups
    backupService.setupDefaultSchedules(() => {
      return { ...db };
    });
    
    // Monitor service events
    monitoringService.on('alert', (alert) => {
      console.log('🚨 Alert:', alert.message);
      // TODO: Send notifications
    });
    
    monitoringService.on('healthcheck', (health) => {
      if (health.status !== 'healthy') {
        console.log('⚠️ System health:', health.status);
      }
    });
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`
╔═══════════════════════════════════════╗
║     SALON LUMIÈRE ENHANCED SYSTEM     ║
║                                       ║
║  ✨ Professional Beauty Management    ║
║  🛡️  Enhanced Security Features       ║
║  💾 Automatic Backup System           ║
║  📊 Real-time Monitoring              ║
╚═══════════════════════════════════════╝

🌟 Enhanced server is running on http://0.0.0.0:${PORT}
📚 Landing Page: http://0.0.0.0:${PORT}/landing.html
🔐 Login Page: http://0.0.0.0:${PORT}/login-new.html
📊 Dashboard: http://0.0.0.0:${PORT}/dashboard.html
🏥 Health Check: http://0.0.0.0:${PORT}/health

🆕 Enhanced Features:
   🔐 2FA Setup: http://0.0.0.0:${PORT}/api/auth/2fa/setup
   📊 Monitoring: http://0.0.0.0:${PORT}/api/monitoring/dashboard
   🔍 Audit Logs: http://0.0.0.0:${PORT}/api/security/audit-logs
   💾 Backups: http://0.0.0.0:${PORT}/api/backup/list

📝 Test Account:
   Email: test@salon-lumiere.com
   Password: password123
   
⚡ Security Features Active:
   ✅ Enhanced rate limiting
   ✅ Session management (30min timeout)
   ✅ Audit logging
   ✅ Real-time monitoring
   ✅ Automatic backups scheduled
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  monitoringService.stop();
  backupService.stopAllJobs();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  monitoringService.stop();
  backupService.stopAllJobs();
  process.exit(0);
});

startServer();