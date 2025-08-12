const { tenantService } = require('../services/tenant-service');
const rateLimit = require('express-rate-limit');

/**
 * Authentication Middleware
 * Handles API key validation and tenant authentication
 */

/**
 * Extract API key from request
 */
function extractApiKey(req) {
  // Check Authorization header: Bearer <api-key>
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Check X-API-Key header
  const apiKeyHeader = req.headers['x-api-key'];
  if (apiKeyHeader) {
    return apiKeyHeader;
  }

  // Check query parameter (not recommended for production)
  if (req.query.api_key) {
    return req.query.api_key;
  }

  return null;
}

/**
 * Authenticate API key and attach tenant to request
 */
async function authenticateApiKey(req, res, next) {
  try {
    const apiKey = extractApiKey(req);

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: 'API key is required',
        code: 'MISSING_API_KEY'
      });
    }

    // Get tenant by API key
    const tenant = await tenantService.getTenantByApiKey(apiKey);
    
    // Check tenant status
    if (tenant.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: `Tenant is ${tenant.status}`,
        code: 'TENANT_INACTIVE'
      });
    }

    // Attach tenant to request
    req.tenant = tenant;
    req.apiKey = apiKey;

    next();
  } catch (error) {
    if (error.message === 'Invalid API key') {
      return res.status(401).json({
        success: false,
        error: 'Invalid API key',
        code: 'INVALID_API_KEY'
      });
    }

    console.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication failed',
      code: 'AUTH_ERROR'
    });
  }
}

/**
 * Check tenant quota before processing
 */
async function checkQuota(messageCount = 1) {
  return async (req, res, next) => {
    try {
      const tenant = req.tenant;
      
      if (!tenant) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      // Extract message count from request if it's a function
      let count = messageCount;
      if (typeof messageCount === 'function') {
        count = messageCount(req);
      }

      const quotaResult = await tenantService.checkAndUpdateUsage(tenant.id, count);
      
      if (!quotaResult.success) {
        return res.status(429).json({
          success: false,
          error: quotaResult.error,
          code: 'QUOTA_EXCEEDED',
          quota: quotaResult.quota
        });
      }

      // Attach quota info to request
      req.quota = quotaResult.quota;
      
      next();
    } catch (error) {
      console.error('Quota check error:', error);
      return res.status(500).json({
        success: false,
        error: 'Quota check failed',
        code: 'QUOTA_ERROR'
      });
    }
  };
}

/**
 * Create rate limiter based on tenant plan
 */
function createRateLimiter(req, res, next) {
  const tenant = req.tenant;
  
  if (!tenant) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  // Create rate limiter based on tenant's rate limit
  const rateLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute window
    max: tenant.quotas.rateLimit,
    keyGenerator: (req) => req.tenant.id,
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        code: 'RATE_LIMIT_EXCEEDED',
        limit: tenant.quotas.rateLimit,
        window: '1 minute'
      });
    },
    standardHeaders: true,
    legacyHeaders: false
  });

  rateLimiter(req, res, next);
}

/**
 * Validate provider access
 */
function validateProviderAccess(req, res, next) {
  const tenant = req.tenant;
  const providerName = req.body.provider || req.query.provider;

  if (providerName && !tenant.isProviderAllowed(providerName)) {
    return res.status(403).json({
      success: false,
      error: `Provider ${providerName} not allowed for ${tenant.plan} plan`,
      code: 'PROVIDER_NOT_ALLOWED',
      allowedProviders: tenant.quotas.providerOptions
    });
  }

  next();
}

/**
 * Admin authentication middleware
 * For tenant management endpoints
 */
async function authenticateAdmin(req, res, next) {
  try {
    const adminKey = req.headers['x-admin-key'];
    const expectedAdminKey = process.env.ADMIN_API_KEY;

    if (!expectedAdminKey) {
      return res.status(500).json({
        success: false,
        error: 'Admin authentication not configured'
      });
    }

    if (!adminKey || adminKey !== expectedAdminKey) {
      return res.status(401).json({
        success: false,
        error: 'Invalid admin credentials'
      });
    }

    next();
  } catch (error) {
    console.error('Admin authentication error:', error);
    return res.status(500).json({
      success: false,
      error: 'Admin authentication failed'
    });
  }
}

/**
 * Request logging middleware
 */
function logRequest(req, res, next) {
  const start = Date.now();
  const originalSend = res.send;

  res.send = function(data) {
    const duration = Date.now() - start;
    const tenant = req.tenant;
    
    console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms - Tenant: ${tenant?.id || 'none'}`);
    
    originalSend.call(this, data);
  };

  next();
}

/**
 * Error handling middleware
 */
function errorHandler(err, req, res, next) {
  console.error('Request error:', err);

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      details: err.message
    });
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized'
    });
  }

  // Default error response
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { details: err.message })
  });
}

module.exports = {
  authenticateApiKey,
  checkQuota,
  createRateLimiter,
  validateProviderAccess,
  authenticateAdmin,
  logRequest,
  errorHandler,
  extractApiKey
};