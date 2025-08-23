#!/usr/bin/env node

require('dotenv').config();

// Environment variable validation
const requiredEnvVars = ['JWT_SECRET', 'ADMIN_PASSWORD', 'ADMIN_EMAIL'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars.join(', '));
  console.error('Please create a .env file with all required variables.');
  console.error('See .env.example for reference.');
  process.exit(1);
}

// Validate JWT_SECRET strength
if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
  console.error('❌ JWT_SECRET must be at least 32 characters long for security.');
  process.exit(1);
}

// Validate ADMIN_PASSWORD strength
if (process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.length < 8) {
  console.error('❌ ADMIN_PASSWORD must be at least 8 characters long.');
  process.exit(1);
}
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');

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
  messageTemplates: []
};

// Make db globally accessible for SMS routes
app.locals.db = db;

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  }
}));
// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS 
      ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
      : ['http://localhost:3000', 'http://localhost:3001'];
    
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, '../public')));

// Validation error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      message: 'Validation error',
      errors: errors.array().map(err => ({
        field: err.param,
        message: err.msg
      }))
    });
  }
  next();
};

// Common validation rules
const validationRules = {
  email: body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  
  password: body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/)
    .withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain at least one number'),
  
  phoneNumber: body('phoneNumber')
    .optional()
    .matches(/^(\+81|0)[0-9]{9,10}$/)
    .withMessage('Invalid Japanese phone number format'),
  
  name: body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be between 1 and 100 characters'),
  
  salonName: body('salonName')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Salon name must be between 1 and 200 characters')
};

// Auth middleware
const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ message: 'Please authenticate' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = db.users.find(u => u.id === decoded.id);
    
    if (!user || !user.isActive) {
      throw new Error();
    }
    
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Please authenticate' });
  }
};

// Initialize test data
async function initTestData() {
  // Create admin user for production
  const adminHashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
  const adminUser = {
    id: uuidv4(),
    email: process.env.ADMIN_EMAIL,
    password: adminHashedPassword,
    name: '管理者',
    salonName: 'Salon Lumière',
    phoneNumber: '090-0000-0000',
    planType: 'premium',
    role: 'admin',
    isActive: true,
    emailVerified: true,
    trialEndsAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1年後
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  db.users.push(adminUser);
  
  // Create test user for development
  const hashedPassword = await bcrypt.hash('password123', 10);
  const testUser = {
    id: uuidv4(),
    email: 'test@salon-lumiere.com',
    password: hashedPassword,
    name: 'テストユーザー',
    salonName: 'テストサロン',
    phoneNumber: '090-1234-5678',
    planType: 'light',
    role: 'user',
    isActive: true,
    emailVerified: true,
    trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  db.users.push(testUser);
  
  // Create test customers
  const customers = [];
  for (let i = 1; i <= 5; i++) {
    const customer = {
      id: uuidv4(),
      userId: testUser.id,
      firstName: `名${i}`,
      lastName: `姓${i}`,
      firstNameKana: `メイ${i}`,
      lastNameKana: `セイ${i}`,
      email: `customer${i}@example.com`,
      phoneNumber: `090-0000-000${i}`,
      birthDate: new Date(1990 + i, i, i).toISOString().split('T')[0],
      gender: i % 2 === 0 ? 'female' : 'male',
      visitCount: Math.floor(Math.random() * 10) + 1,
      totalSales: Math.floor(Math.random() * 100000),
      desires: i === 1 ? '髪質を改善したい。艶のある髪になりたい。' : '',
      needs: i === 1 ? 'ダメージケアと保湿を重視したい。' : '',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    customers.push(customer);
    db.customers.push(customer);
  }
  
  // Create test appointments
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  db.appointments.push({
    id: uuidv4(),
    userId: testUser.id,
    customerId: customers[0].id,
    appointmentDate: today.toISOString().split('T')[0],
    startTime: '10:00',
    endTime: '11:30',
    services: [{ name: 'カット＆カラー', price: 8000 }],
    totalAmount: 8000,
    status: 'scheduled',
    createdAt: new Date(),
    updatedAt: new Date()
  });
  
  db.appointments.push({
    id: uuidv4(),
    userId: testUser.id,
    customerId: customers[1].id,
    appointmentDate: today.toISOString().split('T')[0],
    startTime: '14:00',
    endTime: '15:00',
    services: [{ name: 'カット', price: 4000 }],
    totalAmount: 4000,
    status: 'confirmed',
    createdAt: new Date(),
    updatedAt: new Date()
  });
  
  db.appointments.push({
    id: uuidv4(),
    userId: testUser.id,
    customerId: customers[2].id,
    appointmentDate: tomorrow.toISOString().split('T')[0],
    startTime: '11:00',
    endTime: '13:00',
    services: [{ name: 'パーマ', price: 10000 }],
    totalAmount: 10000,
    status: 'scheduled',
    createdAt: new Date(),
    updatedAt: new Date()
  });
  
  // Create test sales
  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);
  
  db.sales.push({
    id: uuidv4(),
    userId: testUser.id,
    customerId: customers[0].id,
    saleDate: lastWeek.toISOString().split('T')[0],
    items: [
      { name: 'カット', price: 4000, quantity: 1 },
      { name: 'トリートメント', price: 3000, quantity: 1 }
    ],
    subtotal: 7000,
    taxAmount: 700,
    totalAmount: 7700,
    paymentMethod: 'cash',
    paymentStatus: 'paid',
    createdAt: lastWeek,
    updatedAt: lastWeek
  });
  
  // Add channel IDs to customers for messaging
  customers.forEach((customer, index) => {
    customer.lineUserId = index < 3 ? `LINE_USER_${customer.id}` : null;
    customer.instagramUserId = index < 2 ? `IG_USER_${customer.id}` : null;
  });
  
  // Create test messages
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  db.messages.push({
    id: uuidv4(),
    userId: testUser.id,
    customerId: customers[0].id,
    channel: 'line',
    channelUserId: customers[0].lineUserId,
    direction: 'inbound',
    messageType: 'text',
    content: 'こんにちは！明日の予約についてですが、時間を変更できますか？',
    status: 'delivered',
    isRead: false,
    createdAt: yesterday,
    updatedAt: yesterday
  });
  
  db.messages.push({
    id: uuidv4(),
    userId: testUser.id,
    customerId: customers[0].id,
    channel: 'line',
    channelUserId: customers[0].lineUserId,
    direction: 'outbound',
    messageType: 'text',
    content: 'お問い合わせありがとうございます。明日のご予約の時間変更は可能です。ご希望の時間を教えていただけますか？',
    status: 'delivered',
    isRead: true,
    createdAt: new Date(yesterday.getTime() + 30 * 60000),
    updatedAt: new Date(yesterday.getTime() + 30 * 60000)
  });
  
  db.messages.push({
    id: uuidv4(),
    userId: testUser.id,
    customerId: customers[1].id,
    channel: 'email',
    channelUserId: customers[1].email,
    direction: 'outbound',
    messageType: 'text',
    content: '【Salon Lumière】ご予約確認\n\n山田様\n\n明日14:00からのカットのご予約を承りました。\nご来店をお待ちしております。',
    status: 'sent',
    createdAt: new Date(),
    updatedAt: new Date()
  });
  
  // Create test campaigns
  db.campaigns.push({
    id: uuidv4(),
    userId: testUser.id,
    name: '春の新規顧客キャンペーン',
    type: 'campaign',
    channels: ['email', 'line'],
    targetCriteria: {},
    content: {
      subject: '【Salon Lumière】春の特別キャンペーンのお知らせ',
      body: '{{lastName}} {{firstName}}様\n\nいつもSalon Lumièreをご利用いただき、ありがとうございます。\n\n春の特別キャンペーンとして、全メニュー20%OFFを実施中です！'
    },
    status: 'sent',
    sentAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    stats: {
      totalRecipients: 45,
      sent: 90,
      delivered: 88,
      opened: 65,
      clicked: 23,
      failed: 2
    },
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  });
  
  db.campaigns.push({
    id: uuidv4(),
    userId: testUser.id,
    name: '予約リマインダー',
    type: 'reminder',
    channels: ['line'],
    targetCriteria: {},
    content: {
      body: '{{fullName}}様\n\n明日{{appointmentTime}}からのご予約をお待ちしております。'
    },
    status: 'scheduled',
    scheduledAt: tomorrow,
    stats: {
      totalRecipients: 3,
      sent: 0
    },
    isRecurring: true,
    recurringSchedule: {
      frequency: 'daily',
      time: '18:00'
    },
    createdAt: new Date(),
    updatedAt: new Date()
  });
  
  // Create test message templates
  db.messageTemplates.push({
    id: uuidv4(),
    userId: testUser.id,
    name: '予約確認メール',
    category: 'appointment',
    channel: 'email',
    subject: '【{{salonName}}】ご予約確認',
    content: '{{lastName}} {{firstName}}様\n\n{{appointmentDate}} {{appointmentTime}}からの{{serviceName}}のご予約を承りました。\n\nご来店をお待ちしております。\n\n{{salonName}}',
    variables: ['lastName', 'firstName', 'salonName', 'appointmentDate', 'appointmentTime', 'serviceName'],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  // Create SMS templates for the enhanced SMS system
  db.messageTemplates.push({
    id: uuidv4(),
    userId: testUser.id,
    name: '予約リマインダーSMS',
    category: 'reminder',
    channel: 'sms',
    content: '{{lastName}}様、明日{{appointmentTime}}からのご予約をお待ちしております。変更がございましたらお早めにご連絡ください。{{salonName}}',
    variables: ['lastName', 'appointmentTime', 'salonName'],
    isActive: true,
    usageCount: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  db.messageTemplates.push({
    id: uuidv4(),
    userId: testUser.id,
    name: 'キャンペーン告知SMS',
    category: 'promotional',
    channel: 'sms',
    content: '{{firstName}}様、{{salonName}}です。特別キャンペーン実施中！{{serviceName}}が{{discount}}%オフ。ご予約はお早めに。詳細: {{url}}',
    variables: ['firstName', 'salonName', 'serviceName', 'discount', 'url'],
    isActive: true,
    usageCount: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  db.messageTemplates.push({
    id: uuidv4(),
    userId: testUser.id,
    name: '顧客復帰SMS',
    category: 'reengagement',
    channel: 'sms',
    content: '{{fullName}}様、{{salonName}}です。お久しぶりです！特別価格でご案内できるメニューがございます。お気軽にお問い合わせください。',
    variables: ['fullName', 'salonName'],
    isActive: true,
    usageCount: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  });
  
  // Create test medical records
  db.medicalRecords.push({
    id: uuidv4(),
    userId: testUser.id,
    customerId: customers[0].id,
    visitDate: lastWeek.toISOString().split('T')[0],
    services: ['カット', 'トリートメント'],
    treatmentDetails: '毛先のダメージが気になるとのことで、保湿トリートメントを実施。',
    productsUsed: ['保湿トリートメント剤A'],
    recommendations: '次回も保湿トリートメントを継続することをおすすめ。',
    beforePhotoUrl: '/images/sample-before.jpg',
    afterPhotoUrl: '/images/sample-after.jpg',
    photos: [],
    createdAt: lastWeek,
    updatedAt: lastWeek
  });
  
  console.log('Test data initialized');
  console.log(`Admin account: ${process.env.ADMIN_EMAIL} / [Protected]`);
  if (process.env.NODE_ENV !== 'production') {
    console.log('Test account: test@salon-lumiere.com / password123');
  }
}

// API Routes

// Auth routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name, salonName, phoneNumber } = req.body;
    
    // Check if user exists
    if (db.users.find(u => u.email === email)) {
      return res.status(400).json({ message: 'Email already registered' });
    }
    
    // Create user
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = {
      id: uuidv4(),
      email,
      password: hashedPassword,
      name,
      salonName,
      phoneNumber,
      planType: 'light',
      isActive: true,
      emailVerified: false,
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    db.users.push(user);
    
    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    const userResponse = { ...user };
    delete userResponse.password;
    
    res.status(201).json({
      message: 'Registration successful',
      user: userResponse,
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user
    const user = db.users.find(u => u.email === email);
    if (!user || !await bcrypt.compare(password, user.password)) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Check if active
    if (!user.isActive) {
      return res.status(403).json({ message: 'Account is deactivated' });
    }
    
    // Update last login
    user.lastLoginAt = new Date();
    
    // Generate token
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not defined');
      return res.status(500).json({ message: 'Server configuration error' });
    }
    
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    const userResponse = { ...user };
    delete userResponse.password;
    
    res.json({
      message: 'Login successful',
      user: userResponse,
      token,
      accessToken: token // 互換性のため両方のキーで返す
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed' });
  }
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  const userResponse = { ...req.user };
  delete userResponse.password;
  res.json({ user: userResponse });
});

app.put('/api/auth/profile', authMiddleware, (req, res) => {
  const { name, salonName, phoneNumber } = req.body;
  
  if (name) req.user.name = name;
  if (salonName) req.user.salonName = salonName;
  if (phoneNumber) req.user.phoneNumber = phoneNumber;
  req.user.updatedAt = new Date();
  
  const userResponse = { ...req.user };
  delete userResponse.password;
  
  res.json({
    message: 'Profile updated successfully',
    user: userResponse
  });
});

// Customer routes
app.get('/api/customers', authMiddleware, (req, res) => {
  const customers = db.customers.filter(c => c.userId === req.user.id && c.isActive);
  res.json({
    customers,
    pagination: {
      total: customers.length,
      page: 1,
      limit: 20,
      pages: 1
    }
  });
});

app.put('/api/customers/:id', authMiddleware, (req, res) => {
  const customer = db.customers.find(c => 
    c.id === req.params.id && c.userId === req.user.id
  );
  
  if (!customer) {
    return res.status(404).json({ message: 'Customer not found' });
  }
  
  Object.assign(customer, req.body);
  customer.updatedAt = new Date();
  
  res.json({
    message: 'Customer updated successfully',
    customer
  });
});

app.post('/api/customers', authMiddleware, (req, res) => {
  const customer = {
    id: uuidv4(),
    userId: req.user.id,
    ...req.body,
    visitCount: 0,
    totalSales: 0,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  db.customers.push(customer);
  res.status(201).json({
    message: 'Customer created successfully',
    customer
  });
});

app.get('/api/customers/:id', authMiddleware, (req, res) => {
  const customer = db.customers.find(c => 
    c.id === req.params.id && c.userId === req.user.id
  );
  
  if (!customer) {
    return res.status(404).json({ message: 'Customer not found' });
  }
  
  res.json({ customer });
});

// Dashboard routes
app.get('/api/dashboard/summary', authMiddleware, (req, res) => {
  const userCustomers = db.customers.filter(c => c.userId === req.user.id && c.isActive);
  const userAppointments = db.appointments.filter(a => a.userId === req.user.id);
  const userSales = db.sales.filter(s => s.userId === req.user.id);
  
  const today = new Date().toDateString();
  const todayAppointments = userAppointments.filter(a => 
    new Date(a.appointmentDate).toDateString() === today
  );
  
  const thisMonth = new Date().getMonth();
  const thisYear = new Date().getFullYear();
  const monthSales = userSales.filter(s => {
    const saleDate = new Date(s.saleDate);
    return saleDate.getMonth() === thisMonth && saleDate.getFullYear() === thisYear;
  });
  
  const todaySalesTotal = userSales
    .filter(s => new Date(s.saleDate).toDateString() === today)
    .reduce((sum, s) => sum + s.totalAmount, 0);
  
  const monthSalesTotal = monthSales
    .reduce((sum, s) => sum + s.totalAmount, 0);
  
  res.json({
    today: {
      appointments: todayAppointments.map(a => ({
        ...a,
        customer: userCustomers.find(c => c.id === a.customerId) || {}
      })),
      appointmentCount: todayAppointments.length,
      sales: {
        count: userSales.filter(s => new Date(s.saleDate).toDateString() === today).length,
        total: todaySalesTotal
      }
    },
    tomorrow: {
      appointmentCount: 0
    },
    thisMonth: {
      sales: {
        count: monthSales.length,
        total: monthSalesTotal
      }
    },
    customers: {
      total: userCustomers.length,
      newThisMonth: userCustomers.filter(c => {
        const created = new Date(c.createdAt);
        return created.getMonth() === thisMonth && created.getFullYear() === thisYear;
      }).length,
      recent: userCustomers.slice(-5).reverse()
    }
  });
});

// Appointment routes
app.get('/api/appointments', authMiddleware, (req, res) => {
  let appointments = db.appointments.filter(a => a.userId === req.user.id);
  
  // Filter by date range if provided
  if (req.query.startDate && req.query.endDate) {
    const startDate = new Date(req.query.startDate);
    const endDate = new Date(req.query.endDate);
    appointments = appointments.filter(a => {
      const aptDate = new Date(a.appointmentDate);
      return aptDate >= startDate && aptDate <= endDate;
    });
  }
  
  // Filter by specific date
  if (req.query.date) {
    const date = req.query.date;
    appointments = appointments.filter(a => a.appointmentDate === date);
  }
  
  // Filter by customer
  if (req.query.customerId) {
    appointments = appointments.filter(a => a.customerId === req.query.customerId);
  }
  
  // Add customer info
  appointments = appointments.map(apt => ({
    ...apt,
    customer: db.customers.find(c => c.id === apt.customerId)
  }));
  
  res.json({ appointments });
});

app.post('/api/appointments', authMiddleware, (req, res) => {
  const appointment = {
    id: uuidv4(),
    userId: req.user.id,
    ...req.body,
    status: 'scheduled',
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  db.appointments.push(appointment);
  res.status(201).json({
    message: 'Appointment created successfully',
    appointment
  });
});

// Sales routes
app.get('/api/sales', authMiddleware, (req, res) => {
  let sales = db.sales.filter(s => s.userId === req.user.id);
  
  // Filter by customer
  if (req.query.customerId) {
    sales = sales.filter(s => s.customerId === req.query.customerId);
  }
  
  // Filter by date range
  if (req.query.startDate && req.query.endDate) {
    const startDate = new Date(req.query.startDate);
    const endDate = new Date(req.query.endDate);
    sales = sales.filter(s => {
      const saleDate = new Date(s.saleDate);
      return saleDate >= startDate && saleDate <= endDate;
    });
  }
  
  const totalAmount = sales.reduce((sum, s) => sum + s.totalAmount, 0);
  
  res.json({
    sales: sales.map(s => ({
      ...s,
      customer: db.customers.find(c => c.id === s.customerId)
    })),
    summary: {
      totalSales: sales.length,
      totalAmount
    }
  });
});

app.post('/api/sales', authMiddleware, (req, res) => {
  const { items = [] } = req.body;
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const taxAmount = subtotal * 0.1;
  const totalAmount = subtotal + taxAmount;
  
  const sale = {
    id: uuidv4(),
    userId: req.user.id,
    ...req.body,
    subtotal,
    taxAmount,
    totalAmount,
    saleDate: req.body.saleDate || new Date(),
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  db.sales.push(sale);
  res.status(201).json({
    message: 'Sale created successfully',
    sale
  });
});

// Settings routes
app.get('/api/settings', authMiddleware, (req, res) => {
  let setting = db.settings.find(s => s.userId === req.user.id);
  
  if (!setting) {
    setting = {
      id: uuidv4(),
      userId: req.user.id,
      businessHours: {
        monday: { open: '09:00', close: '19:00', isOpen: true },
        tuesday: { open: '09:00', close: '19:00', isOpen: true },
        wednesday: { open: '09:00', close: '19:00', isOpen: true },
        thursday: { open: '09:00', close: '19:00', isOpen: true },
        friday: { open: '09:00', close: '19:00', isOpen: true },
        saturday: { open: '09:00', close: '17:00', isOpen: true },
        sunday: { open: '09:00', close: '17:00', isOpen: false }
      },
      holidays: [],
      temporaryClosures: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    db.settings.push(setting);
  }
  
  res.json({ setting });
});

app.put('/api/settings', authMiddleware, (req, res) => {
  let setting = db.settings.find(s => s.userId === req.user.id);
  
  if (!setting) {
    setting = {
      id: uuidv4(),
      userId: req.user.id,
      ...req.body,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    db.settings.push(setting);
  } else {
    Object.assign(setting, req.body);
    setting.updatedAt = new Date();
  }
  
  res.json({
    message: 'Settings updated successfully',
    setting
  });
});

app.put('/api/settings/business-hours', authMiddleware, (req, res) => {
  let setting = db.settings.find(s => s.userId === req.user.id);
  
  if (!setting) {
    setting = {
      id: uuidv4(),
      userId: req.user.id,
      businessHours: req.body.businessHours,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    db.settings.push(setting);
  } else {
    setting.businessHours = req.body.businessHours;
    setting.updatedAt = new Date();
  }
  
  res.json({
    message: 'Business hours updated successfully',
    businessHours: setting.businessHours
  });
});

app.put('/api/settings/holidays', authMiddleware, (req, res) => {
  let setting = db.settings.find(s => s.userId === req.user.id);
  
  if (!setting) {
    setting = {
      id: uuidv4(),
      userId: req.user.id,
      holidays: req.body.holidays || [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    db.settings.push(setting);
  } else {
    setting.holidays = req.body.holidays || [];
    setting.updatedAt = new Date();
  }
  
  res.json({
    message: 'Holidays updated successfully',
    holidays: setting.holidays
  });
});

app.put('/api/settings/closures', authMiddleware, (req, res) => {
  let setting = db.settings.find(s => s.userId === req.user.id);
  
  if (!setting) {
    setting = {
      id: uuidv4(),
      userId: req.user.id,
      temporaryClosures: req.body.closures || [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    db.settings.push(setting);
  } else {
    setting.temporaryClosures = req.body.closures || [];
    setting.updatedAt = new Date();
  }
  
  res.json({
    message: 'Temporary closures updated successfully',
    closures: setting.temporaryClosures
  });
});

// Medical records routes
app.get('/api/records/customer/:customerId', authMiddleware, (req, res) => {
  const records = db.medicalRecords.filter(r => 
    r.customerId === req.params.customerId && r.userId === req.user.id
  );
  res.json({ records });
});

app.post('/api/records', authMiddleware, (req, res) => {
  const record = {
    id: uuidv4(),
    userId: req.user.id,
    ...req.body,
    photos: [],
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  db.medicalRecords.push(record);
  res.status(201).json({
    message: 'Medical record created successfully',
    record
  });
});

app.post('/api/records/:id/photos', authMiddleware, (req, res) => {
  const record = db.medicalRecords.find(r => 
    r.id === req.params.id && r.userId === req.user.id
  );
  
  if (!record) {
    return res.status(404).json({ message: 'Record not found' });
  }
  
  // Simulate photo upload
  const photoUrl = `/uploads/photo_${Date.now()}.jpg`;
  
  if (req.body.type === 'before') {
    record.beforePhotoUrl = photoUrl;
  } else if (req.body.type === 'after') {
    record.afterPhotoUrl = photoUrl;
  } else {
    if (!record.photos) record.photos = [];
    record.photos.push({
      url: photoUrl,
      caption: req.body.caption || '',
      uploadedAt: new Date()
    });
  }
  
  record.updatedAt = new Date();
  
  res.json({
    message: 'Photo uploaded successfully',
    record
  });
});

// Message routes
app.get('/api/messages', authMiddleware, (req, res) => {
  let messages = db.messages.filter(m => m.userId === req.user.id);
  
  // Filter by customer
  if (req.query.customerId) {
    messages = messages.filter(m => m.customerId === req.query.customerId);
  }
  
  // Filter by channel
  if (req.query.channel) {
    messages = messages.filter(m => m.channel === req.query.channel);
  }
  
  // Filter by direction
  if (req.query.direction) {
    messages = messages.filter(m => m.direction === req.query.direction);
  }
  
  // Sort by date
  messages.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  // Group by conversation thread
  const conversations = {};
  messages.forEach(msg => {
    const key = msg.customerId || msg.channelUserId;
    if (!conversations[key]) {
      conversations[key] = {
        customerId: msg.customerId,
        customer: db.customers.find(c => c.id === msg.customerId),
        channel: msg.channel,
        channelUserId: msg.channelUserId,
        lastMessage: msg,
        unreadCount: 0,
        messages: []
      };
    }
    conversations[key].messages.push(msg);
    if (msg.direction === 'inbound' && !msg.isRead) {
      conversations[key].unreadCount++;
    }
  });
  
  res.json({
    conversations: Object.values(conversations),
    totalMessages: messages.length
  });
});

app.post('/api/messages', authMiddleware, async (req, res) => {
  const message = {
    id: uuidv4(),
    userId: req.user.id,
    ...req.body,
    direction: 'outbound',
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  // Simulate sending to external platform
  setTimeout(() => {
    message.status = 'sent';
    message.externalMessageId = `${message.channel}_${Date.now()}`;
    message.updatedAt = new Date();
  }, 1000);
  
  db.messages.push(message);
  res.status(201).json({
    message: 'Message sent successfully',
    data: message
  });
});

app.put('/api/messages/:id/read', authMiddleware, (req, res) => {
  const message = db.messages.find(m => 
    m.id === req.params.id && m.userId === req.user.id
  );
  
  if (!message) {
    return res.status(404).json({ message: 'Message not found' });
  }
  
  message.isRead = true;
  message.readAt = new Date();
  message.updatedAt = new Date();
  
  res.json({
    message: 'Message marked as read',
    data: message
  });
});

// Campaign routes
app.get('/api/campaigns', authMiddleware, (req, res) => {
  const campaigns = db.campaigns.filter(c => c.userId === req.user.id);
  res.json({ campaigns });
});

app.post('/api/campaigns', authMiddleware, (req, res) => {
  const campaign = {
    id: uuidv4(),
    userId: req.user.id,
    ...req.body,
    status: 'draft',
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  db.campaigns.push(campaign);
  res.status(201).json({
    message: 'Campaign created successfully',
    campaign
  });
});

app.post('/api/campaigns/:id/send', authMiddleware, async (req, res) => {
  const campaign = db.campaigns.find(c => 
    c.id === req.params.id && c.userId === req.user.id
  );
  
  if (!campaign) {
    return res.status(404).json({ message: 'Campaign not found' });
  }
  
  // Get target customers based on criteria
  let targetCustomers = db.customers.filter(c => c.userId === req.user.id && c.isActive);
  
  // Apply targeting criteria
  if (campaign.targetCriteria.lastVisitDays) {
    const { min, max } = campaign.targetCriteria.lastVisitDays;
    const now = new Date();
    targetCustomers = targetCustomers.filter(c => {
      if (!c.lastVisitDate) return min > 0;
      const daysSinceVisit = Math.floor((now - new Date(c.lastVisitDate)) / (1000 * 60 * 60 * 24));
      return daysSinceVisit >= (min || 0) && (!max || daysSinceVisit <= max);
    });
  }
  
  if (campaign.targetCriteria.visitCount) {
    const { min, max } = campaign.targetCriteria.visitCount;
    targetCustomers = targetCustomers.filter(c => {
      const visits = c.visitCount || 0;
      return visits >= (min || 0) && (!max || visits <= max);
    });
  }
  
  if (campaign.targetCriteria.tags && campaign.targetCriteria.tags.length > 0) {
    targetCustomers = targetCustomers.filter(c => {
      return c.tags && campaign.targetCriteria.tags.some(tag => c.tags.includes(tag));
    });
  }
  
  // Create messages for each target customer
  const messages = [];
  targetCustomers.forEach(customer => {
    campaign.channels.forEach(channel => {
      const channelUserId = channel === 'email' ? customer.email : 
                           channel === 'line' ? customer.lineUserId : 
                           customer.instagramUserId;
      
      if (channelUserId) {
        const message = {
          id: uuidv4(),
          userId: req.user.id,
          customerId: customer.id,
          channel,
          channelUserId,
          direction: 'outbound',
          messageType: 'text',
          content: personalizeContent(campaign.content.body, customer),
          status: 'pending',
          metadata: { campaignId: campaign.id },
          createdAt: new Date(),
          updatedAt: new Date()
        };
        messages.push(message);
        db.messages.push(message);
      }
    });
  });
  
  // Update campaign status
  campaign.status = 'sending';
  campaign.sentAt = new Date();
  campaign.stats.totalRecipients = targetCustomers.length;
  campaign.stats.sent = messages.length;
  campaign.updatedAt = new Date();
  
  res.json({
    message: 'Campaign sent successfully',
    campaign,
    recipientCount: targetCustomers.length,
    messageCount: messages.length
  });
});

// Message template routes
app.get('/api/templates', authMiddleware, (req, res) => {
  const templates = db.messageTemplates.filter(t => t.userId === req.user.id && t.isActive);
  res.json({ templates });
});

app.post('/api/templates', authMiddleware, (req, res) => {
  const template = {
    id: uuidv4(),
    userId: req.user.id,
    ...req.body,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  db.messageTemplates.push(template);
  res.status(201).json({
    message: 'Template created successfully',
    template
  });
});

// Helper function to personalize message content
function personalizeContent(content, customer) {
  return content
    .replace(/{{firstName}}/g, customer.firstName || '')
    .replace(/{{lastName}}/g, customer.lastName || '')
    .replace(/{{fullName}}/g, `${customer.lastName || ''} ${customer.firstName || ''}`)
    .replace(/{{salonName}}/g, 'Salon Lumière')
    .replace(/{{lastVisitDate}}/g, customer.lastVisitDate ? 
      new Date(customer.lastVisitDate).toLocaleDateString('ja-JP') : '初回');
}

// SMS Blast Enhancement Routes
const smsCampaignRoutes = require('./routes/sms-campaigns');
const smsBulkEnhancedRoutes = require('./routes/sms-bulk-enhanced');

// Mount SMS enhancement routes
app.use('/api/sms', authMiddleware, smsCampaignRoutes);
app.use('/api/sms', authMiddleware, smsBulkEnhancedRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err, req, res, next) => {
  // Log security-related errors with more detail
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    console.error(`🔒 Security Error [${err.name}]:`, {
      message: err.message,
      timestamp: new Date().toISOString(),
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    return res.status(401).json({
      message: 'Authentication failed',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Invalid or expired token'
    });
  }
  
  // Log general errors
  console.error('🚨 Application Error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl,
    ip: req.ip
  });
  
  // Don't leak sensitive information in production
  const message = process.env.NODE_ENV === 'production' ? 
    'Internal server error' : err.message || 'Internal server error';
    
  res.status(err.status || 500).json({
    message,
    error: process.env.NODE_ENV === 'development' ? {
      stack: err.stack,
      name: err.name
    } : {}
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Server configuration
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

async function startServer() {
  try {
    // Initialize test data
    await initTestData();
    
    // Start server
    const server = app.listen(PORT, HOST, () => {
      console.log(`🌟 Salon Lumière server is running on http://${HOST}:${PORT}`);
      console.log(`📚 Landing Page: http://${HOST}:${PORT}/landing.html`);
      console.log(`🔐 Login Page: http://${HOST}:${PORT}/login-new.html`);
      console.log(`📊 Dashboard: http://${HOST}:${PORT}/dashboard.html`);
      console.log(`🏥 Health Check: http://${HOST}:${PORT}/health`);
      console.log('\n📱 SMS Blast Enhancement Features:');
      console.log(`   📋 Campaigns: http://${HOST}:${PORT}/api/sms/campaigns`);
      console.log(`   📝 Templates: http://${HOST}:${PORT}/api/sms/templates`);
      console.log(`   🎯 Enhanced Bulk: http://${HOST}:${PORT}/api/sms/bulk`);
      console.log(`   📊 Service Status: http://${HOST}:${PORT}/api/sms/status`);
      console.log('\n📝 Admin Account:');
      console.log(`   Email: ${process.env.ADMIN_EMAIL}`);
      if (process.env.NODE_ENV !== 'production') {
        console.log('\n📝 Test Account:');
        console.log('   Email: test@salon-lumiere.com');
        console.log('   Password: password123');
      }
    });
    
    // Graceful shutdown
    const gracefulShutdown = (signal) => {
      console.log(`\nReceived ${signal}, shutting down gracefully...`);
      
      server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
      });
      
      setTimeout(() => {
        console.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };
    
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Display startup banner
console.log(`
╔═══════════════════════════════════════╗
║         SALON LUMIÈRE SYSTEM          ║
║                                       ║
║  ✨ Professional Beauty Management    ║
║  👥 Customer Relationship System      ║
║  📅 Appointment Scheduling            ║
║  💰 Sales & Analytics                 ║
║  📋 Medical Records                   ║
╚═══════════════════════════════════════╝
`);

startServer();