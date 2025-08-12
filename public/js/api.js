/**
 * API Client for SMS Salon Management System
 * Handles all HTTP requests to the backend API
 */

const API_BASE_URL = 'http://localhost:3000/api';

class APIClient {
    constructor() {
        this.baseURL = API_BASE_URL;
        this.token = localStorage.getItem('accessToken');
    }

    /**
     * Get authorization headers
     * @returns {Object} Headers object
     */
    getAuthHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (this.token) {
            headers.Authorization = `Bearer ${this.token}`;
        }
        
        return headers;
    }

    /**
     * Handle API response
     * @param {Response} response - Fetch response object
     * @returns {Promise<Object>} Parsed JSON response
     * @throws {Error} API error with details
     */
    async handleResponse(response) {
        const contentType = response.headers.get('content-type');
        let data;
        
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            data = { message: await response.text() };
        }

        if (!response.ok) {
            const error = new Error(data.error || 'API request failed');
            error.status = response.status;
            error.code = data.code;
            error.details = data.details;
            error.validationErrors = data.validationErrors;
            throw error;
        }

        return data;
    }

    /**
     * Make API request
     * @param {string} endpoint - API endpoint
     * @param {Object} options - Request options
     * @returns {Promise<Object>} API response
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        
        const config = {
            headers: this.getAuthHeaders(),
            ...options
        };

        if (options.body && typeof options.body === 'object') {
            config.body = JSON.stringify(options.body);
        }

        try {
            const response = await fetch(url, config);
            return await this.handleResponse(response);
        } catch (error) {
            // Handle token expiration
            if (error.status === 401 && error.code === 'INVALID_TOKEN') {
                await this.refreshToken();
                
                // Retry request with new token
                config.headers = this.getAuthHeaders();
                const retryResponse = await fetch(url, config);
                return await this.handleResponse(retryResponse);
            }
            
            throw error;
        }
    }

    /**
     * Set authentication token
     * @param {string} token - JWT access token
     */
    setToken(token) {
        this.token = token;
        localStorage.setItem('accessToken', token);
    }

    /**
     * Clear authentication token
     */
    clearToken() {
        this.token = null;
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
    }

    /**
     * Refresh authentication token
     * @returns {Promise<void>}
     */
    async refreshToken() {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
            throw new Error('No refresh token available');
        }

        try {
            const response = await fetch(`${this.baseURL}/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken })
            });

            const data = await this.handleResponse(response);
            
            this.setToken(data.accessToken);
            localStorage.setItem('refreshToken', data.refreshToken);
        } catch (error) {
            this.clearToken();
            window.location.href = '/';
            throw error;
        }
    }

    // Authentication endpoints
    async login(email, password) {
        return this.request('/auth/login', {
            method: 'POST',
            body: { email, password }
        });
    }

    async register(userData) {
        return this.request('/auth/register', {
            method: 'POST',
            body: userData
        });
    }

    async logout() {
        try {
            await this.request('/auth/logout', { method: 'POST' });
        } finally {
            this.clearToken();
        }
    }

    async getCurrentUser() {
        return this.request('/auth/me');
    }

    async updateProfile(profileData) {
        return this.request('/auth/profile', {
            method: 'PUT',
            body: profileData
        });
    }

    async changePassword(passwordData) {
        return this.request('/auth/change-password', {
            method: 'PUT',
            body: passwordData
        });
    }

    // Customer endpoints
    async getCustomers(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`/customers${queryString ? `?${queryString}` : ''}`);
    }

    async getCustomer(id) {
        return this.request(`/customers/${id}`);
    }

    async createCustomer(customerData) {
        return this.request('/customers', {
            method: 'POST',
            body: customerData
        });
    }

    async updateCustomer(id, customerData) {
        return this.request(`/customers/${id}`, {
            method: 'PUT',
            body: customerData
        });
    }

    async deleteCustomer(id) {
        return this.request(`/customers/${id}`, {
            method: 'DELETE'
        });
    }

    async getCustomerStats() {
        return this.request('/customers/stats');
    }

    async searchCustomers(query, limit = 10) {
        return this.request(`/customers/search/${encodeURIComponent(query)}?limit=${limit}`);
    }

    // Appointment endpoints
    async getAppointments(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`/appointments${queryString ? `?${queryString}` : ''}`);
    }

    async getAppointment(id) {
        return this.request(`/appointments/${id}`);
    }

    async createAppointment(appointmentData) {
        return this.request('/appointments', {
            method: 'POST',
            body: appointmentData
        });
    }

    async updateAppointment(id, appointmentData) {
        return this.request(`/appointments/${id}`, {
            method: 'PUT',
            body: appointmentData
        });
    }

    async updateAppointmentStatus(id, status, notes = '') {
        return this.request(`/appointments/${id}/status`, {
            method: 'PUT',
            body: { status, notes }
        });
    }

    async cancelAppointment(id, reason = '') {
        return this.request(`/appointments/${id}/cancel`, {
            method: 'PUT',
            body: { reason }
        });
    }

    async getAppointmentStats() {
        return this.request('/appointments/stats');
    }

    async getAvailableSlots(staffId, date, duration = 60) {
        return this.request(`/appointments/availability/${staffId}/${date}?duration=${duration}`);
    }

    // Service endpoints
    async getServices() {
        return this.request('/appointments/services');
    }

    // Staff endpoints
    async getStaff() {
        return this.request('/appointments/staff');
    }

    // Dashboard endpoints
    async getDashboardStats() {
        return this.request('/dashboard/stats');
    }

    async getDashboardActivity() {
        return this.request('/dashboard/activity');
    }

    async getDashboardUpcoming() {
        return this.request('/dashboard/upcoming');
    }

    async getDashboardRevenue(period = 'month') {
        return this.request(`/dashboard/revenue?period=${period}`);
    }

    // Health check
    async healthCheck() {
        return this.request('/health');
    }
}

// Create global API instance
window.api = new APIClient();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = APIClient;
}