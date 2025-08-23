const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');

// SECURITY FIX: Remove hardcoded credentials
// Users should be loaded from secure database
const loadUsersFromDatabase = async () => {
  // This should connect to your actual database
  // For demo purposes, we'll use environment variables
  const users = [];
  
  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);
    users.push({
      id: 'admin-' + Date.now(),
      email: process.env.ADMIN_EMAIL,
      password: hashedPassword,
      name: 'Administrator',
      salonName: process.env.SALON_NAME || 'Salon Management',
      phoneNumber: process.env.ADMIN_PHONE || '',
      planType: 'premium',
      role: 'admin',
      isActive: true,
      emailVerified: true,
      createdAt: new Date(),
      lastLoginAt: null,
      failedLoginAttempts: 0,
      lockoutUntil: null
    });
  }
  
  return users;
};

// SECURITY FIX: Implement rate limiting
const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    error: 'Too many login attempts',
    retryAfter: 900 // 15 minutes in seconds
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip successful requests
  skipSuccessfulRequests: true,
  // Custom key generator for more granular control
  keyGenerator: (req) => {
    return req.ip + ':' + (req.body?.email || 'unknown');
  }
});

// SECURITY FIX: Input validation
const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email address required')
    .isLength({ max: 254 })
    .withMessage('Email too long'),
  
  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be 8-128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and number')
];

// SECURITY FIX: JWT configuration with validation
const getJWTSecret = () => {
  const secret = process.env.JWT_SECRET;
  
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  
  if (secret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long');
  }
  
  return secret;
};

// SECURITY FIX: Account lockout mechanism
const checkAccountLockout = (user) => {
  if (user.lockoutUntil && user.lockoutUntil > new Date()) {
    const remainingTime = Math.ceil((user.lockoutUntil - new Date()) / 1000 / 60);
    throw new Error(`Account locked. Try again in ${remainingTime} minutes.`);
  }
};

const updateFailedAttempt = async (user) => {
  user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
  
  // Lock account after 5 failed attempts
  if (user.failedLoginAttempts >= 5) {
    user.lockoutUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    console.warn(`Account locked for user: ${user.email}`);
  }
  
  // In a real app, save this to database
  console.log(`Failed login attempt ${user.failedLoginAttempts} for user: ${user.email}`);
};

const resetFailedAttempts = async (user) => {
  user.failedLoginAttempts = 0;
  user.lockoutUntil = null;
  user.lastLoginAt = new Date();
  // In a real app, save this to database
};

// SECURITY FIX: Secure CORS configuration
const getCorsOrigins = () => {
  const allowedOrigins = process.env.ALLOWED_ORIGINS;
  
  if (!allowedOrigins) {
    console.warn('ALLOWED_ORIGINS not set, defaulting to localhost for development');
    return ['http://localhost:3000', 'http://localhost:3001'];
  }
  
  return allowedOrigins.split(',').map(origin => origin.trim());
};

// SECURITY FIX: Enhanced login endpoint
const secureLogin = async (req, res) => {
  try {
    // Apply rate limiting
    await new Promise((resolve, reject) => {
      loginRateLimit(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // SECURITY: Set secure headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // SECURITY FIX: Restrict CORS to allowed origins
    const allowedOrigins = getCorsOrigins();
    const origin = req.headers.origin;
    
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
    
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // SECURITY FIX: Input validation
    await Promise.all(loginValidation.map(validation => validation.run(req)));
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Invalid input',
        details: errors.array().map(err => ({
          field: err.param,
          message: err.msg
        }))
      });
    }

    const { email, password } = req.body;

    // Load users from secure source
    const users = await loadUsersFromDatabase();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
      // SECURITY: Consistent error messages to prevent user enumeration
      console.log(`Login attempt for non-existent user: ${email}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // SECURITY FIX: Check account lockout
    try {
      checkAccountLockout(user);
    } catch (error) {
      return res.status(423).json({ error: error.message });
    }

    // SECURITY: Check if account is active
    if (!user.isActive) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      await updateFailedAttempt(user);
      console.log(`Failed login attempt for user: ${email} from IP: ${req.ip}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // SECURITY: Reset failed attempts on successful login
    await resetFailedAttempts(user);

    // SECURITY FIX: Generate secure JWT token
    const jwtSecret = getJWTSecret();
    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role || 'user',
      planType: user.planType,
      // Add timestamp to make tokens unique
      iat: Math.floor(Date.now() / 1000)
    };

    const token = jwt.sign(tokenPayload, jwtSecret, {
      expiresIn: '24h', // Shorter expiration for security
      issuer: 'salon-sms-system',
      audience: 'salon-users',
      algorithm: 'HS256'
    });

    // SECURITY: Don't expose sensitive user data
    const userResponse = {
      id: user.id,
      email: user.email,
      name: user.name,
      salonName: user.salonName,
      phoneNumber: user.phoneNumber,
      planType: user.planType,
      role: user.role,
      emailVerified: user.emailVerified,
      lastLoginAt: user.lastLoginAt
    };

    // SECURITY: Log successful login
    console.log(`Successful login for user: ${email} from IP: ${req.ip}`);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      accessToken: token, // For compatibility
      user: userResponse,
      expiresIn: 86400 // 24 hours in seconds
    });

  } catch (error) {
    console.error('Login error:', {
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });

    // SECURITY: Don't expose internal errors
    res.status(500).json({
      error: 'Internal server error',
      requestId: req.id || Date.now()
    });
  }
};

// SECURITY FIX: Secure token verification middleware
const secureAuthMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : null;

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const jwtSecret = getJWTSecret();
    const decoded = jwt.verify(token, jwtSecret, {
      issuer: 'salon-sms-system',
      audience: 'salon-users',
      algorithms: ['HS256']
    });

    // Attach user info to request
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      planType: decoded.planType,
      iat: decoded.iat,
      exp: decoded.exp
    };

    next();
  } catch (error) {
    console.log('Token validation failed:', {
      error: error.message,
      ip: req.ip,
      timestamp: new Date().toISOString()
    });

    return res.status(401).json({ 
      error: 'Invalid or expired token'
    });
  }
};

module.exports = {
  secureLogin,
  secureAuthMiddleware,
  loginRateLimit,
  loginValidation,
  getCorsOrigins
};