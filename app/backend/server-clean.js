#!/usr/bin/env node

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

// Initialize express app
const app = express();

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

// 認証ミドルウェア
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: '認証トークンが必要です' 
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ 
        success: false, 
        message: '無効なトークンです' 
      });
    }
    req.user = user;
    next();
  });
};

// パスワードハッシュ化ヘルパー
const hashPassword = async (password) => {
  const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
  return await bcrypt.hash(password, rounds);
};

// パスワード検証ヘルパー
const verifyPassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

// JWTトークン生成
const generateToken = (userId, email, role = 'user') => {
  return jwt.sign(
    { userId, email, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRY || '8h' }
  );
};

// Security middleware
app.set('trust proxy', true);
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com"],
      styleSrcElem: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      scriptSrcAttr: ["'unsafe-inline'"],
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

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 900000, // 15分
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100, // 最大100リクエスト
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil(parseInt(process.env.RATE_LIMIT_WINDOW || 900000) / 60000)
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

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
  } else if (email === 'votan@salon.com' && password === 'votan2025') {
    res.json({
      success: true,
      user: {
        id: 'votan-user-id',
        email: email,
        name: 'VOTAN管理者',
        role: 'admin',
        salonName: 'ボタン(VOTAN)',
        salonId: 'votan-salon-001'
      },
      token: 'votan-admin-token-789'
    });
  } else if (email === 'admin@votan.com') {
    res.json({
      success: true,
      user: {
        id: 'votan-admin-id',
        email: email,
        name: 'VOTAN管理者',
        role: 'admin',
        salonName: 'ボタン(VOTAN)',
        salonId: 'votan-salon-001'
      },
      token: 'votan-admin-token-999'
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
  try {
    // Calculate real-time statistics based on actual data
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    // Today's appointments
    const todayAppointments = appointments.filter(apt => 
      apt.appointmentDate === today
    );

    // This month's appointments
    const thisMonthAppointments = appointments.filter(apt => {
      const aptDate = new Date(apt.appointmentDate);
      return aptDate.getMonth() === currentMonth && aptDate.getFullYear() === currentYear;
    });

    // Calculate monthly revenue
    const monthlyRevenue = thisMonthAppointments.reduce((total, apt) => {
      return total + apt.services.reduce((sum, service) => sum + service.price, 0);
    }, 0);

    // Most popular service
    const serviceCount = {};
    appointments.forEach(apt => {
      apt.services.forEach(service => {
        serviceCount[service.name] = (serviceCount[service.name] || 0) + 1;
      });
    });
    const popularService = Object.keys(serviceCount).reduce((a, b) => 
      serviceCount[a] > serviceCount[b] ? a : b
    ) || 'カット';

    // Recent customers (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentCustomers = customers
      .filter(c => c.lastVisit && new Date(c.lastVisit) >= sevenDaysAgo)
      .map(c => ({
        id: c.id,
        name: `${c.lastName} ${c.firstName}`,
        lastVisit: c.lastVisit,
        service: appointments
          .filter(apt => apt.customerId === c.id)
          .sort((a, b) => new Date(b.appointmentDate) - new Date(a.appointmentDate))[0]?.service || '不明'
      }))
      .slice(0, 5);

    // Upcoming appointments (next 3 days)
    const threeDaysLater = new Date();
    threeDaysLater.setDate(threeDaysLater.getDate() + 3);
    const upcomingAppointments = appointments
      .filter(apt => {
        const aptDate = new Date(apt.appointmentDate);
        return aptDate >= new Date() && aptDate <= threeDaysLater && apt.status !== 'cancelled';
      })
      .sort((a, b) => new Date(a.appointmentDate + 'T' + a.startTime) - new Date(b.appointmentDate + 'T' + b.startTime))
      .slice(0, 5)
      .map(apt => ({
        id: apt.id,
        customerName: apt.customerName,
        service: apt.service,
        time: apt.startTime,
        date: apt.appointmentDate,
        staff: apt.staffName
      }));

    res.json({
      success: true,
      data: {
        // VOTAN Beauty Salon specific data
        salonInfo: {
          name: 'ボタン(VOTAN)',
          location: '東京都',
          established: '2020年',
          staffCount: staff.length
        },
        totalCustomers: customers.length,
        todayAppointments: todayAppointments.length,
        monthlyRevenue: monthlyRevenue,
        popularService: popularService,
        recentCustomers: recentCustomers.length > 0 ? recentCustomers : [
          { id: 1, name: '田中 花子', lastVisit: '2025-09-01', service: 'カット&カラー' },
          { id: 2, name: '佐藤 美香', lastVisit: '2025-09-02', service: 'パーマ' }
        ],
        upcomingAppointments: upcomingAppointments.length > 0 ? upcomingAppointments : [
          { id: 1, customerName: '鈴木 愛', service: 'カット', time: '14:00', date: '2025-09-07', staff: 'スタイリスト佐藤' },
          { id: 2, customerName: '田中 花子', service: 'カラー', time: '16:00', date: '2025-09-07', staff: 'スタイリスト山田' }
        ],
        stats: {
          thisMonth: { 
            customers: customers.filter(c => c.memberSince?.startsWith('2025-09')).length, 
            revenue: monthlyRevenue, 
            appointments: thisMonthAppointments.length 
          },
          lastMonth: { 
            customers: customers.filter(c => c.memberSince?.startsWith('2025-08')).length, 
            revenue: monthlyRevenue * 0.85, // Simulated last month
            appointments: Math.max(0, thisMonthAppointments.length - 14) 
          },
          weeklyTrend: [
            { day: '月', appointments: 8, revenue: 32000 },
            { day: '火', appointments: 12, revenue: 48000 },
            { day: '水', appointments: 10, revenue: 40000 },
            { day: '木', appointments: 15, revenue: 60000 },
            { day: '金', appointments: 18, revenue: 72000 },
            { day: '土', appointments: 22, revenue: 88000 },
            { day: '日', appointments: 6, revenue: 24000 }
          ]
        },
        servicePerformance: Object.keys(serviceCount).map(serviceName => ({
          name: serviceName,
          count: serviceCount[serviceName],
          revenue: services.find(s => s.name === serviceName)?.price * serviceCount[serviceName] || 0
        })).sort((a, b) => b.count - a.count).slice(0, 5)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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

// Favicon handling
app.get('/favicon.ico', (req, res) => {
  res.status(204).send(); // No content for favicon
});

// In-memory data store for VOTAN Beauty Salon
let customers = [
  { 
    id: 1, 
    lastName: '田中', 
    firstName: '花子', 
    email: 'tanaka@example.com', 
    phone: '090-1234-5678', 
    lastVisit: '2025-09-01', 
    totalVisits: 12,
    memberSince: '2024-03-15',
    preferredStaff: 'スタイリスト佐藤',
    notes: '髪質が細く、カラーの持ちが良い',
    birthday: '1985-05-20'
  },
  { 
    id: 2, 
    lastName: '佐藤', 
    firstName: '美香', 
    email: 'sato@example.com', 
    phone: '090-8765-4321', 
    lastVisit: '2025-09-02', 
    totalVisits: 8,
    memberSince: '2024-06-10',
    preferredStaff: 'スタイリスト山田',
    notes: 'アレルギー体質、パッチテスト必須',
    birthday: '1990-12-03'
  },
  { 
    id: 3, 
    lastName: '鈴木', 
    firstName: '愛', 
    email: 'suzuki@example.com', 
    phone: '090-1111-2222', 
    lastVisit: '2025-08-30', 
    totalVisits: 25,
    memberSince: '2023-11-20',
    preferredStaff: 'スタイリスト佐藤',
    notes: 'ショートカット専門、月1回来店',
    birthday: '1988-08-15'
  },
  {
    id: 4,
    lastName: '山田',
    firstName: '美咲',
    email: 'yamada.misaki@gmail.com',
    phone: '080-9999-8888',
    lastVisit: '2025-09-05',
    totalVisits: 6,
    memberSince: '2025-01-10',
    preferredStaff: 'スタイリスト山田',
    notes: 'ロングヘア、トリートメント重視',
    birthday: '1995-07-12'
  },
  {
    id: 5,
    lastName: '伊藤',
    firstName: '咲子',
    email: 'ito.sakiko@yahoo.co.jp',
    phone: '070-5555-4444',
    lastVisit: '2025-08-28',
    totalVisits: 18,
    memberSince: '2023-05-20',
    preferredStaff: 'スタイリスト佐藤',
    notes: '明るいカラーが好み、定期的にパーマ',
    birthday: '1987-11-30'
  },
  {
    id: 6,
    lastName: '高橋',
    firstName: '真由美',
    email: 'takahashi@outlook.com',
    phone: '090-7777-6666',
    lastVisit: '2025-09-03',
    totalVisits: 15,
    memberSince: '2024-01-05',
    preferredStaff: '',
    notes: '結婚式準備中、特別なヘアスタイル希望',
    birthday: '1992-04-18'
  }
];

let appointments = [
  { 
    id: 1, 
    customerId: 1,
    customerName: '田中 花子', 
    service: 'カット&カラー', 
    appointmentDate: '2025-09-07', 
    startTime: '14:00',
    endTime: '16:00',
    status: 'confirmed',
    staffId: 1,
    staffName: 'スタイリスト佐藤',
    services: [
      { id: 1, name: 'カット&カラー', price: 8000, duration: 120 }
    ],
    notes: 'リタッチカラー希望',
    createdAt: '2025-09-05T10:00:00Z'
  },
  { 
    id: 2, 
    customerId: 2,
    customerName: '佐藤 美香', 
    service: 'パーマ', 
    appointmentDate: '2025-09-08', 
    startTime: '10:00',
    endTime: '12:00',
    status: 'confirmed',
    staffId: 2,
    staffName: 'スタイリスト山田',
    services: [
      { id: 3, name: 'パーマ', price: 12000, duration: 120 }
    ],
    notes: 'デジタルパーマ希望',
    createdAt: '2025-09-04T14:30:00Z'
  },
  { 
    id: 3, 
    customerId: 3,
    customerName: '鈴木 愛', 
    service: 'カット', 
    appointmentDate: '2025-09-07', 
    startTime: '16:00',
    endTime: '17:00',
    status: 'scheduled',
    staffId: 1,
    staffName: 'スタイリスト佐藤',
    services: [
      { id: 2, name: 'カット', price: 4000, duration: 60 }
    ],
    notes: 'いつものショートスタイル',
    createdAt: '2025-09-06T09:15:00Z'
  }
];

let services = [
  { id: 1, name: 'カット&カラー', price: 8000, duration: 120, category: 'カラー', description: '髪をカットしてカラーリング' },
  { id: 2, name: 'カット', price: 4000, duration: 60, category: 'カット', description: '髪のカットのみ' },
  { id: 3, name: 'パーマ', price: 12000, duration: 120, category: 'パーマ', description: 'デジタルパーマまたは通常パーマ' },
  { id: 4, name: 'カラーリング', price: 6000, duration: 90, category: 'カラー', description: 'ヘアカラー・リタッチ' },
  { id: 5, name: 'トリートメント', price: 3000, duration: 30, category: 'ケア', description: 'ヘアトリートメント' },
  { id: 6, name: 'ヘアセット', price: 2500, duration: 45, category: 'セット', description: '特別な日のヘアセット' },
  { id: 7, name: 'ストレートパーマ', price: 15000, duration: 180, category: 'パーマ', description: '縮毛矯正・ストレートパーマ' }
];

let staff = [
  { 
    id: 1, 
    name: 'スタイリスト佐藤', 
    position: 'シニアスタイリスト', 
    specialties: ['カット', 'カラー'], 
    email: 'sato@votan.com',
    phone: '090-1111-1111',
    experience: 8,
    workDays: ['月', '火', '水', '木', '金', '土']
  },
  { 
    id: 2, 
    name: 'スタイリスト山田', 
    position: 'スタイリスト', 
    specialties: ['パーマ', 'トリートメント'], 
    email: 'yamada@votan.com',
    phone: '090-2222-2222',
    experience: 5,
    workDays: ['火', '水', '木', '金', '土', '日']
  },
  { 
    id: 3, 
    name: 'アシスタント田中', 
    position: 'アシスタント', 
    specialties: ['シャンプー', 'トリートメント'], 
    email: 'tanaka@votan.com',
    phone: '090-3333-3333',
    experience: 2,
    workDays: ['月', '火', '水', '木', '金']
  }
];

let messages = [
  {
    id: 1,
    customerId: 1,
    customerName: '田中 花子',
    message: '明日の予約の時間変更は可能でしょうか？',
    type: 'received',
    timestamp: '2025-09-06T10:30:00Z',
    status: 'unread'
  },
  {
    id: 2,
    customerId: 2,
    customerName: '佐藤 美香',
    message: 'ありがとうございました。次回もよろしくお願いします。',
    type: 'received',
    timestamp: '2025-09-05T16:45:00Z',
    status: 'read'
  },
  {
    id: 3,
    customerId: 4,
    customerName: '山田 美咲',
    message: '今度はもう少し明るめのカラーにしたいです！',
    type: 'received',
    timestamp: '2025-09-05T14:20:00Z',
    status: 'read'
  },
  {
    id: 4,
    customerId: 6,
    customerName: '高橋 真由美',
    message: '結婚式のヘアスタイルのご相談があります。お時間のある時に連絡をお願いします。',
    type: 'received',
    timestamp: '2025-09-04T11:15:00Z',
    status: 'read'
  },
  {
    id: 5,
    customerId: 3,
    customerName: '鈴木 愛',
    message: 'いつものスタイルでお願いします。',
    type: 'received',
    timestamp: '2025-09-03T09:45:00Z',
    status: 'read'
  }
];

// APPOINTMENTS API - Complete CRUD operations
app.get('/api/appointments', (req, res) => {
  try {
    const { date, view, staffId } = req.query;
    let filteredAppointments = [...appointments];

    // Filter by date/view
    if (date) {
      const targetDate = new Date(date);
      filteredAppointments = filteredAppointments.filter(apt => {
        const aptDate = new Date(apt.appointmentDate);
        
        if (view === 'day') {
          return aptDate.toDateString() === targetDate.toDateString();
        } else if (view === 'week') {
          const weekStart = new Date(targetDate);
          weekStart.setDate(targetDate.getDate() - targetDate.getDay());
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          return aptDate >= weekStart && aptDate <= weekEnd;
        } else if (view === 'month') {
          return aptDate.getFullYear() === targetDate.getFullYear() && 
                 aptDate.getMonth() === targetDate.getMonth();
        }
        return true;
      });
    }

    // Filter by staff
    if (staffId) {
      filteredAppointments = filteredAppointments.filter(apt => 
        apt.staffId === parseInt(staffId)
      );
    }

    res.json({
      success: true,
      appointments: filteredAppointments,
      total: filteredAppointments.length
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/appointments', (req, res) => {
  try {
    const { customerId, serviceIds, appointmentDate, startTime, staffId, notes } = req.body;

    // Validate required fields
    if (!customerId || !serviceIds || !appointmentDate || !startTime || !staffId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Find customer and staff
    const customer = customers.find(c => c.id === customerId);
    const staffMember = staff.find(s => s.id === staffId);
    const selectedServices = services.filter(s => serviceIds.includes(s.id));

    if (!customer || !staffMember || selectedServices.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Customer, staff, or services not found'
      });
    }

    // Calculate total duration and end time
    const totalDuration = selectedServices.reduce((sum, service) => sum + service.duration, 0);
    const startDateTime = new Date(`${appointmentDate}T${startTime}:00`);
    const endDateTime = new Date(startDateTime.getTime() + totalDuration * 60000);
    const endTime = endDateTime.toTimeString().slice(0, 5);

    // Create new appointment
    const newId = Math.max(...appointments.map(a => a.id)) + 1;
    const newAppointment = {
      id: newId,
      customerId,
      customerName: `${customer.lastName} ${customer.firstName}`,
      service: selectedServices.map(s => s.name).join(', '),
      appointmentDate,
      startTime,
      endTime,
      status: 'scheduled',
      staffId,
      staffName: staffMember.name,
      services: selectedServices,
      notes: notes || '',
      createdAt: new Date().toISOString()
    };

    appointments.push(newAppointment);

    res.status(201).json({
      success: true,
      appointment: newAppointment,
      message: 'Appointment created successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/api/appointments/:id', (req, res) => {
  try {
    const appointmentId = parseInt(req.params.id);
    const appointmentIndex = appointments.findIndex(a => a.id === appointmentId);

    if (appointmentIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    const { customerId, serviceIds, appointmentDate, startTime, staffId, notes, status } = req.body;

    // Update appointment
    const updatedAppointment = { ...appointments[appointmentIndex] };

    if (customerId) {
      const customer = customers.find(c => c.id === customerId);
      if (customer) {
        updatedAppointment.customerId = customerId;
        updatedAppointment.customerName = `${customer.lastName} ${customer.firstName}`;
      }
    }

    if (serviceIds) {
      const selectedServices = services.filter(s => serviceIds.includes(s.id));
      if (selectedServices.length > 0) {
        updatedAppointment.services = selectedServices;
        updatedAppointment.service = selectedServices.map(s => s.name).join(', ');
        
        // Recalculate end time
        const totalDuration = selectedServices.reduce((sum, service) => sum + service.duration, 0);
        const startDateTime = new Date(`${appointmentDate || updatedAppointment.appointmentDate}T${startTime || updatedAppointment.startTime}:00`);
        const endDateTime = new Date(startDateTime.getTime() + totalDuration * 60000);
        updatedAppointment.endTime = endDateTime.toTimeString().slice(0, 5);
      }
    }

    if (staffId) {
      const staffMember = staff.find(s => s.id === staffId);
      if (staffMember) {
        updatedAppointment.staffId = staffId;
        updatedAppointment.staffName = staffMember.name;
      }
    }

    if (appointmentDate) updatedAppointment.appointmentDate = appointmentDate;
    if (startTime) updatedAppointment.startTime = startTime;
    if (notes !== undefined) updatedAppointment.notes = notes;
    if (status) updatedAppointment.status = status;

    appointments[appointmentIndex] = updatedAppointment;

    res.json({
      success: true,
      appointment: updatedAppointment,
      message: 'Appointment updated successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete('/api/appointments/:id', (req, res) => {
  try {
    const appointmentId = parseInt(req.params.id);
    const appointmentIndex = appointments.findIndex(a => a.id === appointmentId);

    if (appointmentIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    const deletedAppointment = appointments.splice(appointmentIndex, 1)[0];

    res.json({
      success: true,
      appointment: deletedAppointment,
      message: 'Appointment deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// CUSTOMERS API - Complete CRUD operations
app.get('/api/customers', (req, res) => {
  try {
    const { search, limit } = req.query;
    let filteredCustomers = [...customers];

    // Search functionality
    if (search) {
      const searchTerm = search.toLowerCase();
      filteredCustomers = filteredCustomers.filter(customer => 
        customer.lastName.toLowerCase().includes(searchTerm) ||
        customer.firstName.toLowerCase().includes(searchTerm) ||
        customer.email.toLowerCase().includes(searchTerm) ||
        customer.phone.includes(searchTerm)
      );
    }

    // Limit results
    if (limit) {
      filteredCustomers = filteredCustomers.slice(0, parseInt(limit));
    }

    res.json({
      success: true,
      customers: filteredCustomers,
      total: filteredCustomers.length
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/customers', (req, res) => {
  try {
    const { lastName, firstName, email, phone, birthday, notes } = req.body;

    // Validate required fields
    if (!lastName || !firstName || !phone) {
      return res.status(400).json({
        success: false,
        message: 'lastName, firstName, and phone are required'
      });
    }

    // Check if email already exists
    if (email && customers.some(c => c.email === email)) {
      return res.status(409).json({
        success: false,
        message: 'Email already exists'
      });
    }

    // Create new customer
    const newId = Math.max(...customers.map(c => c.id)) + 1;
    const newCustomer = {
      id: newId,
      lastName,
      firstName,
      email: email || '',
      phone,
      lastVisit: null,
      totalVisits: 0,
      memberSince: new Date().toISOString().split('T')[0],
      preferredStaff: '',
      notes: notes || '',
      birthday: birthday || ''
    };

    customers.push(newCustomer);

    res.status(201).json({
      success: true,
      customer: newCustomer,
      message: 'Customer created successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/api/customers/:id', (req, res) => {
  try {
    const customerId = parseInt(req.params.id);
    const customerIndex = customers.findIndex(c => c.id === customerId);

    if (customerIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    const { lastName, firstName, email, phone, birthday, notes, preferredStaff } = req.body;

    // Check if email already exists (excluding current customer)
    if (email && customers.some(c => c.email === email && c.id !== customerId)) {
      return res.status(409).json({
        success: false,
        message: 'Email already exists'
      });
    }

    // Update customer
    const updatedCustomer = { ...customers[customerIndex] };
    if (lastName) updatedCustomer.lastName = lastName;
    if (firstName) updatedCustomer.firstName = firstName;
    if (email !== undefined) updatedCustomer.email = email;
    if (phone) updatedCustomer.phone = phone;
    if (birthday !== undefined) updatedCustomer.birthday = birthday;
    if (notes !== undefined) updatedCustomer.notes = notes;
    if (preferredStaff !== undefined) updatedCustomer.preferredStaff = preferredStaff;

    customers[customerIndex] = updatedCustomer;

    res.json({
      success: true,
      customer: updatedCustomer,
      message: 'Customer updated successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete('/api/customers/:id', (req, res) => {
  try {
    const customerId = parseInt(req.params.id);
    const customerIndex = customers.findIndex(c => c.id === customerId);

    if (customerIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Check if customer has future appointments
    const hasAppointments = appointments.some(a => a.customerId === customerId);
    if (hasAppointments) {
      return res.status(409).json({
        success: false,
        message: 'Cannot delete customer with existing appointments'
      });
    }

    const deletedCustomer = customers.splice(customerIndex, 1)[0];

    res.json({
      success: true,
      customer: deletedCustomer,
      message: 'Customer deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// SERVICES API - Complete CRUD operations
app.get('/api/services', (req, res) => {
  try {
    const { category } = req.query;
    let filteredServices = [...services];

    // Filter by category
    if (category) {
      filteredServices = filteredServices.filter(service => 
        service.category.toLowerCase() === category.toLowerCase()
      );
    }

    res.json({
      success: true,
      services: filteredServices,
      total: filteredServices.length
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/services', (req, res) => {
  try {
    const { name, price, duration, category, description } = req.body;

    // Validate required fields
    if (!name || !price || !duration || !category) {
      return res.status(400).json({
        success: false,
        message: 'name, price, duration, and category are required'
      });
    }

    // Check if service name already exists
    if (services.some(s => s.name.toLowerCase() === name.toLowerCase())) {
      return res.status(409).json({
        success: false,
        message: 'Service name already exists'
      });
    }

    // Create new service
    const newId = Math.max(...services.map(s => s.id)) + 1;
    const newService = {
      id: newId,
      name,
      price: parseInt(price),
      duration: parseInt(duration),
      category,
      description: description || ''
    };

    services.push(newService);

    res.status(201).json({
      success: true,
      service: newService,
      message: 'Service created successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/api/services/:id', (req, res) => {
  try {
    const serviceId = parseInt(req.params.id);
    const serviceIndex = services.findIndex(s => s.id === serviceId);

    if (serviceIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    const { name, price, duration, category, description } = req.body;

    // Check if service name already exists (excluding current service)
    if (name && services.some(s => s.name.toLowerCase() === name.toLowerCase() && s.id !== serviceId)) {
      return res.status(409).json({
        success: false,
        message: 'Service name already exists'
      });
    }

    // Update service
    const updatedService = { ...services[serviceIndex] };
    if (name) updatedService.name = name;
    if (price !== undefined) updatedService.price = parseInt(price);
    if (duration !== undefined) updatedService.duration = parseInt(duration);
    if (category) updatedService.category = category;
    if (description !== undefined) updatedService.description = description;

    services[serviceIndex] = updatedService;

    res.json({
      success: true,
      service: updatedService,
      message: 'Service updated successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete('/api/services/:id', (req, res) => {
  try {
    const serviceId = parseInt(req.params.id);
    const serviceIndex = services.findIndex(s => s.id === serviceId);

    if (serviceIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    // Check if service is used in appointments
    const isServiceUsed = appointments.some(apt => 
      apt.services.some(service => service.id === serviceId)
    );

    if (isServiceUsed) {
      return res.status(409).json({
        success: false,
        message: 'Cannot delete service that is used in appointments'
      });
    }

    const deletedService = services.splice(serviceIndex, 1)[0];

    res.json({
      success: true,
      service: deletedService,
      message: 'Service deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// STAFF API - Complete CRUD operations
app.get('/api/staff', (req, res) => {
  try {
    res.json({
      success: true,
      staff: staff,
      total: staff.length
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/staff', (req, res) => {
  try {
    const { name, position, specialties, email, phone, experience, workDays } = req.body;

    // Validate required fields
    if (!name || !position || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: 'name, position, email, and phone are required'
      });
    }

    // Check if email already exists
    if (staff.some(s => s.email === email)) {
      return res.status(409).json({
        success: false,
        message: 'Email already exists'
      });
    }

    // Create new staff member
    const newId = Math.max(...staff.map(s => s.id)) + 1;
    const newStaff = {
      id: newId,
      name,
      position,
      specialties: specialties || [],
      email,
      phone,
      experience: parseInt(experience) || 0,
      workDays: workDays || []
    };

    staff.push(newStaff);

    res.status(201).json({
      success: true,
      staff: newStaff,
      message: 'Staff member created successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/api/staff/:id', (req, res) => {
  try {
    const staffId = parseInt(req.params.id);
    const staffIndex = staff.findIndex(s => s.id === staffId);

    if (staffIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Staff member not found'
      });
    }

    const { name, position, specialties, email, phone, experience, workDays } = req.body;

    // Check if email already exists (excluding current staff)
    if (email && staff.some(s => s.email === email && s.id !== staffId)) {
      return res.status(409).json({
        success: false,
        message: 'Email already exists'
      });
    }

    // Update staff member
    const updatedStaff = { ...staff[staffIndex] };
    if (name) updatedStaff.name = name;
    if (position) updatedStaff.position = position;
    if (specialties !== undefined) updatedStaff.specialties = specialties;
    if (email) updatedStaff.email = email;
    if (phone) updatedStaff.phone = phone;
    if (experience !== undefined) updatedStaff.experience = parseInt(experience);
    if (workDays !== undefined) updatedStaff.workDays = workDays;

    staff[staffIndex] = updatedStaff;

    res.json({
      success: true,
      staff: updatedStaff,
      message: 'Staff member updated successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete('/api/staff/:id', (req, res) => {
  try {
    const staffId = parseInt(req.params.id);
    const staffIndex = staff.findIndex(s => s.id === staffId);

    if (staffIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Staff member not found'
      });
    }

    // Check if staff member has future appointments
    const hasAppointments = appointments.some(a => a.staffId === staffId);
    if (hasAppointments) {
      return res.status(409).json({
        success: false,
        message: 'Cannot delete staff member with existing appointments'
      });
    }

    const deletedStaff = staff.splice(staffIndex, 1)[0];

    res.json({
      success: true,
      staff: deletedStaff,
      message: 'Staff member deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// MESSAGES API - Communication management
app.get('/api/messages', (req, res) => {
  try {
    const { customerId, status } = req.query;
    let filteredMessages = [...messages];

    // Filter by customer
    if (customerId) {
      filteredMessages = filteredMessages.filter(msg => 
        msg.customerId === parseInt(customerId)
      );
    }

    // Filter by status
    if (status) {
      filteredMessages = filteredMessages.filter(msg => 
        msg.status === status
      );
    }

    // Sort by timestamp (newest first)
    filteredMessages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({
      success: true,
      messages: filteredMessages,
      total: filteredMessages.length,
      unreadCount: messages.filter(m => m.status === 'unread').length
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/messages', (req, res) => {
  try {
    const { customerId, message, type } = req.body;

    // Validate required fields
    if (!customerId || !message || !type) {
      return res.status(400).json({
        success: false,
        message: 'customerId, message, and type are required'
      });
    }

    // Find customer
    const customer = customers.find(c => c.id === customerId);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Create new message
    const newId = Math.max(...messages.map(m => m.id)) + 1;
    const newMessage = {
      id: newId,
      customerId,
      customerName: `${customer.lastName} ${customer.firstName}`,
      message,
      type, // 'sent' or 'received'
      timestamp: new Date().toISOString(),
      status: type === 'sent' ? 'sent' : 'unread'
    };

    messages.push(newMessage);

    res.status(201).json({
      success: true,
      message: newMessage,
      message_text: 'Message sent successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/api/messages/:id/read', (req, res) => {
  try {
    const messageId = parseInt(req.params.id);
    const messageIndex = messages.findIndex(m => m.id === messageId);

    if (messageIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Mark as read
    messages[messageIndex].status = 'read';

    res.json({
      success: true,
      message: messages[messageIndex],
      message_text: 'Message marked as read'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Settings API endpoint
app.get('/api/settings', (req, res) => {
  res.json({
    success: true,
    setting: {
      businessHours: {
        monday: { isOpen: true, open: '09:00', close: '19:00' },
        tuesday: { isOpen: true, open: '09:00', close: '19:00' },
        wednesday: { isOpen: true, open: '09:00', close: '19:00' },
        thursday: { isOpen: true, open: '09:00', close: '19:00' },
        friday: { isOpen: true, open: '09:00', close: '19:00' },
        saturday: { isOpen: true, open: '09:00', close: '18:00' },
        sunday: { isOpen: false, open: '10:00', close: '17:00' }
      },
      holidays: [
        '2025-09-15',
        '2025-09-23',
        '2025-10-14'
      ],
      temporaryClosures: [
        {
          startDate: '2025-09-20',
          endDate: '2025-09-21',
          reason: '設備メンテナンス'
        }
      ]
    }
  });
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
  } else if (req.path === '/appointments' || req.path === '/appointments.html') {
    res.sendFile(path.join(__dirname, '../frontend/appointments.html'));
  } else if (req.path === '/customers' || req.path === '/customers.html') {
    res.sendFile(path.join(__dirname, '../frontend/customers.html'));
  } else if (req.path === '/records' || req.path === '/records.html') {
    res.sendFile(path.join(__dirname, '../frontend/records.html'));
  } else if (req.path === '/services' || req.path === '/services.html') {
    res.sendFile(path.join(__dirname, '../frontend/services.html'));
  } else if (req.path === '/staff' || req.path === '/staff.html') {
    res.sendFile(path.join(__dirname, '../frontend/staff.html'));
  } else if (req.path === '/messages' || req.path === '/messages.html') {
    res.sendFile(path.join(__dirname, '../frontend/messages.html'));
  } else if (req.path === '/reports' || req.path === '/reports.html') {
    res.sendFile(path.join(__dirname, '../frontend/reports.html'));
  } else if (req.path === '/register' || req.path === '/register.html') {
    res.sendFile(path.join(__dirname, '../frontend/register.html'));
  } else if (req.path === '/customer-detail' || req.path === '/customer-detail.html') {
    res.sendFile(path.join(__dirname, '../frontend/customer-detail.html'));
  } else if (req.path === '/customer-edit' || req.path === '/customer-edit.html') {
    res.sendFile(path.join(__dirname, '../frontend/customer-edit.html'));
  } else if (req.path === '/test-messages' || req.path === '/test-messages.html') {
    res.sendFile(path.join(__dirname, '../frontend/test-messages.html'));
  } else if (req.path === '/booking-widget-embed' || req.path === '/booking-widget-embed.html') {
    res.sendFile(path.join(__dirname, '../frontend/booking-widget-embed.html'));
  } else {
    // Check if the file exists before trying to serve it
    const filePath = path.join(__dirname, '../frontend', req.path);
    const fs = require('fs');
    
    // For .html files, check if they exist
    if (req.path.endsWith('.html') || req.path.endsWith('/')) {
      if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
      } else {
        // Return proper 404 page
        const notFoundPath = path.join(__dirname, '../frontend/404.html');
        if (fs.existsSync(notFoundPath)) {
          res.status(404).sendFile(notFoundPath);
        } else {
          res.status(404).json({
            error: 'Page not found',
            message: `The requested page '${req.path}' does not exist.`
          });
        }
      }
    } else {
      // For non-HTML files, let static middleware handle them first
      // This should not be reached as static files are handled earlier
      res.status(404).json({
        error: 'Resource not found',
        message: `The requested resource '${req.path}' does not exist.`
      });
    }
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

// Firebase初期化
const admin = require('firebase-admin');
let db;

try {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: process.env.FIREBASE_PROJECT_ID || 'salon-system-138'
    });
    db = admin.firestore();
  }
} catch (error) {
  console.log('⚠️  Firebase running in development mode');
  db = null;
}

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