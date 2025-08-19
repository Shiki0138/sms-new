const express = require('express');
const router = express.Router();
const { authFunctions, authMiddleware } = require('../config/supabase/auth');
const { userService } = require('../services/supabase');
const { validationResult } = require('express-validator');
const { 
  validateSignUp, 
  validateSignIn, 
  validatePasswordReset,
  validatePasswordUpdate 
} = require('../middleware/validation');

/**
 * @route   POST /api/auth/signup
 * @desc    Register a new user and create tenant
 * @access  Public
 */
router.post('/signup', validateSignUp, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, fullName, tenantName, planType = 'light' } = req.body;

    // Validate password strength
    const passwordValidation = authFunctions.validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ 
        error: 'Invalid password', 
        details: passwordValidation.errors 
      });
    }

    // Create user and tenant
    const result = await authFunctions.signUp({
      email,
      password,
      fullName,
      tenantName,
      planType
    });

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: result.user.id,
        email: result.user.email,
        fullName: result.user.user_metadata.full_name
      },
      tenant: {
        id: result.tenant.id,
        name: result.tenant.name,
        planType: result.tenant.plan_type
      },
      session: result.session
    });
  } catch (error) {
    console.error('Signup error:', error);
    
    if (error.message.includes('already registered')) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    
    res.status(500).json({ error: 'Failed to create account' });
  }
});

/**
 * @route   POST /api/auth/signin
 * @desc    Authenticate user and return token
 * @access  Public
 */
router.post('/signin', validateSignIn, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Sign in user
    const result = await authFunctions.signIn({ email, password });

    res.json({
      message: 'Signed in successfully',
      user: {
        id: result.user.id,
        email: result.user.email,
        role: result.profile.role,
        tenantId: result.profile.tenant_id
      },
      tenant: result.profile.tenants,
      session: result.session
    });
  } catch (error) {
    console.error('Signin error:', error);
    
    if (error.message.includes('Invalid login credentials')) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    res.status(500).json({ error: 'Failed to sign in' });
  }
});

/**
 * @route   POST /api/auth/signout
 * @desc    Sign out user
 * @access  Private
 */
router.post('/signout', authMiddleware.verifyToken, async (req, res) => {
  try {
    await authFunctions.signOut();
    res.json({ message: 'Signed out successfully' });
  } catch (error) {
    console.error('Signout error:', error);
    res.status(500).json({ error: 'Failed to sign out' });
  }
});

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Send password reset email
 * @access  Public
 */
router.post('/forgot-password', validatePasswordReset, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;

    await authFunctions.resetPassword(email);

    res.json({ 
      message: 'Password reset instructions sent to your email' 
    });
  } catch (error) {
    console.error('Password reset error:', error);
    // Don't reveal if email exists or not
    res.json({ 
      message: 'If an account exists with this email, you will receive password reset instructions' 
    });
  }
});

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
router.post('/reset-password', validatePasswordUpdate, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { password } = req.body;

    // Validate password strength
    const passwordValidation = authFunctions.validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ 
        error: 'Invalid password', 
        details: passwordValidation.errors 
      });
    }

    await authFunctions.updatePassword(password);

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Password update error:', error);
    res.status(500).json({ error: 'Failed to update password' });
  }
});

/**
 * @route   GET /api/auth/me
 * @desc    Get current user info
 * @access  Private
 */
router.get('/me', authMiddleware.verifyToken, async (req, res) => {
  try {
    const user = await userService.findById(req.user.id, {
      select: '*, tenants(*)'
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        isActive: user.is_active
      },
      tenant: user.tenants
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user information' });
  }
});

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', authMiddleware.verifyToken, async (req, res) => {
  try {
    const { fullName } = req.body;
    
    const updatedUser = await userService.updateProfile(req.user.id, {
      full_name: fullName
    });

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        fullName: updatedUser.full_name,
        role: updatedUser.role
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

/**
 * @route   PUT /api/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.put('/change-password', 
  authMiddleware.verifyToken, 
  validatePasswordUpdate, 
  async (req, res) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { currentPassword, newPassword } = req.body;

      // Verify current password first
      try {
        await authFunctions.signIn({
          email: req.user.email,
          password: currentPassword
        });
      } catch (error) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }

      // Validate new password strength
      const passwordValidation = authFunctions.validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        return res.status(400).json({ 
          error: 'Invalid password', 
          details: passwordValidation.errors 
        });
      }

      // Update password
      await userService.updatePassword(req.user.id, newPassword);

      res.json({ message: 'Password changed successfully' });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ error: 'Failed to change password' });
    }
});

/**
 * @route   POST /api/auth/invite
 * @desc    Invite user to tenant
 * @access  Private (Owner/Admin only)
 */
router.post('/invite', 
  authMiddleware.verifyToken,
  authMiddleware.requireRole(['owner', 'admin']),
  async (req, res) => {
    try {
      const { email, role } = req.body;

      if (!email || !role) {
        return res.status(400).json({ error: 'Email and role are required' });
      }

      const validRoles = ['admin', 'staff'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }

      const invitation = await authFunctions.inviteUser({
        email,
        role,
        tenantId: req.user.tenantId,
        invitedBy: req.user.id
      });

      res.status(201).json({
        message: 'Invitation sent successfully',
        invitation: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          expiresAt: invitation.expires_at
        }
      });
    } catch (error) {
      console.error('Invite user error:', error);
      
      if (error.message.includes('already exists')) {
        return res.status(409).json({ error: 'User already exists' });
      }
      
      res.status(500).json({ error: 'Failed to send invitation' });
    }
});

/**
 * @route   POST /api/auth/accept-invite
 * @desc    Accept invitation and create account
 * @access  Public
 */
router.post('/accept-invite', async (req, res) => {
  try {
    const { token, password, fullName } = req.body;

    if (!token || !password || !fullName) {
      return res.status(400).json({ 
        error: 'Token, password, and full name are required' 
      });
    }

    // Validate password strength
    const passwordValidation = authFunctions.validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ 
        error: 'Invalid password', 
        details: passwordValidation.errors 
      });
    }

    const result = await authFunctions.acceptInvitation({
      token,
      password,
      fullName
    });

    res.status(201).json({
      message: 'Account created successfully',
      user: {
        id: result.user.id,
        email: result.user.email
      },
      session: result.session
    });
  } catch (error) {
    console.error('Accept invitation error:', error);
    
    if (error.message.includes('Invalid or expired')) {
      return res.status(400).json({ error: 'Invalid or expired invitation' });
    }
    
    res.status(500).json({ error: 'Failed to accept invitation' });
  }
});

/**
 * @route   POST /api/auth/verify-email
 * @desc    Verify email address
 * @access  Public
 */
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Verification token is required' });
    }

    await authFunctions.verifyEmail(token);

    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(400).json({ error: 'Invalid or expired verification token' });
  }
});

module.exports = router;