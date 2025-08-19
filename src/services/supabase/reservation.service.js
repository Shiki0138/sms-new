const BaseService = require('./base.service');
const moment = require('moment');

/**
 * Reservation service for managing appointments
 */
class ReservationService extends BaseService {
  constructor() {
    super('reservations');
  }

  /**
   * Find reservations by date range
   * @param {string} startDate - Start date
   * @param {string} endDate - End date
   * @param {string} tenantId - Tenant ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of reservations
   */
  async findByDateRange(startDate, endDate, tenantId, options = {}) {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select(options.select || '*, customers(*), staff(*), services(*)')
        .eq('tenant_id', tenantId)
        .gte('start_time', startDate)
        .lte('start_time', endDate)
        .order('start_time', { ascending: true });

      if (error) throw error;

      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Find reservations by staff
   * @param {string} staffId - Staff ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of reservations
   */
  async findByStaff(staffId, options = {}) {
    return await this.findAll({
      ...options,
      filters: {
        ...options.filters,
        staff_id: staffId
      }
    });
  }

  /**
   * Find reservations by customer
   * @param {string} customerId - Customer ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of reservations
   */
  async findByCustomer(customerId, options = {}) {
    return await this.findAll({
      ...options,
      filters: {
        ...options.filters,
        customer_id: customerId
      }
    });
  }

  /**
   * Check availability for a time slot
   * @param {Object} params - Check parameters
   * @returns {Promise<boolean>} Availability status
   */
  async checkAvailability({ staffId, startTime, endTime, excludeReservationId }) {
    try {
      let query = this.supabase
        .from(this.tableName)
        .select('id')
        .eq('staff_id', staffId)
        .in('status', ['pending', 'confirmed'])
        .or(`and(start_time.lt.${endTime},end_time.gt.${startTime})`);

      if (excludeReservationId) {
        query = query.neq('id', excludeReservationId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data.length === 0;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get upcoming reservations for reminders
   * @param {string} tenantId - Tenant ID
   * @param {number} hoursAhead - Hours to look ahead
   * @returns {Promise<Array>} Array of reservations
   */
  async getUpcomingForReminders(tenantId, hoursAhead = 24) {
    try {
      const now = new Date();
      const futureTime = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);

      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*, customers(*)')
        .eq('tenant_id', tenantId)
        .eq('status', 'confirmed')
        .eq('reminder_sent', false)
        .gte('start_time', now.toISOString())
        .lte('start_time', futureTime.toISOString());

      if (error) throw error;

      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Update reservation status
   * @param {string} reservationId - Reservation ID
   * @param {string} status - New status
   * @returns {Promise<Object>} Updated reservation
   */
  async updateStatus(reservationId, status) {
    const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled', 'no_show'];
    
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status: ${status}`);
    }

    return await this.update(reservationId, { status });
  }

  /**
   * Mark reminder as sent
   * @param {string} reservationId - Reservation ID
   * @returns {Promise<Object>} Updated reservation
   */
  async markReminderSent(reservationId) {
    return await this.update(reservationId, { reminder_sent: true });
  }

  /**
   * Get available time slots
   * @param {Object} params - Parameters
   * @returns {Promise<Array>} Available time slots
   */
  async getAvailableSlots({ date, staffId, serviceId, tenantId }) {
    try {
      // Get service duration
      const { data: service, error: serviceError } = await this.supabase
        .from('services')
        .select('duration')
        .eq('id', serviceId)
        .single();

      if (serviceError) throw serviceError;

      // Get staff working hours
      const dayOfWeek = moment(date).day();
      const { data: workingHours, error: hoursError } = await this.supabase
        .from('business_hours')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('day_of_week', dayOfWeek)
        .eq('is_open', true)
        .single();

      if (hoursError || !workingHours) {
        return [];
      }

      // Get existing reservations for the day
      const startOfDay = moment(date).startOf('day').toISOString();
      const endOfDay = moment(date).endOf('day').toISOString();

      const { data: reservations, error: resError } = await this.supabase
        .from(this.tableName)
        .select('start_time, end_time')
        .eq('staff_id', staffId)
        .in('status', ['pending', 'confirmed'])
        .gte('start_time', startOfDay)
        .lte('start_time', endOfDay)
        .order('start_time');

      if (resError) throw resError;

      // Generate available slots
      const slots = [];
      const duration = service.duration;
      const slotDuration = 30; // 30-minute slots

      let currentTime = moment(date).set({
        hour: parseInt(workingHours.open_time.split(':')[0]),
        minute: parseInt(workingHours.open_time.split(':')[1]),
        second: 0
      });

      const closeTime = moment(date).set({
        hour: parseInt(workingHours.close_time.split(':')[0]),
        minute: parseInt(workingHours.close_time.split(':')[1]),
        second: 0
      });

      while (currentTime.add(duration, 'minutes').isSameOrBefore(closeTime)) {
        const slotStart = currentTime.clone();
        const slotEnd = slotStart.clone().add(duration, 'minutes');

        // Check if slot overlaps with break time
        if (workingHours.break_start_time && workingHours.break_end_time) {
          const breakStart = moment(date).set({
            hour: parseInt(workingHours.break_start_time.split(':')[0]),
            minute: parseInt(workingHours.break_start_time.split(':')[1])
          });
          const breakEnd = moment(date).set({
            hour: parseInt(workingHours.break_end_time.split(':')[0]),
            minute: parseInt(workingHours.break_end_time.split(':')[1])
          });

          if (slotStart.isBefore(breakEnd) && slotEnd.isAfter(breakStart)) {
            currentTime = breakEnd.clone();
            continue;
          }
        }

        // Check if slot conflicts with existing reservations
        const hasConflict = reservations.some(res => {
          const resStart = moment(res.start_time);
          const resEnd = moment(res.end_time);
          return slotStart.isBefore(resEnd) && slotEnd.isAfter(resStart);
        });

        if (!hasConflict) {
          slots.push({
            start: slotStart.format('HH:mm'),
            end: slotEnd.format('HH:mm'),
            available: true
          });
        }

        currentTime.subtract(duration, 'minutes').add(slotDuration, 'minutes');
      }

      return slots;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get reservation statistics
   * @param {string} tenantId - Tenant ID
   * @param {string} period - Period (day, week, month)
   * @returns {Promise<Object>} Statistics
   */
  async getStatistics(tenantId, period = 'month') {
    try {
      const stats = await this.executeRpc('get_reservation_stats', {
        tenant_id: tenantId,
        period: period
      });

      return stats[0] || {
        total: 0,
        confirmed: 0,
        completed: 0,
        cancelled: 0,
        no_show: 0,
        revenue: 0
      };
    } catch (error) {
      console.error('Error fetching reservation stats:', error);
      return {
        total: 0,
        confirmed: 0,
        completed: 0,
        cancelled: 0,
        no_show: 0,
        revenue: 0
      };
    }
  }
}

module.exports = new ReservationService();