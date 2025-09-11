const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const validator = require('validator');
const { body, param, query, validationResult } = require('express-validator');

/**
 * Comprehensive Security Middleware for Beauty Salon System
 */

// Security configuration
const SECURITY_CONFIG = {
  encryption: {
    algorithm: 'aes-256-gcm',
    keyLength: 32,
    ivLength: 16,
    saltLength: 64,
    tagLength: 16,
    iterations: 100000
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: 15
    }
  },
  csrfTokens: new Map(),
  sessionTokens: new Map(),
  blacklistedIPs: new Set(),
  suspiciousActivities: new Map()
};

/**
 * Enhanced Rate Limiting
 */
const createRateLimit = (options = {}) => {
  return rateLimit({
    windowMs: options.windowMs || SECURITY_CONFIG.rateLimit.windowMs,
    max: options.max || SECURITY_CONFIG.rateLimit.max,
    message: options.message || SECURITY_CONFIG.rateLimit.message,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Skip rate limiting for whitelisted IPs
      const whitelistedIPs = process.env.WHITELISTED_IPS?.split(',') || [];
      return whitelistedIPs.includes(req.ip);
    },
    keyGenerator: (req) => {
      // Use combination of IP and user ID for authenticated requests
      return req.user ? `${req.ip}:${req.user.userId}` : req.ip;
    },
    onLimitReached: (req, res, options) => {
      // Log rate limit violations
      logSecurityEvent({
        type: 'RATE_LIMIT_EXCEEDED',
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        endpoint: req.originalUrl,
        userId: req.user?.userId,
        timestamp: new Date()
      });
    }
  });
};

// Different rate limits for different endpoints
const apiLimiter = createRateLimit({ max: 100 });
const authLimiter = createRateLimit({ max: 5, windowMs: 15 * 60 * 1000 }); // 5 attempts per 15 minutes
const uploadLimiter = createRateLimit({ max: 10, windowMs: 60 * 60 * 1000 }); // 10 uploads per hour
const messagingLimiter = createRateLimit({ max: 50, windowMs: 60 * 60 * 1000 }); // 50 messages per hour

/**
 * Input Validation and Sanitization
 */
const sanitizeInput = (req, res, next) => {
  try {
    // Sanitize all string inputs
    for (const key in req.body) {
      if (typeof req.body[key] === 'string') {
        // Remove potential XSS vectors
        req.body[key] = validator.escape(req.body[key]);
        
        // Remove SQL injection patterns
        req.body[key] = req.body[key].replace(/('|(\\')|(;|\\;)|(\\)|(\|\|)|(\\))/g, '');
        
        // Limit length
        if (req.body[key].length > 10000) {
          req.body[key] = req.body[key].substring(0, 10000);
        }
      }
    }
    
    next();
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: '入力データの検証に失敗しました',
      code: 'INVALID_INPUT'
    });
  }
};

/**
 * CSRF Protection
 */
const generateCSRFToken = (userId = 'anonymous') => {
  const token = crypto.randomBytes(32).toString('hex');
  const timestamp = Date.now();
  
  SECURITY_CONFIG.csrfTokens.set(token, {
    userId,
    timestamp,
    used: false
  });
  
  // Clean up old tokens
  setTimeout(() => {
    SECURITY_CONFIG.csrfTokens.delete(token);
  }, 30 * 60 * 1000); // 30 minutes
  
  return token;
};

const validateCSRFToken = (req, res, next) => {
  if (req.method === 'GET' || req.method === 'OPTIONS') {
    return next();
  }
  
  const token = req.headers['x-csrf-token'] || req.body._csrf;
  
  if (!token) {
    return res.status(403).json({
      success: false,
      message: 'CSRFトークンが必要です',
      code: 'CSRF_TOKEN_REQUIRED'
    });
  }
  
  const tokenData = SECURITY_CONFIG.csrfTokens.get(token);
  
  if (!tokenData || tokenData.used || Date.now() - tokenData.timestamp > 30 * 60 * 1000) {
    return res.status(403).json({
      success: false,
      message: '無効なCSRFトークンです',
      code: 'INVALID_CSRF_TOKEN'
    });
  }
  
  // Mark token as used
  tokenData.used = true;
  
  next();
};

/**
 * Data Encryption/Decryption
 */
const encryptSensitiveData = (data, password = process.env.DATA_ENCRYPTION_KEY) => {
  try {
    const salt = crypto.randomBytes(SECURITY_CONFIG.encryption.saltLength);
    const key = crypto.pbkdf2Sync(password, salt, SECURITY_CONFIG.encryption.iterations, SECURITY_CONFIG.encryption.keyLength, 'sha256');
    const iv = crypto.randomBytes(SECURITY_CONFIG.encryption.ivLength);
    
    const cipher = crypto.createCipher(SECURITY_CONFIG.encryption.algorithm, key, iv);
    
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    return {
      encrypted,
      salt: salt.toString('hex'),
      iv: iv.toString('hex'),
      tag: tag.toString('hex')
    };
  } catch (error) {
    throw new Error('データの暗号化に失敗しました');
  }
};

const decryptSensitiveData = (encryptedData, password = process.env.DATA_ENCRYPTION_KEY) => {
  try {
    const { encrypted, salt, iv, tag } = encryptedData;
    const key = crypto.pbkdf2Sync(password, Buffer.from(salt, 'hex'), SECURITY_CONFIG.encryption.iterations, SECURITY_CONFIG.encryption.keyLength, 'sha256');
    
    const decipher = crypto.createDecipher(SECURITY_CONFIG.encryption.algorithm, key, Buffer.from(iv, 'hex'));
    decipher.setAuthTag(Buffer.from(tag, 'hex'));
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  } catch (error) {
    throw new Error('データの復号化に失敗しました');
  }
};

/**
 * Medical Data Protection (HIPAA-like compliance)
 */
const protectMedicalData = (req, res, next) => {
  // Add medical data protection headers
  res.set({
    'Cache-Control': 'private, no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-Medical-Data': 'protected'
  });
  
  // Log medical data access
  if (req.user) {
    logMedicalDataAccess({
      userId: req.user.userId,
      userRole: req.user.role,
      endpoint: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      timestamp: new Date()
    });
  }
  
  next();
};

/**
 * File Upload Security
 */
const secureFileUpload = (req, res, next) => {
  // Validate file types and sizes (already handled in multer config)
  
  if (req.files && req.files.length > 0) {
    for (const file of req.files) {
      // Check for malicious content
      if (containsMaliciousContent(file.buffer)) {
        return res.status(400).json({
          success: false,
          message: '悪意のあるファイルが検出されました',
          code: 'MALICIOUS_FILE_DETECTED'
        });
      }
      
      // Scan for viruses (in production, use actual antivirus scanning)
      if (process.env.NODE_ENV === 'production') {
        // Integrate with virus scanning service
      }
    }
  }
  
  next();
};

/**
 * IP Blocking and Suspicious Activity Detection
 */
const blockSuspiciousIPs = (req, res, next) => {
  const clientIP = req.ip;
  
  // Check if IP is blacklisted
  if (SECURITY_CONFIG.blacklistedIPs.has(clientIP)) {
    logSecurityEvent({
      type: 'BLOCKED_IP_ACCESS',
      ip: clientIP,
      endpoint: req.originalUrl,
      timestamp: new Date()
    });
    
    return res.status(403).json({
      success: false,
      message: 'アクセスが制限されています',
      code: 'IP_BLOCKED'
    });
  }
  
  // Track suspicious activities
  trackSuspiciousActivity(req);
  
  next();
};

const trackSuspiciousActivity = (req) => {
  const clientIP = req.ip;
  const activity = SECURITY_CONFIG.suspiciousActivities.get(clientIP) || {
    requests: 0,
    lastRequest: new Date(),
    violations: []
  };
  
  activity.requests++;
  activity.lastRequest = new Date();
  
  // Check for various suspicious patterns
  const suspiciousPatterns = [
    /union.*select/i,
    /drop.*table/i,
    /<script>/i,
    /javascript:/i,
    /eval\(/i,
    /system\(/i
  ];
  
  const requestData = JSON.stringify({
    url: req.originalUrl,
    body: req.body,
    query: req.query
  });
  
  suspiciousPatterns.forEach(pattern => {
    if (pattern.test(requestData)) {
      activity.violations.push({
        type: 'MALICIOUS_PATTERN',
        pattern: pattern.toString(),
        timestamp: new Date()
      });
    }
  });
  
  // Auto-block if too many violations
  if (activity.violations.length >= 5) {
    SECURITY_CONFIG.blacklistedIPs.add(clientIP);
    
    logSecurityEvent({
      type: 'AUTO_IP_BLOCKED',
      ip: clientIP,
      violations: activity.violations.length,
      timestamp: new Date()
    });
  }
  
  SECURITY_CONFIG.suspiciousActivities.set(clientIP, activity);
};

/**
 * Session Security
 */
const validateSession = (req, res, next) => {
  const sessionId = req.headers['x-session-id'];
  
  if (sessionId) {
    const sessionData = SECURITY_CONFIG.sessionTokens.get(sessionId);
    
    if (!sessionData || sessionData.expired || Date.now() > sessionData.expiresAt) {
      SECURITY_CONFIG.sessionTokens.delete(sessionId);
      return res.status(401).json({
        success: false,
        message: 'セッションが無効または期限切れです',
        code: 'INVALID_SESSION'
      });
    }
    
    // Extend session
    sessionData.expiresAt = Date.now() + (30 * 60 * 1000); // 30 minutes
    req.session = sessionData;
  }
  
  next();
};

/**
 * API Key Validation for External Services
 */
const validateAPIKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  const validAPIKeys = process.env.VALID_API_KEYS?.split(',') || [];
  
  if (req.path.startsWith('/api/webhooks/') && !validAPIKeys.includes(apiKey)) {
    return res.status(401).json({
      success: false,
      message: '無効なAPIキーです',
      code: 'INVALID_API_KEY'
    });
  }
  
  next();
};

/**
 * Content Security Policy
 */
const setupCSP = () => {
  return helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'", "wss:", "https:"],
      mediaSrc: ["'self'", "blob:"],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  });
};

/**
 * Security Headers
 */
const securityHeaders = (req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
  });
  
  next();
};

/**
 * Data Validation Schemas
 */
const validationSchemas = {
  customer: [
    body('lastName').isLength({ min: 1, max: 50 }).withMessage('姓は1〜50文字で入力してください'),
    body('firstName').isLength({ min: 1, max: 50 }).withMessage('名は1〜50文字で入力してください'),
    body('email').optional().isEmail().withMessage('有効なメールアドレスを入力してください'),
    body('phone').matches(/^[\d\-\+\(\)\s]+$/).withMessage('有効な電話番号を入力してください')
  ],
  
  medicalRecord: [
    body('medicalHistory').optional().isLength({ max: 5000 }).withMessage('医療履歴は5000文字以内で入力してください'),
    body('allergies').optional().isArray().withMessage('アレルギー情報は配列形式で入力してください'),
    body('bloodType').optional().isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown']).withMessage('無効な血液型です')
  ],
  
  message: [
    body('message').isLength({ min: 1, max: 2000 }).withMessage('メッセージは1〜2000文字で入力してください'),
    body('recipients').isArray({ min: 1 }).withMessage('最低1人の受信者を指定してください'),
    body('channels').isArray({ min: 1 }).withMessage('最低1つのチャンネルを指定してください')
  ]
};

/**
 * Helper Functions
 */
function containsMaliciousContent(buffer) {
  // Check for common malicious patterns in files
  const maliciousSignatures = [
    Buffer.from('<?php', 'utf8'),
    Buffer.from('<script', 'utf8'),
    Buffer.from('eval(', 'utf8'),
    Buffer.from('system(', 'utf8')
  ];
  
  return maliciousSignatures.some(signature => buffer.includes(signature));
}

function logSecurityEvent(event) {
  // In production, send to security monitoring system
  console.log('SECURITY EVENT:', JSON.stringify(event, null, 2));
  
  // Could integrate with services like DataDog, Splunk, etc.
  if (process.env.SECURITY_WEBHOOK_URL) {
    // Send to security monitoring webhook
  }
}

function logMedicalDataAccess(accessLog) {
  // Special logging for medical data access (HIPAA compliance)
  console.log('MEDICAL DATA ACCESS:', JSON.stringify(accessLog, null, 2));
  
  // In production, write to secure audit log
}

/**
 * Error Handling
 */
const securityErrorHandler = (err, req, res, next) => {
  // Log security-related errors
  logSecurityEvent({
    type: 'SECURITY_ERROR',
    error: err.message,
    stack: err.stack,
    ip: req.ip,
    endpoint: req.originalUrl,
    timestamp: new Date()
  });
  
  // Don't expose internal error details
  res.status(500).json({
    success: false,
    message: 'セキュリティエラーが発生しました',
    code: 'SECURITY_ERROR'
  });
};

/**
 * Generate Security Report
 */
const generateSecurityReport = () => {
  return {
    timestamp: new Date(),
    blacklistedIPs: Array.from(SECURITY_CONFIG.blacklistedIPs),
    suspiciousActivities: SECURITY_CONFIG.suspiciousActivities.size,
    activeCSRFTokens: SECURITY_CONFIG.csrfTokens.size,
    activeSessions: SECURITY_CONFIG.sessionTokens.size,
    securityConfig: {
      rateLimitWindow: SECURITY_CONFIG.rateLimit.windowMs,
      maxRequestsPerWindow: SECURITY_CONFIG.rateLimit.max,
      encryptionAlgorithm: SECURITY_CONFIG.encryption.algorithm
    }
  };
};

module.exports = {
  // Rate limiting
  apiLimiter,
  authLimiter,
  uploadLimiter,
  messagingLimiter,
  createRateLimit,
  
  // Input validation and sanitization
  sanitizeInput,
  validationSchemas,
  
  // CSRF protection
  generateCSRFToken,
  validateCSRFToken,
  
  // Data encryption
  encryptSensitiveData,
  decryptSensitiveData,
  
  // Medical data protection
  protectMedicalData,
  
  // File upload security
  secureFileUpload,
  
  // IP and activity monitoring
  blockSuspiciousIPs,
  trackSuspiciousActivity,
  
  // Session management
  validateSession,
  
  // API security
  validateAPIKey,
  
  // Security headers
  setupCSP,
  securityHeaders,
  
  // Error handling
  securityErrorHandler,
  
  // Utilities
  generateSecurityReport,
  logSecurityEvent,
  logMedicalDataAccess
};