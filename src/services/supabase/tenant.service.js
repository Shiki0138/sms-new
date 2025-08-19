const BaseService = require('./base.service');

/**
 * Tenant service for managing salon/business accounts
 */
class TenantService extends BaseService {
  constructor() {
    super('tenants');
  }

  /**
   * Find tenant by email
   * @param {string} email - Tenant email
   * @returns {Promise<Object>} Tenant object
   */
  async findByEmail(email) {
    return await this.findOne({ email });
  }

  /**
   * Update tenant settings
   * @param {string} tenantId - Tenant ID
   * @param {Object} settings - Settings object
   * @returns {Promise<Object>} Updated tenant
   */
  async updateSettings(tenantId, settings) {
    try {
      const tenant = await this.findById(tenantId);
      if (!tenant) throw new Error('Tenant not found');

      const updatedSettings = {
        ...tenant.settings,
        ...settings
      };

      return await this.update(tenantId, { settings: updatedSettings });
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Update tenant plan
   * @param {string} tenantId - Tenant ID
   * @param {string} planType - New plan type
   * @returns {Promise<Object>} Updated tenant
   */
  async updatePlan(tenantId, planType) {
    const validPlans = ['light', 'standard', 'premium'];
    
    if (!validPlans.includes(planType)) {
      throw new Error(`Invalid plan type: ${planType}`);
    }

    return await this.update(tenantId, { plan_type: planType });
  }

  /**
   * Get tenant usage statistics
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Usage statistics
   */
  async getUsageStats(tenantId) {
    try {
      const currentMonth = new Date().toISOString().slice(0, 7) + '-01';

      const { data, error } = await this.supabase
        .from('plan_usage')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('month', currentMonth)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      return data || {
        customers_count: 0,
        reservations_count: 0,
        messages_sent: 0,
        ai_replies_count: 0
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Check if tenant has reached plan limits
   * @param {string} tenantId - Tenant ID
   * @param {string} feature - Feature to check
   * @returns {Promise<Object>} Limit check result
   */
  async checkPlanLimits(tenantId, feature) {
    try {
      const result = await this.executeRpc('check_plan_limits', {
        p_tenant_id: tenantId,
        p_feature: feature
      });

      return result[0] || { allowed: true, limit: null, current: 0 };
    } catch (error) {
      console.error('Error checking plan limits:', error);
      return { allowed: true, limit: null, current: 0 };
    }
  }

  /**
   * Get tenant business hours
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Business hours
   */
  async getBusinessHours(tenantId) {
    try {
      const { data, error } = await this.supabase
        .from('business_hours')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('day_of_week');

      if (error) throw error;

      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Update business hours
   * @param {string} tenantId - Tenant ID
   * @param {Array} businessHours - Business hours array
   * @returns {Promise<Array>} Updated business hours
   */
  async updateBusinessHours(tenantId, businessHours) {
    try {
      // Delete existing hours
      await this.supabase
        .from('business_hours')
        .delete()
        .eq('tenant_id', tenantId);

      // Insert new hours
      const hoursWithTenant = businessHours.map(hour => ({
        ...hour,
        tenant_id: tenantId
      }));

      const { data, error } = await this.supabase
        .from('business_hours')
        .insert(hoursWithTenant)
        .select();

      if (error) throw error;

      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get tenant holidays
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Holidays
   */
  async getHolidays(tenantId) {
    try {
      const { data, error } = await this.supabase
        .from('holiday_settings')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('date');

      if (error) throw error;

      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Add holiday
   * @param {string} tenantId - Tenant ID
   * @param {Object} holiday - Holiday data
   * @returns {Promise<Object>} Created holiday
   */
  async addHoliday(tenantId, holiday) {
    try {
      const { data, error } = await this.supabase
        .from('holiday_settings')
        .insert({
          ...holiday,
          tenant_id: tenantId
        })
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get tenant dashboard statistics
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Dashboard statistics
   */
  async getDashboardStats(tenantId) {
    try {
      const stats = await this.executeRpc('get_tenant_dashboard_stats', {
        p_tenant_id: tenantId
      });

      return stats[0] || {
        total_customers: 0,
        active_customers: 0,
        total_reservations: 0,
        upcoming_reservations: 0,
        total_revenue: 0,
        monthly_revenue: 0,
        total_staff: 0,
        active_staff: 0
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      return {
        total_customers: 0,
        active_customers: 0,
        total_reservations: 0,
        upcoming_reservations: 0,
        total_revenue: 0,
        monthly_revenue: 0,
        total_staff: 0,
        active_staff: 0
      };
    }
  }
}

module.exports = new TenantService();