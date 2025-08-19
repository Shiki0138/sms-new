const { supabase } = require('../config/supabase/client');

/**
 * Supabase authentication middleware
 * Verifies JWT tokens and attaches user info to request
 */
const supabaseAuth = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header provided' });
    }

    const token = authHeader.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Get user profile with tenant info
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*, tenants(*)')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return res.status(401).json({ error: 'User profile not found' });
    }

    // Check if user is active
    if (!profile.is_active) {
      return res.status(403).json({ error: 'User account is deactivated' });
    }

    // Attach user info to request
    req.user = {
      id: user.id,
      email: user.email,
      role: profile.role,
      tenantId: profile.tenant_id,
      tenant: profile.tenants,
      fullName: profile.full_name
    };

    // Store the token for potential use in downstream operations
    req.supabaseToken = token;

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

/**
 * Require specific roles middleware
 * @param {Array|String} roles - Required roles
 */
const requireRole = (roles) => {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: allowedRoles,
        current: req.user.role
      });
    }

    next();
  };
};

/**
 * Verify tenant access middleware
 * Ensures user can only access their own tenant's data
 */
const verifyTenantAccess = (req, res, next) => {
  const tenantId = req.params.tenantId || req.body.tenantId || req.query.tenantId;
  
  if (!tenantId) {
    return res.status(400).json({ error: 'Tenant ID is required' });
  }

  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  // Super admins can access any tenant (if you have this role)
  if (req.user.role === 'super_admin') {
    return next();
  }

  // Check if user belongs to the tenant
  if (req.user.tenantId !== tenantId) {
    return res.status(403).json({ error: 'Access denied to this tenant' });
  }

  next();
};

/**
 * Optional authentication middleware
 * Attaches user if token is provided, but doesn't require it
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return next();
    }

    const token = authHeader.replace('Bearer ', '');
    
    if (!token) {
      return next();
    }

    // Try to verify token
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (!error && user) {
      // Get user profile
      const { data: profile } = await supabase
        .from('users')
        .select('*, tenants(*)')
        .eq('id', user.id)
        .single();

      if (profile && profile.is_active) {
        req.user = {
          id: user.id,
          email: user.email,
          role: profile.role,
          tenantId: profile.tenant_id,
          tenant: profile.tenants,
          fullName: profile.full_name
        };
        req.supabaseToken = token;
      }
    }

    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

/**
 * Rate limiting per user/tenant
 * Uses in-memory store for simplicity, consider Redis for production
 */
const rateLimitStore = new Map();

const rateLimit = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100, // max requests per window
    message = 'Too many requests, please try again later',
    keyGenerator = (req) => req.user?.id || req.ip
  } = options;

  return (req, res, next) => {
    const key = keyGenerator(req);
    const now = Date.now();
    
    // Clean up old entries
    for (const [k, v] of rateLimitStore.entries()) {
      if (v.resetTime < now) {
        rateLimitStore.delete(k);
      }
    }

    // Get or create rate limit entry
    let limit = rateLimitStore.get(key);
    
    if (!limit) {
      limit = {
        count: 0,
        resetTime: now + windowMs
      };
      rateLimitStore.set(key, limit);
    }

    // Check if window has expired
    if (limit.resetTime < now) {
      limit.count = 0;
      limit.resetTime = now + windowMs;
    }

    // Increment count
    limit.count++;

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - limit.count));
    res.setHeader('X-RateLimit-Reset', new Date(limit.resetTime).toISOString());

    // Check if limit exceeded
    if (limit.count > max) {
      return res.status(429).json({ error: message });
    }

    next();
  };
};

/**
 * Plan-based feature access middleware
 * Checks if the tenant's plan allows access to a feature
 */
const requirePlanFeature = (feature) => {
  return async (req, res, next) => {
    if (!req.user || !req.user.tenantId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
      // Check plan limits using RPC function
      const { data, error } = await supabase.rpc('check_plan_limits', {
        p_tenant_id: req.user.tenantId,
        p_feature: feature
      });

      if (error) throw error;

      const result = data[0];
      
      if (!result || !result.allowed) {
        return res.status(403).json({
          error: 'Feature not available in your plan',
          feature: feature,
          currentPlan: req.user.tenant?.plan_type,
          limit: result?.limit,
          current: result?.current
        });
      }

      // Attach limit info to request for potential use
      req.planLimit = {
        feature,
        limit: result.limit,
        current: result.current,
        remaining: result.limit ? result.limit - result.current : null
      };

      next();
    } catch (error) {
      console.error('Plan feature check error:', error);
      // Allow access on error to prevent blocking
      next();
    }
  };
};

/**
 * API key authentication for external integrations
 */
const apiKeyAuth = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'] || req.query.api_key;
    
    if (!apiKey) {
      return res.status(401).json({ error: 'API key required' });
    }

    // Verify API key (you would implement this based on your API key storage)
    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('api_key', apiKey)
      .single();

    if (error || !tenant) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    // Attach tenant info to request
    req.tenant = tenant;
    req.user = {
      id: 'api-user',
      tenantId: tenant.id,
      tenant: tenant,
      role: 'api'
    };

    next();
  } catch (error) {
    console.error('API key auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

module.exports = {
  supabaseAuth,
  requireRole,
  verifyTenantAccess,
  optionalAuth,
  rateLimit,
  requirePlanFeature,
  apiKeyAuth
};