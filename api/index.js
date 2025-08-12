const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

// Middleware
app.use(cors({
  origin: ['https://sms-new.vercel.app', 'http://localhost:3001'],
  credentials: true
}));
app.use(express.json());

// In-memory database
const db = {
  users: [
    {
      id: 1,
      email: 'admin@salon.com',
      password: '$2a$10$KXRIhgI2GLZ5TEGEtOVTP.sRlL9.DPqu0VphowBqE1lxYDrY.3ruC', // password: admin123
      name: '管理者',
      role: 'admin'
    }
  ],
  customers: [
    {
      id: 1,
      name: '山田 花子',
      phone: '090-1234-5678',
      email: 'yamada@example.com',
      lastVisit: '2024-01-15',
      visitCount: 24,
      status: 'VIP',
      notes: '毎月カットとカラーをご利用',
      createdAt: '2023-01-10'
    },
    {
      id: 2,
      name: '佐藤 太郎',
      phone: '080-9876-5432',
      email: 'sato@example.com',
      lastVisit: '2024-01-20',
      visitCount: 3,
      status: '新規',
      notes: 'パーマに興味あり',
      createdAt: '2024-01-01'
    },
    {
      id: 3,
      name: '鈴木 美咲',
      phone: '070-1111-2222',
      email: 'suzuki@example.com',
      lastVisit: '2024-01-18',
      visitCount: 15,
      status: '常連',
      notes: 'トリートメント重視',
      createdAt: '2023-06-15'
    }
  ],
  appointments: [
    {
      id: 1,
      customerId: 1,
      customerName: '山田 花子',
      date: '2024-01-25',
      time: '10:00',
      service: 'カット＆カラー',
      staffId: 1,
      staffName: '田中 美咲',
      status: '確定',
      notes: ''
    },
    {
      id: 2,
      customerId: 2,
      customerName: '佐藤 太郎',
      date: '2024-01-25',
      time: '14:00',
      service: 'カット',
      staffId: 2,
      staffName: '鈴木 健一',
      status: '未確定',
      notes: '初回利用'
    }
  ],
  staff: [
    {
      id: 1,
      name: '田中 美咲',
      role: 'スタイリスト',
      status: '勤務中',
      skills: ['カット', 'カラー', 'パーマ'],
      rating: 4.8
    },
    {
      id: 2,
      name: '鈴木 健一',
      role: 'スタイリスト',
      status: '待機中',
      skills: ['カット', 'ヘッドスパ'],
      rating: 4.6
    }
  ]
};

// JWT Secret (環境変数から取得)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware to verify JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Routes
app.get('/api', (req, res) => {
  res.json({
    message: 'SMS Backend API',
    version: '1.0.0',
    endpoints: ['/api/health', '/api/auth/login', '/api/customers', '/api/dashboard/stats']
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    message: 'SMS Backend API is running',
    timestamp: new Date().toISOString()
  });
});

// Authentication
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  const user = db.users.find(u => u.email === email);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    }
  });
});

// Dashboard stats
app.get('/api/dashboard/stats', authenticateToken, (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const todayAppointments = db.appointments.filter(a => a.date === today);
  
  res.json({
    totalCustomers: db.customers.length,
    todayAppointments: todayAppointments.length,
    monthlyRevenue: 2456000,
    activeStaff: db.staff.filter(s => s.status === '勤務中').length,
    todaySchedule: todayAppointments,
    staffStatus: db.staff
  });
});

// Customers
app.get('/api/customers', authenticateToken, (req, res) => {
  const { search, status, page = 1, limit = 10 } = req.query;
  let filtered = [...db.customers];

  if (search) {
    filtered = filtered.filter(c => 
      c.name.includes(search) || 
      c.phone.includes(search) ||
      c.email.includes(search)
    );
  }

  if (status && status !== '全て') {
    filtered = filtered.filter(c => c.status === status);
  }

  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + parseInt(limit);
  const paginatedCustomers = filtered.slice(startIndex, endIndex);

  res.json({
    customers: paginatedCustomers,
    total: filtered.length,
    page: parseInt(page),
    totalPages: Math.ceil(filtered.length / limit)
  });
});

app.get('/api/customers/:id', authenticateToken, (req, res) => {
  const customer = db.customers.find(c => c.id === parseInt(req.params.id));
  if (!customer) {
    return res.status(404).json({ error: 'Customer not found' });
  }
  res.json(customer);
});

app.post('/api/customers', authenticateToken, (req, res) => {
  const newCustomer = {
    id: db.customers.length + 1,
    ...req.body,
    visitCount: 0,
    status: '新規',
    createdAt: new Date().toISOString().split('T')[0]
  };
  db.customers.push(newCustomer);
  res.status(201).json(newCustomer);
});

app.put('/api/customers/:id', authenticateToken, (req, res) => {
  const index = db.customers.findIndex(c => c.id === parseInt(req.params.id));
  if (index === -1) {
    return res.status(404).json({ error: 'Customer not found' });
  }
  db.customers[index] = { ...db.customers[index], ...req.body };
  res.json(db.customers[index]);
});

app.delete('/api/customers/:id', authenticateToken, (req, res) => {
  const index = db.customers.findIndex(c => c.id === parseInt(req.params.id));
  if (index === -1) {
    return res.status(404).json({ error: 'Customer not found' });
  }
  db.customers.splice(index, 1);
  res.status(204).send();
});

// Appointments
app.get('/api/appointments', authenticateToken, (req, res) => {
  const { date, staffId, status } = req.query;
  let filtered = [...db.appointments];

  if (date) {
    filtered = filtered.filter(a => a.date === date);
  }
  if (staffId) {
    filtered = filtered.filter(a => a.staffId === parseInt(staffId));
  }
  if (status) {
    filtered = filtered.filter(a => a.status === status);
  }

  res.json(filtered);
});

app.post('/api/appointments', authenticateToken, (req, res) => {
  const newAppointment = {
    id: db.appointments.length + 1,
    ...req.body,
    createdAt: new Date().toISOString()
  };
  db.appointments.push(newAppointment);
  res.status(201).json(newAppointment);
});

// Staff
app.get('/api/staff', authenticateToken, (req, res) => {
  res.json(db.staff);
});

// Error handling
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Cannot ${req.method} ${req.path}`
  });
});

// Export for Vercel
module.exports = app;