const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// In-memory database (same as server)
const users = [
  {
    id: '1',
    email: 'admin@salon.com',
    password: '$2a$10$' + bcrypt.hashSync('admin123', 10).substring(7),
    name: '管理者',
    salonName: 'Salon Lumière',
    phoneNumber: '090-0000-0000',
    planType: 'premium',
    role: 'admin',
    isActive: true,
    emailVerified: true
  },
  {
    id: '2',
    email: 'greenroom51@gmail.com',
    password: '$2a$10$' + bcrypt.hashSync('Skyosai51', 10).substring(7),
    name: '管理者',
    salonName: 'Salon Lumière',
    phoneNumber: '090-0000-0000',
    planType: 'premium',
    role: 'admin',
    isActive: true,
    emailVerified: true
  },
  {
    id: '3',
    email: 'test@salon-lumiere.com',
    password: '$2a$10$' + bcrypt.hashSync('password123', 10).substring(7),
    name: 'テストユーザー',
    salonName: 'テストサロン',
    phoneNumber: '090-1234-5678',
    planType: 'light',
    role: 'user',
    isActive: true,
    emailVerified: true
  }
];

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    // Find user
    const user = users.find(u => u.email === email);
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is not active' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email,
        role: user.role || 'user'
      },
      process.env.JWT_SECRET || 'salon-lumiere-secret-key',
      { expiresIn: '24h' }
    );

    // Return user data and token
    res.status(200).json({
      token,
      accessToken: token, // For compatibility
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        salonName: user.salonName,
        phoneNumber: user.phoneNumber,
        planType: user.planType,
        role: user.role || 'user',
        emailVerified: user.emailVerified
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};