const BaseService = require('./base.service');
const { authFunctions } = require('../../config/supabase/auth');

/**
 * User service for managing users and authentication
 */
class UserService extends BaseService {
  constructor() {
    super('users');
  }

  /**
   * Find user by email
   * @param {string} email - User email
   * @param {Object} options - Query options
   * @returns {Promise<Object>} User object
   */
  async findByEmail(email, options = {}) {
    return await this.findOne({ email }, options);
  }

  /**
   * Create a new user with authentication
   * @param {Object} userData - User data including password
   * @returns {Promise<Object>} Created user with session
   */
  async createWithAuth(userData) {
    const { email, password, fullName, tenantName, planType, role } = userData;

    try {
      // If creating owner, use signUp function
      if (role === 'owner' || !role) {
        return await authFunctions.signUp({
          email,
          password,
          fullName,
          tenantName,
          planType
        });
      }

      // For staff users, create directly
      const { data: authData, error: authError } = await this.supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          tenant_id: userData.tenantId
        }
      });

      if (authError) throw authError;

      // Create user profile
      const user = await this.create({
        id: authData.user.id,
        email,
        full_name: fullName,
        tenant_id: userData.tenantId,
        role: role || 'staff'
      });

      return { user: authData.user, profile: user };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Update user profile
   * @param {string} userId - User ID
   * @param {Object} updates - Profile updates
   * @returns {Promise<Object>} Updated user
   */
  async updateProfile(userId, updates) {
    // Remove sensitive fields
    delete updates.id;
    delete updates.email; // Email should be updated through auth
    delete updates.password;

    return await this.update(userId, updates);
  }

  /**
   * Update user password
   * @param {string} userId - User ID
   * @param {string} newPassword - New password
   * @returns {Promise<boolean>} Success status
   */
  async updatePassword(userId, newPassword) {
    try {
      const { error } = await this.supabaseAdmin.auth.admin.updateUserById(
        userId,
        { password: newPassword }
      );

      if (error) throw error;

      return true;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get users by tenant
   * @param {string} tenantId - Tenant ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of users
   */
  async findByTenant(tenantId, options = {}) {
    return await this.findAll({
      ...options,
      tenantId,
      filters: {
        ...options.filters,
        is_active: true
      }
    });
  }

  /**
   * Activate or deactivate user
   * @param {string} userId - User ID
   * @param {boolean} isActive - Active status
   * @returns {Promise<Object>} Updated user
   */
  async setActiveStatus(userId, isActive) {
    return await this.update(userId, { is_active: isActive });
  }

  /**
   * Delete user and auth account
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteWithAuth(userId) {
    try {
      // Delete from auth first
      const { error: authError } = await this.supabaseAdmin.auth.admin.deleteUser(userId);
      if (authError) throw authError;

      // Profile will be deleted automatically due to CASCADE
      return true;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Invite user to tenant
   * @param {Object} inviteData - Invitation data
   * @returns {Promise<Object>} Invitation record
   */
  async inviteUser(inviteData) {
    return await authFunctions.inviteUser(inviteData);
  }

  /**
   * Get user statistics
   * @param {string} userId - User ID
   * @returns {Promise<Object>} User statistics
   */
  async getUserStats(userId) {
    try {
      const stats = await this.executeRpc('get_user_stats', { user_id: userId });
      return stats[0] || {
        total_customers: 0,
        total_appointments: 0,
        total_sales: 0,
        average_rating: 0
      };
    } catch (error) {
      console.error('Error fetching user stats:', error);
      return {
        total_customers: 0,
        total_appointments: 0,
        total_sales: 0,
        average_rating: 0
      };
    }
  }
}

module.exports = new UserService();