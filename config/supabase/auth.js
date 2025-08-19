const { supabase, supabaseAdmin, supabaseHelpers } = require('./client');
const jwt = require('jsonwebtoken');

// Auth configuration and helpers
const authConfig = {
  // Session duration
  sessionDuration: 60 * 60 * 24 * 7, // 7 days in seconds
  
  // Password requirements
  passwordRequirements: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
  },
  
  // Rate limiting
  rateLimits: {
    signIn: { attempts: 5, window: 15 * 60 }, // 5 attempts per 15 minutes
    signUp: { attempts: 3, window: 60 * 60 }, // 3 attempts per hour
    passwordReset: { attempts: 3, window: 60 * 60 }, // 3 attempts per hour
  },
};

// Authentication middleware for Express
const authMiddleware = {
  // Verify JWT token
  verifyToken: async (req, res, next) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }

      // Verify with Supabase
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (error || !user) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      // Get user details including tenant
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*, tenants(*)')
        .eq('id', user.id)
        .single();

      if (userError || !userData) {
        return res.status(401).json({ error: 'User not found' });
      }

      // Attach user and tenant to request
      req.user = {
        id: user.id,
        email: user.email,
        role: userData.role,
        tenantId: userData.tenant_id,
        tenant: userData.tenants,
      };

      next();
    } catch (error) {
      console.error('Auth middleware error:', error);
      res.status(500).json({ error: 'Authentication failed' });
    }
  },

  // Require specific role
  requireRole: (roles) => {
    return async (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const userRoles = Array.isArray(req.user.role) ? req.user.role : [req.user.role];
      const allowedRoles = Array.isArray(roles) ? roles : [roles];

      if (!allowedRoles.some(role => userRoles.includes(role))) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      next();
    };
  },

  // Verify tenant access
  verifyTenantAccess: async (req, res, next) => {
    try {
      const tenantId = req.params.tenantId || req.body.tenantId || req.query.tenantId;
      
      if (!tenantId) {
        return res.status(400).json({ error: 'Tenant ID required' });
      }

      if (req.user.tenantId !== tenantId && req.user.role !== 'super_admin') {
        return res.status(403).json({ error: 'Access denied to this tenant' });
      }

      next();
    } catch (error) {
      console.error('Tenant verification error:', error);
      res.status(500).json({ error: 'Tenant verification failed' });
    }
  },
};

// Authentication functions
const authFunctions = {
  // Sign up new user
  signUp: async ({ email, password, fullName, tenantName, planType = 'light' }) => {
    try {
      // Start a transaction
      const { data: tenant, error: tenantError } = await supabaseAdmin
        .from('tenants')
        .insert({
          name: tenantName,
          email: email,
          plan_type: planType,
        })
        .select()
        .single();

      if (tenantError) throw tenantError;

      // Sign up user with Supabase Auth
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          tenant_id: tenant.id,
        },
      });

      if (authError) {
        // Rollback tenant creation
        await supabaseAdmin.from('tenants').delete().eq('id', tenant.id);
        throw authError;
      }

      // Create user profile
      const { error: profileError } = await supabaseAdmin
        .from('users')
        .insert({
          id: authData.user.id,
          email: email,
          full_name: fullName,
          tenant_id: tenant.id,
          role: 'owner',
        });

      if (profileError) {
        // Rollback
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        await supabaseAdmin.from('tenants').delete().eq('id', tenant.id);
        throw profileError;
      }

      return {
        user: authData.user,
        tenant,
        session: authData.session,
      };
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  },

  // Sign in user
  signIn: async ({ email, password }) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Get user details
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*, tenants(*)')
        .eq('id', data.user.id)
        .single();

      if (userError) throw userError;

      return {
        user: data.user,
        session: data.session,
        profile: userData,
      };
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  },

  // Sign out user
  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  // Reset password
  resetPassword: async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.APP_URL}/auth/reset-password`,
    });
    if (error) throw error;
  },

  // Update password
  updatePassword: async (newPassword) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (error) throw error;
  },

  // Verify email
  verifyEmail: async (token) => {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: 'email',
    });
    if (error) throw error;
  },

  // Invite user to tenant
  inviteUser: async ({ email, role, tenantId, invitedBy }) => {
    try {
      // Generate invite token
      const inviteToken = jwt.sign(
        {
          email,
          role,
          tenantId,
          invitedBy,
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Store invite in database
      const { data, error } = await supabaseAdmin
        .from('invitations')
        .insert({
          email,
          role,
          tenant_id: tenantId,
          invited_by: invitedBy,
          token: inviteToken,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Send invite email (implement your email service here)
      // await sendInviteEmail({ email, inviteToken, tenantName });

      return data;
    } catch (error) {
      console.error('Invite user error:', error);
      throw error;
    }
  },

  // Accept invitation
  acceptInvitation: async ({ token, password, fullName }) => {
    try {
      // Verify and decode token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get invitation from database
      const { data: invitation, error: inviteError } = await supabaseAdmin
        .from('invitations')
        .select('*')
        .eq('token', token)
        .eq('email', decoded.email)
        .single();

      if (inviteError || !invitation) {
        throw new Error('Invalid or expired invitation');
      }

      // Create user
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: decoded.email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          tenant_id: decoded.tenantId,
        },
      });

      if (authError) throw authError;

      // Create user profile
      const { error: profileError } = await supabaseAdmin
        .from('users')
        .insert({
          id: authData.user.id,
          email: decoded.email,
          full_name: fullName,
          tenant_id: decoded.tenantId,
          role: decoded.role,
        });

      if (profileError) {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        throw profileError;
      }

      // Delete invitation
      await supabaseAdmin
        .from('invitations')
        .delete()
        .eq('id', invitation.id);

      return {
        user: authData.user,
        session: authData.session,
      };
    } catch (error) {
      console.error('Accept invitation error:', error);
      throw error;
    }
  },

  // Validate password strength
  validatePassword: (password) => {
    const { passwordRequirements } = authConfig;
    const errors = [];

    if (password.length < passwordRequirements.minLength) {
      errors.push(`Password must be at least ${passwordRequirements.minLength} characters`);
    }
    if (passwordRequirements.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (passwordRequirements.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (passwordRequirements.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    if (passwordRequirements.requireSpecialChars && !/[!@#$%^&*]/.test(password)) {
      errors.push('Password must contain at least one special character (!@#$%^&*)');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },
};

module.exports = {
  authConfig,
  authMiddleware,
  authFunctions,
};