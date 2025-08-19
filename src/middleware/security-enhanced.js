/**
 * Enhanced Security Middleware
 * 重要なセキュリティ機能の実装
 */

const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const crypto = require('crypto');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

/**
 * セキュリティヘッダーの強化
 */
const enhancedHelmet = () => {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        scriptSrc: ["'self'", "'unsafe-inline'", 'https://www.google-analytics.com'],
        imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
        connectSrc: ["'self'", 'https://api.openai.com', 'https://api.stripe.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'self'", 'https://js.stripe.com']
      }
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    referrerPolicy: { policy: 'same-origin' }
  });
};

/**
 * DDoS対策 - 高度なレート制限
 */
const createAdvancedRateLimiter = (options = {}) => {
  const defaults = {
    windowMs: 15 * 60 * 1000, // 15分
    max: 100, // 最大リクエスト数
    message: 'リクエストが多すぎます。しばらくしてから再度お試しください。',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    handler: (req, res) => {
      // 監査ログに記録
      logSecurityEvent('RATE_LIMIT_EXCEEDED', {
        ip: req.ip,
        path: req.path,
        userAgent: req.get('User-Agent')
      });
      
      res.status(429).json({
        error: 'Too Many Requests',
        message: options.message || defaults.message,
        retryAfter: Math.ceil(options.windowMs / 1000)
      });
    }
  };
  
  return rateLimit({ ...defaults, ...options });
};

/**
 * ログインアタック対策
 */
const loginRateLimiter = createAdvancedRateLimiter({
  windowMs: 15 * 60 * 1000, // 15分
  max: 5, // 最大5回の失敗
  skipSuccessfulRequests: true,
  message: 'ログイン試行回数が上限に達しました。15分後に再度お試しください。'
});

/**
 * API レート制限（プラン別）
 */
const createPlanBasedRateLimiter = () => {
  const limits = {
    light: { windowMs: 60 * 1000, max: 60 }, // 60req/min
    standard: { windowMs: 60 * 1000, max: 120 }, // 120req/min
    premium: { windowMs: 60 * 1000, max: 300 } // 300req/min
  };
  
  return (req, res, next) => {
    const userPlan = req.user?.planType || 'light';
    const limit = limits[userPlan] || limits.light;
    
    const limiter = createAdvancedRateLimiter(limit);
    limiter(req, res, next);
  };
};

/**
 * 2要素認証（2FA）機能
 */
class TwoFactorAuth {
  /**
   * 2FAシークレット生成
   */
  static generateSecret(email, salonName) {
    const secret = speakeasy.generateSecret({
      name: `${salonName} (${email})`,
      issuer: 'Salon Lumière',
      length: 32
    });
    
    return {
      secret: secret.base32,
      qrCode: null // QRコードは別途生成
    };
  }
  
  /**
   * QRコード生成
   */
  static async generateQRCode(secret, email, salonName) {
    const otpauthUrl = speakeasy.otpauthURL({
      secret: secret,
      label: `${salonName}:${email}`,
      issuer: 'Salon Lumière',
      encoding: 'base32'
    });
    
    const qrCode = await QRCode.toDataURL(otpauthUrl);
    return qrCode;
  }
  
  /**
   * トークン検証
   */
  static verifyToken(secret, token) {
    return speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token,
      window: 2 // 前後2つの時間枠を許容
    });
  }
  
  /**
   * バックアップコード生成
   */
  static generateBackupCodes(count = 10) {
    const codes = [];
    for (let i = 0; i < count; i++) {
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
  }
}

/**
 * セッション管理強化
 */
const sessionConfig = {
  secret: process.env.SESSION_SECRET || crypto.randomBytes(64).toString('hex'),
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS必須
    httpOnly: true,
    maxAge: 30 * 60 * 1000, // 30分
    sameSite: 'strict'
  },
  name: 'salon.sid', // デフォルト名を変更
  genid: () => {
    return crypto.randomBytes(32).toString('hex');
  }
};

/**
 * CSRF保護
 */
const generateCSRFToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

const validateCSRFToken = (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  
  const token = req.body._csrf || req.headers['x-csrf-token'];
  const sessionToken = req.session?.csrfToken;
  
  if (!token || !sessionToken || token !== sessionToken) {
    logSecurityEvent('CSRF_VALIDATION_FAILED', {
      ip: req.ip,
      path: req.path,
      method: req.method
    });
    
    return res.status(403).json({
      error: 'Invalid CSRF token',
      message: 'セキュリティトークンが無効です'
    });
  }
  
  next();
};

/**
 * 監査ログシステム
 */
const auditLogger = {
  logs: [], // 本番環境ではデータベース使用
  
  log(eventType, details, userId = null) {
    const log = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      eventType,
      userId,
      details,
      ip: details.ip || 'unknown',
      userAgent: details.userAgent || 'unknown'
    };
    
    this.logs.push(log);
    
    // 本番環境ではデータベースに保存
    if (process.env.NODE_ENV === 'production') {
      // TODO: データベースに保存
      console.log('[AUDIT]', JSON.stringify(log));
    }
    
    return log;
  },
  
  query(filters = {}) {
    let results = [...this.logs];
    
    if (filters.userId) {
      results = results.filter(log => log.userId === filters.userId);
    }
    
    if (filters.eventType) {
      results = results.filter(log => log.eventType === filters.eventType);
    }
    
    if (filters.startDate) {
      results = results.filter(log => new Date(log.timestamp) >= new Date(filters.startDate));
    }
    
    if (filters.endDate) {
      results = results.filter(log => new Date(log.timestamp) <= new Date(filters.endDate));
    }
    
    return results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }
};

// ログ記録用ヘルパー関数
const logSecurityEvent = (eventType, details) => {
  auditLogger.log(eventType, details);
};

const logUserActivity = (eventType, details, userId) => {
  auditLogger.log(eventType, details, userId);
};

/**
 * データ暗号化
 */
class DataEncryption {
  static algorithm = 'aes-256-gcm';
  static keyLength = 32;
  static ivLength = 16;
  static tagLength = 16;
  static saltLength = 64;
  static iterations = 100000;
  
  /**
   * 暗号化キー生成
   */
  static generateKey(password, salt) {
    return crypto.pbkdf2Sync(password, salt, this.iterations, this.keyLength, 'sha256');
  }
  
  /**
   * データ暗号化
   */
  static encrypt(text, password) {
    const salt = crypto.randomBytes(this.saltLength);
    const key = this.generateKey(password, salt);
    const iv = crypto.randomBytes(this.ivLength);
    
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);
    
    const encrypted = Buffer.concat([
      cipher.update(text, 'utf8'),
      cipher.final()
    ]);
    
    const tag = cipher.getAuthTag();
    
    return Buffer.concat([salt, iv, tag, encrypted]).toString('base64');
  }
  
  /**
   * データ復号化
   */
  static decrypt(encryptedData, password) {
    const data = Buffer.from(encryptedData, 'base64');
    
    const salt = data.slice(0, this.saltLength);
    const iv = data.slice(this.saltLength, this.saltLength + this.ivLength);
    const tag = data.slice(this.saltLength + this.ivLength, this.saltLength + this.ivLength + this.tagLength);
    const encrypted = data.slice(this.saltLength + this.ivLength + this.tagLength);
    
    const key = this.generateKey(password, salt);
    
    const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
    decipher.setAuthTag(tag);
    
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);
    
    return decrypted.toString('utf8');
  }
}

/**
 * IPホワイトリスト
 */
const ipWhitelist = (allowedIPs = []) => {
  return (req, res, next) => {
    if (allowedIPs.length === 0) {
      return next();
    }
    
    const clientIP = req.ip || req.connection.remoteAddress;
    
    if (!allowedIPs.includes(clientIP)) {
      logSecurityEvent('IP_WHITELIST_BLOCKED', {
        ip: clientIP,
        path: req.path,
        userAgent: req.get('User-Agent')
      });
      
      return res.status(403).json({
        error: 'Access denied',
        message: 'このIPアドレスからのアクセスは許可されていません'
      });
    }
    
    next();
  };
};

/**
 * セキュリティミドルウェア統合
 */
const setupSecurity = (app) => {
  // セキュリティヘッダー
  app.use(enhancedHelmet());
  
  // NoSQLインジェクション対策
  app.use(mongoSanitize());
  
  // XSS対策
  app.use(xss());
  
  // パラメータ汚染対策
  app.use(hpp());
  
  // 基本的なレート制限
  app.use('/api/', createAdvancedRateLimiter());
  
  // ログイン用の厳しいレート制限
  app.use('/api/auth/login', loginRateLimiter);
  
  // CSRFトークン生成
  app.use((req, res, next) => {
    if (req.session && !req.session.csrfToken) {
      req.session.csrfToken = generateCSRFToken();
    }
    next();
  });
  
  return app;
};

module.exports = {
  setupSecurity,
  enhancedHelmet,
  createAdvancedRateLimiter,
  loginRateLimiter,
  createPlanBasedRateLimiter,
  TwoFactorAuth,
  sessionConfig,
  generateCSRFToken,
  validateCSRFToken,
  auditLogger,
  logSecurityEvent,
  logUserActivity,
  DataEncryption,
  ipWhitelist
};