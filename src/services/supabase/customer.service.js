const BaseService = require('./base.service');

/**
 * Customer service for managing customer data
 */
class CustomerService extends BaseService {
  constructor() {
    super('customers');
  }

  /**
   * Search customers by name or phone
   * @param {string} searchTerm - Search term
   * @param {string} tenantId - Tenant ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of customers
   */
  async search(searchTerm, tenantId, options = {}) {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select(options.select || '*')
        .eq('tenant_id', tenantId)
        .or(`name.ilike.%${searchTerm}%,phone_number.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
        .order('name', { ascending: true })
        .limit(options.limit || 20);

      if (error) throw error;

      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Find customers by tags
   * @param {Array} tags - Array of tags
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Array of customers
   */
  async findByTags(tags, tenantId) {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('tenant_id', tenantId)
        .contains('tags', tags);

      if (error) throw error;

      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Update customer visit statistics
   * @param {string} customerId - Customer ID
   * @param {Object} visitData - Visit data
   * @returns {Promise<Object>} Updated customer
   */
  async updateVisitStats(customerId, visitData) {
    try {
      const customer = await this.findById(customerId);
      if (!customer) throw new Error('Customer not found');

      const updates = {
        visit_count: (customer.visit_count || 0) + 1,
        last_visit_date: new Date().toISOString(),
        total_spent: (customer.total_spent || 0) + (visitData.amount || 0)
      };

      return await this.update(customerId, updates);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get customers by birth month
   * @param {number} month - Month (1-12)
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Array of customers
   */
  async findByBirthMonth(month, tenantId) {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('tenant_id', tenantId)
        .not('birth_date', 'is', null)
        .gte('birth_date', `1900-${month.toString().padStart(2, '0')}-01`)
        .lt('birth_date', `2100-${(month + 1).toString().padStart(2, '0')}-01`);

      if (error) throw error;

      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get customer segments for bulk messaging
   * @param {Object} criteria - Segmentation criteria
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Array of customers
   */
  async getSegment(criteria, tenantId) {
    try {
      let query = this.supabase
        .from(this.tableName)
        .select('id, name, email, phone_number, line_user_id, instagram_id, preferred_contact_method')
        .eq('tenant_id', tenantId);

      // Apply criteria filters
      if (criteria.visitCountMin) {
        query = query.gte('visit_count', criteria.visitCountMin);
      }
      if (criteria.visitCountMax) {
        query = query.lte('visit_count', criteria.visitCountMax);
      }
      if (criteria.lastVisitDaysAgo) {
        const date = new Date();
        date.setDate(date.getDate() - criteria.lastVisitDaysAgo);
        query = query.lte('last_visit_date', date.toISOString());
      }
      if (criteria.totalSpentMin) {
        query = query.gte('total_spent', criteria.totalSpentMin);
      }
      if (criteria.tags && criteria.tags.length > 0) {
        query = query.contains('tags', criteria.tags);
      }
      if (criteria.gender) {
        query = query.eq('gender', criteria.gender);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Add tags to customer
   * @param {string} customerId - Customer ID
   * @param {Array} tags - Tags to add
   * @returns {Promise<Object>} Updated customer
   */
  async addTags(customerId, tags) {
    try {
      const customer = await this.findById(customerId);
      if (!customer) throw new Error('Customer not found');

      const currentTags = customer.tags || [];
      const uniqueTags = [...new Set([...currentTags, ...tags])];

      return await this.update(customerId, { tags: uniqueTags });
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Remove tags from customer
   * @param {string} customerId - Customer ID
   * @param {Array} tags - Tags to remove
   * @returns {Promise<Object>} Updated customer
   */
  async removeTags(customerId, tags) {
    try {
      const customer = await this.findById(customerId);
      if (!customer) throw new Error('Customer not found');

      const currentTags = customer.tags || [];
      const updatedTags = currentTags.filter(tag => !tags.includes(tag));

      return await this.update(customerId, { tags: updatedTags });
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get customer communication channels
   * @param {string} customerId - Customer ID
   * @returns {Promise<Object>} Available channels
   */
  async getAvailableChannels(customerId) {
    try {
      const customer = await this.findById(customerId);
      if (!customer) throw new Error('Customer not found');

      return {
        email: !!customer.email,
        phone: !!customer.phone_number,
        line: !!customer.line_user_id,
        instagram: !!customer.instagram_id,
        preferred: customer.preferred_contact_method
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get customer statistics
   * @param {string} customerId - Customer ID
   * @returns {Promise<Object>} Customer statistics
   */
  async getCustomerStats(customerId) {
    try {
      const stats = await this.executeRpc('get_customer_stats', { customer_id: customerId });
      return stats[0] || {
        total_appointments: 0,
        completed_appointments: 0,
        cancelled_appointments: 0,
        no_show_appointments: 0,
        total_spent: 0,
        average_spend: 0,
        favorite_services: [],
        favorite_staff: null
      };
    } catch (error) {
      console.error('Error fetching customer stats:', error);
      return {
        total_appointments: 0,
        completed_appointments: 0,
        cancelled_appointments: 0,
        no_show_appointments: 0,
        total_spent: 0,
        average_spend: 0,
        favorite_services: [],
        favorite_staff: null
      };
    }
  }
}

module.exports = new CustomerService();