const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * Generate JWT token for user
 * @param {Object} payload - User data to encode
 * @returns {string} JWT token
 */
const generateToken = (payload) => {
  if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || JWT_SECRET === 'fallback-secret-key-change-in-production')) {
    throw new Error('JWT_SECRET must be configured in production');
  }
  return jwt.sign(payload, JWT_SECRET, { 
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'sms-salon',
    audience: 'sms-users'
  });
};

/**
 * Verify JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid
 */
const verifyToken = (token) => {
  try {
    if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || JWT_SECRET === 'fallback-secret-key-change-in-production')) {
      throw new Error('JWT_SECRET not configured');
    }
    return jwt.verify(token, JWT_SECRET, {
      issuer: 'sms-salon',
      audience: 'sms-users'
    });
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

/**
 * Decode JWT token without verification (for expired token info)
 * @param {string} token - JWT token to decode
 * @returns {Object} Decoded token payload
 */
const decodeToken = (token) => {
  return jwt.decode(token);
};

/**
 * Generate refresh token
 * @param {Object} payload - User data to encode
 * @returns {string} Refresh token
 */
const generateRefreshToken = (payload) => {
  if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || JWT_SECRET === 'fallback-secret-key-change-in-production')) {
    throw new Error('JWT_SECRET must be configured in production');
  }
  return jwt.sign(payload, JWT_SECRET, { 
    expiresIn: '7d',
    issuer: 'sms-salon',
    audience: 'sms-users'
  });
};

module.exports = {
  generateToken,
  verifyToken,
  decodeToken,
  generateRefreshToken
};
