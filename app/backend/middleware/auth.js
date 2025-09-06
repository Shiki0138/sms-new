const jwt = require('jsonwebtoken');
const config = require('../../sms-service/src/config');

/**
 * JWT Authentication middleware
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access token required'
    });
  }

  jwt.verify(token, config.jwt.secret, (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    req.user = user;
    next();
  });
};

/**
 * API Key authentication middleware (for admin endpoints)
 */
const authenticateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'API key required'
    });
  }

  if (apiKey !== config.security.adminApiKey) {
    return res.status(403).json({
      success: false,
      error: 'Invalid API key'
    });
  }

  next();
};

/**
 * Tenant validation middleware
 */
const validateTenant = async (req, res, next) => {
  try {
    const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Tenant ID required'
      });
    }

    // TODO: Validate tenant exists and is active
    // For now, we'll use a simple validation
    const tenant = {
      id: tenantId,
      name: `Tenant-${tenantId}`,
      active: true,
      plan: 'basic', // basic, premium, enterprise
      limits: {
        smsPerDay: 1000,
        smsPerMonth: 30000,
        bulkSmsPerDay: 10,
        providersAllowed: ['twilio']
      }
    };

    if (!tenant.active) {
      return res.status(403).json({
        success: false,
        error: 'Tenant account suspended'
      });
    }

    req.tenant = tenant;
    next();
  } catch (error) {
    console.error('Tenant validation error:', error);
    res.status(500).json({
      success: false,
      error: 'Tenant validation failed'
    });
  }
};

/**
 * Rate limiting per tenant
 */
const createTenantRateLimit = (limit, windowMs = 15 * 60 * 1000) => {
  const tenantLimits = new Map();

  return (req, res, next) => {
    const tenantId = req.tenant?.id;
    
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Tenant ID required for rate limiting'
      });
    }

    const now = Date.now();
    const windowStart = now - windowMs;

    // Get or create tenant rate limit data
    if (!tenantLimits.has(tenantId)) {
      tenantLimits.set(tenantId, {
        requests: [],
        resetTime: now + windowMs
      });
    }

    const tenantData = tenantLimits.get(tenantId);

    // Remove expired requests
    tenantData.requests = tenantData.requests.filter(time => time > windowStart);

    // Check if limit exceeded
    if (tenantData.requests.length >= limit) {
      const resetTime = Math.ceil((tenantData.resetTime - now) / 1000);
      
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded for tenant',
        retryAfter: resetTime
      });
    }

    // Add current request
    tenantData.requests.push(now);

    // Set response headers
    res.set({
      'X-RateLimit-Limit': limit,
      'X-RateLimit-Remaining': limit - tenantData.requests.length,
      'X-RateLimit-Reset': Math.ceil(tenantData.resetTime / 1000)
    });

    next();
  };
};

/**
 * Permission-based access control
 */
const requirePermission = (permission) => {
  return (req, res, next) => {
    const userPermissions = req.user?.permissions || [];
    
    if (!userPermissions.includes(permission)) {
      return res.status(403).json({
        success: false,
        error: `Permission required: ${permission}`
      });
    }

    next();
  };
};

/**
 * Plan-based access control
 */
const requirePlan = (requiredPlan) => {
  const planHierarchy = {
    basic: 1,
    premium: 2,
    enterprise: 3
  };

  return (req, res, next) => {
    const tenantPlan = req.tenant?.plan || 'basic';
    const requiredLevel = planHierarchy[requiredPlan] || 1;
    const currentLevel = planHierarchy[tenantPlan] || 1;

    if (currentLevel < requiredLevel) {
      return res.status(403).json({
        success: false,
        error: `Plan upgrade required: ${requiredPlan}`,
        currentPlan: tenantPlan
      });
    }

    next();
  };
};

/**
 * Request logging middleware
 */
const logRequest = (req, res, next) => {
  const start = Date.now();
  const { method, url, ip } = req;
  const userAgent = req.get('User-Agent');
  const tenantId = req.tenant?.id || 'unknown';

  console.log(`[${new Date().toISOString()}] ${method} ${url} - Tenant: ${tenantId}, IP: ${ip}`);

  // Log response time on completion
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${method} ${url} - ${res.statusCode} (${duration}ms)`);
  });

  next();
};

module.exports = {
  authenticateToken,
  authenticateApiKey,
  validateTenant,
  createTenantRateLimit,
  requirePermission,
  requirePlan,
  logRequest
};