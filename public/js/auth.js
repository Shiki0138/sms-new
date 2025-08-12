/**
 * Authentication management for SMS Salon Management System
 * Handles login, logout, and user session management
 */

class AuthManager {
    constructor() {
        this.user = null;
        this.loginForm = null;
        this.init();
    }

    /**
     * Initialize authentication manager
     */
    init() {
        this.loadUserFromStorage();
        this.setupEventListeners();
        this.checkAuthOnLoad();
    }

    /**
     * Load user data from localStorage
     */
    loadUserFromStorage() {
        const userData = localStorage.getItem('user');
        if (userData) {
            try {
                this.user = JSON.parse(userData);
            } catch (error) {
                console.error('Error parsing user data from localStorage:', error);
                localStorage.removeItem('user');
            }
        }
    }

    /**
     * Setup event listeners for authentication
     */
    setupEventListeners() {
        document.addEventListener('DOMContentLoaded', () => {
            this.loginForm = document.getElementById('loginForm');
            const logoutBtn = document.getElementById('logoutBtn');

            if (this.loginForm) {
                this.loginForm.addEventListener('submit', this.handleLogin.bind(this));
            }

            if (logoutBtn) {
                logoutBtn.addEventListener('click', this.handleLogout.bind(this));
            }
        });
    }

    /**
     * Check authentication status on page load
     */
    checkAuthOnLoad() {
        const token = localStorage.getItem('accessToken');
        
        if (token && this.user) {
            // User is logged in, verify token validity
            this.verifyAndLoadUser();
        } else {
            // User is not logged in
            this.showLoginPage();
        }
    }

    /**
     * Verify token and load user data
     */
    async verifyAndLoadUser() {
        try {
            const response = await api.getCurrentUser();
            this.user = response.user;
            localStorage.setItem('user', JSON.stringify(this.user));
            this.showDashboard();
        } catch (error) {
            console.error('Token verification failed:', error);
            this.handleAuthError(error);
        }
    }

    /**
     * Handle login form submission
     * @param {Event} event - Form submit event
     */
    async handleLogin(event) {
        event.preventDefault();
        
        const loginBtn = document.getElementById('loginBtn');
        const loginError = document.getElementById('loginError');
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        // Reset error display
        loginError.classList.add('hidden');
        loginBtn.disabled = true;
        loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Signing in...';

        try {
            const response = await api.login(email, password);
            
            // Store tokens and user data
            api.setToken(response.accessToken);
            localStorage.setItem('refreshToken', response.refreshToken);
            localStorage.setItem('user', JSON.stringify(response.user));
            
            this.user = response.user;
            
            // Show success message
            this.showToast('Login successful! Welcome back.', 'success');
            
            // Redirect to dashboard
            setTimeout(() => {
                this.showDashboard();
            }, 500);
            
        } catch (error) {
            console.error('Login error:', error);
            this.showLoginError(error.message || 'Login failed. Please try again.');
        } finally {
            loginBtn.disabled = false;
            loginBtn.innerHTML = 'Sign in';
        }
    }

    /**
     * Handle logout
     */
    async handleLogout() {
        try {
            await api.logout();
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            this.user = null;
            this.showLoginPage();
            this.showToast('You have been logged out successfully.', 'info');
        }
    }

    /**
     * Show login error message
     * @param {string} message - Error message
     */
    showLoginError(message) {
        const loginError = document.getElementById('loginError');
        if (loginError) {
            loginError.textContent = message;
            loginError.classList.remove('hidden');
        }
    }

    /**
     * Show login page and hide dashboard
     */
    showLoginPage() {
        const loginPage = document.getElementById('loginPage');
        const mainApp = document.getElementById('mainApp');
        const dashboardPages = document.querySelectorAll('[id$=\"Page\"]:not(#loginPage)');

        if (loginPage) loginPage.style.display = 'block';
        if (mainApp) mainApp.style.display = 'none';
        
        dashboardPages.forEach(page => {
            page.classList.add('hidden');
        });

        // Clear form
        if (this.loginForm) {
            this.loginForm.reset();
        }
    }

    /**
     * Show dashboard and hide login page
     */
    showDashboard() {
        const loginPage = document.getElementById('loginPage');
        const mainApp = document.getElementById('mainApp');
        const dashboardPage = document.getElementById('dashboardPage');
        const userName = document.getElementById('userName');

        if (loginPage) loginPage.style.display = 'none';
        if (mainApp) mainApp.style.display = 'block';
        if (dashboardPage) dashboardPage.classList.remove('hidden');

        // Update user info in navbar
        if (userName && this.user) {
            userName.textContent = `${this.user.firstName} ${this.user.lastName} (${this.user.role})`;
        }

        // Initialize dashboard data
        if (window.dashboard) {
            window.dashboard.loadDashboardData();
        }
    }

    /**
     * Handle authentication errors
     * @param {Error} error - Authentication error
     */
    handleAuthError(error) {
        if (error.status === 401 || error.code === 'INVALID_TOKEN') {
            // Token is invalid or expired
            api.clearToken();
            this.user = null;
            this.showLoginPage();
            this.showToast('Your session has expired. Please log in again.', 'warning');
        } else {
            this.showToast('Authentication error. Please try again.', 'error');
        }
    }

    /**
     * Check if user is authenticated
     * @returns {boolean} True if user is authenticated
     */
    isAuthenticated() {
        return !!(this.user && localStorage.getItem('accessToken'));
    }

    /**
     * Check if user has specific role
     * @param {string|Array<string>} roles - Role(s) to check
     * @returns {boolean} True if user has required role
     */
    hasRole(roles) {
        if (!this.user) return false;
        
        const roleArray = Array.isArray(roles) ? roles : [roles];
        return roleArray.includes(this.user.role);
    }

    /**
     * Check if user is admin
     * @returns {boolean} True if user is admin
     */
    isAdmin() {
        return this.hasRole('admin');
    }

    /**
     * Check if user is staff or admin
     * @returns {boolean} True if user is staff or admin
     */
    isStaff() {
        return this.hasRole(['staff', 'admin']);
    }

    /**
     * Get current user
     * @returns {Object|null} Current user object or null
     */
    getCurrentUser() {
        return this.user;
    }

    /**
     * Show toast notification
     * @param {string} message - Toast message
     * @param {string} type - Toast type (success, error, warning, info)
     * @param {number} duration - Duration in milliseconds
     */
    showToast(message, type = 'info', duration = 4000) {
        if (window.showToast) {
            window.showToast(message, type, duration);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }

    /**
     * Require authentication for a function
     * @param {Function} fn - Function to execute if authenticated
     * @returns {Function} Wrapped function
     */
    requireAuth(fn) {
        return (...args) => {
            if (this.isAuthenticated()) {
                return fn.apply(this, args);
            } else {
                this.showLoginPage();
                this.showToast('Please log in to continue.', 'warning');
            }
        };
    }

    /**
     * Require specific role for a function
     * @param {string|Array<string>} roles - Required role(s)
     * @param {Function} fn - Function to execute if authorized
     * @returns {Function} Wrapped function
     */
    requireRole(roles, fn) {
        return (...args) => {
            if (!this.isAuthenticated()) {
                this.showLoginPage();
                this.showToast('Please log in to continue.', 'warning');
                return;
            }
            
            if (this.hasRole(roles)) {
                return fn.apply(this, args);
            } else {
                this.showToast('You do not have permission to perform this action.', 'error');
            }
        };
    }
}

// Create global auth instance
window.auth = new AuthManager();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthManager;
}