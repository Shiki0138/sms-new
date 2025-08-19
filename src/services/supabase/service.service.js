const BaseService = require('./base.service');

/**
 * Service management for salon services/treatments
 */
class ServiceService extends BaseService {
  constructor() {
    super('services');
  }

  /**
   * Find active services by tenant
   * @param {string} tenantId - Tenant ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of services
   */
  async findActiveByTenant(tenantId, options = {}) {
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
   * Find services by category
   * @param {string} category - Service category
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Array of services
   */
  async findByCategory(category, tenantId) {
    return await this.findAll({
      tenantId,
      filters: {
        category,
        is_active: true
      }
    });
  }

  /**
   * Get service categories
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Array of categories
   */
  async getCategories(tenantId) {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('category')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .not('category', 'is', null);

      if (error) throw error;

      // Extract unique categories
      const categories = [...new Set(data.map(item => item.category))].filter(Boolean);
      return categories.sort();
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Update service price
   * @param {string} serviceId - Service ID
   * @param {number} price - New price
   * @returns {Promise<Object>} Updated service
   */
  async updatePrice(serviceId, price) {
    if (price < 0) {
      throw new Error('Price cannot be negative');
    }

    return await this.update(serviceId, { price });
  }

  /**
   * Toggle service active status
   * @param {string} serviceId - Service ID
   * @param {boolean} isActive - Active status
   * @returns {Promise<Object>} Updated service
   */
  async setActiveStatus(serviceId, isActive) {
    return await this.update(serviceId, { is_active: isActive });
  }

  /**
   * Get popular services
   * @param {string} tenantId - Tenant ID
   * @param {number} limit - Number of services to return
   * @returns {Promise<Array>} Array of popular services
   */
  async getPopularServices(tenantId, limit = 10) {
    try {
      const result = await this.executeRpc('get_popular_services', {
        p_tenant_id: tenantId,
        p_limit: limit
      });

      return result || [];
    } catch (error) {
      console.error('Error fetching popular services:', error);
      return [];
    }
  }

  /**
   * Get service statistics
   * @param {string} serviceId - Service ID
   * @returns {Promise<Object>} Service statistics
   */
  async getServiceStats(serviceId) {
    try {
      const stats = await this.executeRpc('get_service_stats', {
        p_service_id: serviceId
      });

      return stats[0] || {
        total_bookings: 0,
        completed_bookings: 0,
        cancelled_bookings: 0,
        total_revenue: 0,
        average_rating: 0,
        popular_staff: [],
        peak_hours: [],
        average_duration: 0
      };
    } catch (error) {
      console.error('Error fetching service stats:', error);
      return {
        total_bookings: 0,
        completed_bookings: 0,
        cancelled_bookings: 0,
        total_revenue: 0,
        average_rating: 0,
        popular_staff: [],
        peak_hours: [],
        average_duration: 0
      };
    }
  }

  /**
   * Create service package
   * @param {Object} packageData - Package data
   * @returns {Promise<Object>} Created package
   */
  async createPackage(packageData) {
    try {
      const { name, description, services, totalPrice, tenantId } = packageData;

      // Validate services exist
      const serviceIds = services.map(s => s.serviceId);
      const { data: validServices, error: serviceError } = await this.supabase
        .from(this.tableName)
        .select('id, price, duration')
        .eq('tenant_id', tenantId)
        .in('id', serviceIds);

      if (serviceError) throw serviceError;

      if (validServices.length !== serviceIds.length) {
        throw new Error('One or more services not found');
      }

      // Calculate total duration
      const totalDuration = validServices.reduce((sum, service) => sum + service.duration, 0);

      // Create package as a special service
      const packageService = await this.create({
        tenant_id: tenantId,
        name,
        description,
        category: 'Package',
        duration: totalDuration,
        price: totalPrice,
        is_active: true,
        metadata: {
          type: 'package',
          included_services: services
        }
      });

      return packageService;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Search services
   * @param {string} searchTerm - Search term
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Array of services
   */
  async search(searchTerm, tenantId) {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%`)
        .order('name');

      if (error) throw error;

      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get service price history
   * @param {string} serviceId - Service ID
   * @returns {Promise<Array>} Price history
   */
  async getPriceHistory(serviceId) {
    try {
      // This would typically come from an audit table
      // For now, return current price as single entry
      const service = await this.findById(serviceId);
      if (!service) return [];

      return [
        {
          price: service.price,
          effective_date: service.updated_at || service.created_at,
          is_current: true
        }
      ];
    } catch (error) {
      throw this.handleError(error);
    }
  }
}

module.exports = new ServiceService();