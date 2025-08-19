const BaseService = require('./base.service');

/**
 * Staff service for managing staff members
 */
class StaffService extends BaseService {
  constructor() {
    super('staff');
  }

  /**
   * Find active staff by tenant
   * @param {string} tenantId - Tenant ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of staff members
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
   * Find staff by skills
   * @param {Array} skills - Required skills
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Array of staff members
   */
  async findBySkills(skills, tenantId) {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .contains('skills', skills);

      if (error) throw error;

      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Update staff working hours
   * @param {string} staffId - Staff ID
   * @param {Object} workingHours - Working hours object
   * @returns {Promise<Object>} Updated staff
   */
  async updateWorkingHours(staffId, workingHours) {
    return await this.update(staffId, { working_hours: workingHours });
  }

  /**
   * Toggle staff active status
   * @param {string} staffId - Staff ID
   * @param {boolean} isActive - Active status
   * @returns {Promise<Object>} Updated staff
   */
  async setActiveStatus(staffId, isActive) {
    return await this.update(staffId, { is_active: isActive });
  }

  /**
   * Get staff schedule for a date range
   * @param {string} staffId - Staff ID
   * @param {string} startDate - Start date
   * @param {string} endDate - End date
   * @returns {Promise<Object>} Staff schedule
   */
  async getSchedule(staffId, startDate, endDate) {
    try {
      // Get staff info
      const staff = await this.findById(staffId);
      if (!staff) throw new Error('Staff not found');

      // Get reservations
      const { data: reservations, error } = await this.supabase
        .from('reservations')
        .select('*, customers(name), services(name)')
        .eq('staff_id', staffId)
        .in('status', ['pending', 'confirmed'])
        .gte('start_time', startDate)
        .lte('start_time', endDate)
        .order('start_time');

      if (error) throw error;

      return {
        staff,
        reservations,
        working_hours: staff.working_hours || {}
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get staff performance statistics
   * @param {string} staffId - Staff ID
   * @param {string} period - Period (day, week, month)
   * @returns {Promise<Object>} Performance statistics
   */
  async getPerformanceStats(staffId, period = 'month') {
    try {
      const stats = await this.executeRpc('get_staff_performance', {
        p_staff_id: staffId,
        p_period: period
      });

      return stats[0] || {
        total_appointments: 0,
        completed_appointments: 0,
        cancelled_appointments: 0,
        no_show_appointments: 0,
        total_revenue: 0,
        average_rating: 0,
        total_customers: 0,
        repeat_customers: 0,
        popular_services: []
      };
    } catch (error) {
      console.error('Error fetching staff performance:', error);
      return {
        total_appointments: 0,
        completed_appointments: 0,
        cancelled_appointments: 0,
        no_show_appointments: 0,
        total_revenue: 0,
        average_rating: 0,
        total_customers: 0,
        repeat_customers: 0,
        popular_services: []
      };
    }
  }

  /**
   * Check staff availability
   * @param {string} staffId - Staff ID
   * @param {string} date - Date to check
   * @param {string} time - Time to check
   * @param {number} duration - Service duration in minutes
   * @returns {Promise<boolean>} Availability status
   */
  async checkAvailability(staffId, date, time, duration) {
    try {
      // Check if staff works on this day
      const staff = await this.findById(staffId);
      if (!staff || !staff.is_active) return false;

      const dayOfWeek = new Date(date).getDay();
      const workingHours = staff.working_hours?.[dayOfWeek];

      if (!workingHours || !workingHours.isWorking) return false;

      // Check if time is within working hours
      const requestedTime = new Date(`${date} ${time}`);
      const endTime = new Date(requestedTime.getTime() + duration * 60000);

      const workStart = new Date(`${date} ${workingHours.start}`);
      const workEnd = new Date(`${date} ${workingHours.end}`);

      if (requestedTime < workStart || endTime > workEnd) return false;

      // Check for break time
      if (workingHours.breakStart && workingHours.breakEnd) {
        const breakStart = new Date(`${date} ${workingHours.breakStart}`);
        const breakEnd = new Date(`${date} ${workingHours.breakEnd}`);

        if (
          (requestedTime >= breakStart && requestedTime < breakEnd) ||
          (endTime > breakStart && endTime <= breakEnd) ||
          (requestedTime <= breakStart && endTime >= breakEnd)
        ) {
          return false;
        }
      }

      // Check for existing reservations
      const { data: conflicts, error } = await this.supabase
        .from('reservations')
        .select('id')
        .eq('staff_id', staffId)
        .in('status', ['pending', 'confirmed'])
        .gte('start_time', requestedTime.toISOString())
        .lt('start_time', endTime.toISOString());

      if (error) throw error;

      return conflicts.length === 0;
    } catch (error) {
      console.error('Error checking staff availability:', error);
      return false;
    }
  }

  /**
   * Get available staff for a service at a specific time
   * @param {Object} params - Parameters
   * @returns {Promise<Array>} Available staff members
   */
  async getAvailableStaff({ serviceId, date, time, duration, tenantId }) {
    try {
      // Get all active staff
      const allStaff = await this.findActiveByTenant(tenantId);

      // Get service details to check required skills
      const { data: service, error: serviceError } = await this.supabase
        .from('services')
        .select('*')
        .eq('id', serviceId)
        .single();

      if (serviceError) throw serviceError;

      // Filter available staff
      const availableStaff = [];

      for (const staff of allStaff) {
        // Check if staff has required skills (if any)
        if (service.required_skills?.length > 0) {
          const hasSkills = service.required_skills.every(skill => 
            staff.skills?.includes(skill)
          );
          if (!hasSkills) continue;
        }

        // Check availability
        const isAvailable = await this.checkAvailability(
          staff.id,
          date,
          time,
          duration || service.duration
        );

        if (isAvailable) {
          availableStaff.push(staff);
        }
      }

      return availableStaff;
    } catch (error) {
      throw this.handleError(error);
    }
  }
}

module.exports = new StaffService();