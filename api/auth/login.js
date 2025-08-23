const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

// In-memory users database for serverless
const users = [{
  id: uuidv4(),
  email: process.env.ADMIN_EMAIL || 'admin@salon-lumiere.com',
  password: '', // Will be set below
  name: 'Admin User',
  salonName: 'Salon Lumière',
  planType: 'light',
  isActive: true,
  lastLoginAt: null,
  createdAt: new Date(),
  updatedAt: new Date()
}, {
  id: uuidv4(),
  email: 'test@salon-lumiere.com',
  password: '', // Will be set below
  name: 'Test User',
  salonName: 'Test Salon',
  planType: 'light',
  isActive: true,
  lastLoginAt: null,
  createdAt: new Date(),
  updatedAt: new Date()
}];

// Initialize hashed passwords
async function initializeUsers() {
  if (!users[0].password) {
    users[0].password = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'AdminPass123!', 10);
    users[1].password = await bcrypt.hash('password123', 10);
  }
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await initializeUsers();

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find user
    const user = users.find(u => u.email === email);
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
}