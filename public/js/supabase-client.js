/**
 * Supabase Client for Frontend
 * Handles all API interactions with Supabase backend
 */

class SupabaseClient {
  constructor() {
    this.baseURL = window.location.origin;
    this.token = localStorage.getItem('sb-token');
    this.session = JSON.parse(localStorage.getItem('sb-session') || 'null');
  }

  /**
   * Set authentication token
   */
  setAuth(session) {
    if (session) {
      this.session = session;
      this.token = session.access_token;
      localStorage.setItem('sb-token', this.token);
      localStorage.setItem('sb-session', JSON.stringify(session));
    }
  }

  /**
   * Clear authentication
   */
  clearAuth() {
    this.token = null;
    this.session = null;
    localStorage.removeItem('sb-token');
    localStorage.removeItem('sb-session');
  }

  /**
   * Get current user
   */
  getCurrentUser() {
    return this.session?.user || null;
  }

  /**
   * Make API request
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}/api${endpoint}`;
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired or invalid
          this.clearAuth();
          window.location.href = '/login.html';
        }
        throw new Error(data.error || 'Request failed');
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // ==================== AUTH METHODS ====================

  /**
   * Sign up new user
   */
  async signUp({ email, password, fullName, tenantName, planType = 'light' }) {
    const data = await this.request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, fullName, tenantName, planType })
    });

    if (data.session) {
      this.setAuth(data.session);
    }

    return data;
  }

  /**
   * Sign in user
   */
  async signIn({ email, password }) {
    const data = await this.request('/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    if (data.session) {
      this.setAuth(data.session);
    }

    return data;
  }

  /**
   * Sign out user
   */
  async signOut() {
    try {
      await this.request('/auth/signout', { method: 'POST' });
    } catch (error) {
      console.error('Signout error:', error);
    } finally {
      this.clearAuth();
      window.location.href = '/login.html';
    }
  }

  /**
   * Get current user profile
   */
  async getProfile() {
    return await this.request('/auth/me');
  }

  /**
   * Update user profile
   */
  async updateProfile(updates) {
    return await this.request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  /**
   * Request password reset
   */
  async forgotPassword(email) {
    return await this.request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  }

  /**
   * Reset password
   */
  async resetPassword(password) {
    return await this.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ password })
    });
  }

  // ==================== CUSTOMER METHODS ====================

  /**
   * Get all customers
   */
  async getCustomers(options = {}) {
    const params = new URLSearchParams(options).toString();
    return await this.request(`/customers${params ? '?' + params : ''}`);
  }

  /**
   * Get single customer
   */
  async getCustomer(id) {
    return await this.request(`/customers/${id}`);
  }

  /**
   * Create customer
   */
  async createCustomer(customerData) {
    return await this.request('/customers', {
      method: 'POST',
      body: JSON.stringify(customerData)
    });
  }

  /**
   * Update customer
   */
  async updateCustomer(id, updates) {
    return await this.request(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  /**
   * Delete customer
   */
  async deleteCustomer(id) {
    return await this.request(`/customers/${id}`, {
      method: 'DELETE'
    });
  }

  /**
   * Search customers
   */
  async searchCustomers(searchTerm) {
    return await this.request(`/customers/search?q=${encodeURIComponent(searchTerm)}`);
  }

  // ==================== RESERVATION METHODS ====================

  /**
   * Get all reservations
   */
  async getReservations(options = {}) {
    const params = new URLSearchParams(options).toString();
    return await this.request(`/reservations${params ? '?' + params : ''}`);
  }

  /**
   * Get single reservation
   */
  async getReservation(id) {
    return await this.request(`/reservations/${id}`);
  }

  /**
   * Create reservation
   */
  async createReservation(reservationData) {
    return await this.request('/reservations', {
      method: 'POST',
      body: JSON.stringify(reservationData)
    });
  }

  /**
   * Update reservation
   */
  async updateReservation(id, updates) {
    return await this.request(`/reservations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  /**
   * Cancel reservation
   */
  async cancelReservation(id) {
    return await this.request(`/reservations/${id}/cancel`, {
      method: 'POST'
    });
  }

  /**
   * Get available time slots
   */
  async getAvailableSlots({ date, staffId, serviceId }) {
    const params = new URLSearchParams({ date, staffId, serviceId }).toString();
    return await this.request(`/reservations/available-slots?${params}`);
  }

  // ==================== MESSAGE METHODS ====================

  /**
   * Get messages
   */
  async getMessages(options = {}) {
    const params = new URLSearchParams(options).toString();
    return await this.request(`/messages${params ? '?' + params : ''}`);
  }

  /**
   * Get conversation with customer
   */
  async getConversation(customerId) {
    return await this.request(`/messages/conversation/${customerId}`);
  }

  /**
   * Send message
   */
  async sendMessage(messageData) {
    return await this.request('/messages', {
      method: 'POST',
      body: JSON.stringify(messageData)
    });
  }

  /**
   * Mark message as read
   */
  async markMessageRead(id) {
    return await this.request(`/messages/${id}/read`, {
      method: 'POST'
    });
  }

  // ==================== STAFF METHODS ====================

  /**
   * Get all staff
   */
  async getStaff(options = {}) {
    const params = new URLSearchParams(options).toString();
    return await this.request(`/staff${params ? '?' + params : ''}`);
  }

  /**
   * Get single staff member
   */
  async getStaffMember(id) {
    return await this.request(`/staff/${id}`);
  }

  /**
   * Create staff member
   */
  async createStaff(staffData) {
    return await this.request('/staff', {
      method: 'POST',
      body: JSON.stringify(staffData)
    });
  }

  /**
   * Update staff member
   */
  async updateStaff(id, updates) {
    return await this.request(`/staff/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  /**
   * Get staff schedule
   */
  async getStaffSchedule(id, startDate, endDate) {
    const params = new URLSearchParams({ startDate, endDate }).toString();
    return await this.request(`/staff/${id}/schedule?${params}`);
  }

  // ==================== SERVICE METHODS ====================

  /**
   * Get all services
   */
  async getServices(options = {}) {
    const params = new URLSearchParams(options).toString();
    return await this.request(`/services${params ? '?' + params : ''}`);
  }

  /**
   * Get single service
   */
  async getService(id) {
    return await this.request(`/services/${id}`);
  }

  /**
   * Create service
   */
  async createService(serviceData) {
    return await this.request('/services', {
      method: 'POST',
      body: JSON.stringify(serviceData)
    });
  }

  /**
   * Update service
   */
  async updateService(id, updates) {
    return await this.request(`/services/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  // ==================== DASHBOARD METHODS ====================

  /**
   * Get dashboard statistics
   */
  async getDashboardStats() {
    return await this.request('/dashboard/stats');
  }

  /**
   * Get upcoming appointments
   */
  async getUpcomingAppointments() {
    return await this.request('/dashboard/upcoming-appointments');
  }

  /**
   * Get recent activities
   */
  async getRecentActivities() {
    return await this.request('/dashboard/recent-activities');
  }

  // ==================== SETTINGS METHODS ====================

  /**
   * Get tenant settings
   */
  async getSettings() {
    return await this.request('/settings');
  }

  /**
   * Update settings
   */
  async updateSettings(settings) {
    return await this.request('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings)
    });
  }

  /**
   * Get business hours
   */
  async getBusinessHours() {
    return await this.request('/settings/business-hours');
  }

  /**
   * Update business hours
   */
  async updateBusinessHours(hours) {
    return await this.request('/settings/business-hours', {
      method: 'PUT',
      body: JSON.stringify(hours)
    });
  }

  // ==================== HEALTH CHECK ====================

  /**
   * Check API health
   */
  async checkHealth() {
    return await this.request('/health');
  }

  /**
   * Check Supabase connection
   */
  async checkSupabaseHealth() {
    return await this.request('/health/supabase');
  }
}

// Create global instance
window.supabaseClient = new SupabaseClient();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SupabaseClient;
}