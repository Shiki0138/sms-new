/**
 * Main application controller for SMS Salon Management System
 * Handles navigation, UI components, and global application state
 */

class App {
    constructor() {
        this.currentPage = 'dashboard';
        this.init();
    }

    /**
     * Initialize the application
     */
    init() {
        this.setupEventListeners();
        this.setupToastSystem();
        this.setupNavigation();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        document.addEventListener('DOMContentLoaded', () => {
            // Navigation
            this.setupNavigation();
            
            // Global error handling
            window.addEventListener('unhandledrejection', this.handleUnhandledError.bind(this));
        });
    }

    /**
     * Setup navigation system
     */
    setupNavigation() {
        const navLinks = document.querySelectorAll('.nav-link');
        
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = e.currentTarget.dataset.page;
                if (page) {
                    this.navigateToPage(page);
                }
            });
        });
    }

    /**
     * Navigate to a specific page
     * @param {string} pageId - ID of the page to show
     */
    navigateToPage(pageId) {
        // Hide all pages
        const allPages = document.querySelectorAll('[id$="Page"]');
        allPages.forEach(page => {
            if (page.id !== 'loginPage') {
                page.classList.add('hidden');
            }
        });

        // Show target page
        const targetPage = document.getElementById(`${pageId}Page`);
        if (targetPage) {
            targetPage.classList.remove('hidden');
            this.currentPage = pageId;
            
            // Update navigation state
            this.updateNavigation(pageId);
            
            // Load page-specific data
            this.loadPageData(pageId);
        }
    }

    /**
     * Update navigation active state
     * @param {string} activePageId - ID of the active page
     */
    updateNavigation(activePageId) {
        const navLinks = document.querySelectorAll('.nav-link');
        
        navLinks.forEach(link => {
            const pageId = link.dataset.page;
            
            if (pageId === activePageId) {
                link.classList.remove('text-gray-600', 'hover:bg-gray-50');
                link.classList.add('bg-primary-50', 'text-primary-700');
            } else {
                link.classList.remove('bg-primary-50', 'text-primary-700');
                link.classList.add('text-gray-600', 'hover:bg-gray-50');
            }
        });
    }

    /**
     * Load data for specific page
     * @param {string} pageId - ID of the page
     */
    loadPageData(pageId) {
        switch (pageId) {
            case 'dashboard':
                if (window.dashboard) {
                    window.dashboard.loadDashboardData();
                }
                break;
            case 'appointments':
                if (window.appointments) {
                    window.appointments.loadAppointments();
                }
                break;
            case 'customers':
                if (window.customers) {
                    window.customers.loadCustomers();
                }
                break;
            case 'services':
                this.loadServices();
                break;
            case 'staff':
                this.loadStaff();
                break;
        }
    }

    /**
     * Load services data
     */
    async loadServices() {
        try {
            const response = await api.getServices();
            this.renderServices(response.services);
        } catch (error) {
            console.error('Error loading services:', error);
            this.showToast('Failed to load services', 'error');
        }
    }

    /**
     * Render services grid
     * @param {Array} services - Array of service objects
     */
    renderServices(services) {
        const servicesList = document.getElementById('servicesList');
        if (!servicesList) return;

        if (!services || services.length === 0) {
            servicesList.innerHTML = '<p class="col-span-full text-gray-500 text-center">No services found</p>';
            return;
        }

        servicesList.innerHTML = services.map(service => `
            <div class="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-semibold text-gray-900">${service.name}</h3>
                    <span class="bg-primary-100 text-primary-800 text-xs font-medium px-2.5 py-0.5 rounded">
                        ${service.category}
                    </span>
                </div>
                <p class="text-gray-600 text-sm mb-4">${service.description}</p>
                <div class="flex items-center justify-between">
                    <div class="text-sm text-gray-500">
                        <i class="fas fa-clock mr-1"></i>
                        ${service.duration} min
                    </div>
                    <div class="text-lg font-bold text-gray-900">
                        $${service.price.toFixed(2)}
                    </div>
                </div>
            </div>
        `).join('');
    }

    /**
     * Load staff data
     */
    async loadStaff() {
        try {
            const response = await api.getStaff();
            this.renderStaff(response.staff);
        } catch (error) {
            console.error('Error loading staff:', error);
            this.showToast('Failed to load staff', 'error');
        }
    }

    /**
     * Render staff grid
     * @param {Array} staff - Array of staff objects
     */
    renderStaff(staff) {
        const staffList = document.getElementById('staffList');
        if (!staffList) return;

        if (!staff || staff.length === 0) {
            staffList.innerHTML = '<p class="col-span-full text-gray-500 text-center">No staff members found</p>';
            return;
        }

        staffList.innerHTML = staff.map(member => `
            <div class="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
                <div class="text-center mb-4">
                    <div class="w-16 h-16 bg-gray-300 rounded-full mx-auto mb-3 flex items-center justify-center">
                        <i class="fas fa-user text-gray-600 text-xl"></i>
                    </div>
                    <h3 class="text-lg font-semibold text-gray-900">${member.name}</h3>
                </div>
                
                <div class="space-y-2">
                    <div>
                        <h4 class="text-sm font-medium text-gray-700 mb-1">Specialties:</h4>
                        <div class="flex flex-wrap gap-1">
                            ${member.specialties.map(specialty => `
                                <span class="bg-secondary-100 text-secondary-800 text-xs font-medium px-2 py-0.5 rounded">
                                    ${specialty}
                                </span>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div>
                        <h4 class="text-sm font-medium text-gray-700 mb-1">Working Hours:</h4>
                        <div class="text-xs text-gray-600 space-y-1">
                            ${this.formatWorkingHours(member.workingHours)}
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    /**
     * Format working hours for display
     * @param {Object} workingHours - Working hours object
     * @returns {string} Formatted HTML string
     */
    formatWorkingHours(workingHours) {
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        
        return days.map((day, index) => {
            const hours = workingHours[day];
            if (!hours) {
                return `<div>${dayNames[index]}: Closed</div>`;
            }
            return `<div>${dayNames[index]}: ${hours.start} - ${hours.end}</div>`;
        }).join('');
    }

    /**
     * Setup toast notification system
     */
    setupToastSystem() {
        // Create toast container if it doesn't exist
        if (!document.getElementById('toast-container')) {
            const container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'fixed top-4 right-4 z-50 space-y-2';
            document.body.appendChild(container);
        }
    }

    /**
     * Show toast notification
     * @param {string} message - Toast message
     * @param {string} type - Toast type (success, error, warning, info)
     * @param {number} duration - Duration in milliseconds
     */
    showToast(message, type = 'info', duration = 4000) {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `flex items-center p-4 mb-4 text-sm rounded-lg shadow-lg max-w-xs transform transition-transform duration-300 translate-x-full`;
        
        // Set toast colors based on type
        const typeClasses = {
            success: 'text-green-800 bg-green-50 border border-green-200',
            error: 'text-red-800 bg-red-50 border border-red-200',
            warning: 'text-yellow-800 bg-yellow-50 border border-yellow-200',
            info: 'text-blue-800 bg-blue-50 border border-blue-200'
        };
        
        const iconClasses = {
            success: 'fas fa-check-circle text-green-500',
            error: 'fas fa-exclamation-circle text-red-500',
            warning: 'fas fa-exclamation-triangle text-yellow-500',
            info: 'fas fa-info-circle text-blue-500'
        };

        toast.className += ` ${typeClasses[type] || typeClasses.info}`;

        toast.innerHTML = `
            <i class="${iconClasses[type] || iconClasses.info} mr-2"></i>
            <span class="flex-1">${message}</span>
            <button class="ml-2 text-gray-400 hover:text-gray-600" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;

        container.appendChild(toast);

        // Animate in
        setTimeout(() => {
            toast.classList.remove('translate-x-full');
        }, 100);

        // Auto remove after duration
        setTimeout(() => {
            if (toast.parentElement) {
                toast.classList.add('translate-x-full');
                setTimeout(() => {
                    if (toast.parentElement) {
                        toast.remove();
                    }
                }, 300);
            }
        }, duration);
    }

    /**
     * Show loading spinner
     * @param {boolean} show - Whether to show or hide spinner
     */
    showLoading(show = true) {
        const spinner = document.getElementById('loadingSpinner');
        if (spinner) {
            if (show) {
                spinner.classList.remove('hidden');
            } else {
                spinner.classList.add('hidden');
            }
        }
    }

    /**
     * Handle unhandled errors
     * @param {PromiseRejectionEvent} event - Unhandled rejection event
     */
    handleUnhandledError(event) {
        console.error('Unhandled error:', event.reason);
        this.showToast('An unexpected error occurred. Please try again.', 'error');
        
        // Prevent the error from appearing in console
        event.preventDefault();
    }

    /**
     * Format date for display
     * @param {string|Date} date - Date to format
     * @param {Object} options - Formatting options
     * @returns {string} Formatted date string
     */
    formatDate(date, options = {}) {
        const defaultOptions = {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        
        return new Date(date).toLocaleDateString('en-US', { ...defaultOptions, ...options });
    }

    /**
     * Format currency for display
     * @param {number} amount - Amount to format
     * @param {string} currency - Currency code
     * @returns {string} Formatted currency string
     */
    formatCurrency(amount, currency = 'USD') {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency
        }).format(amount);
    }

    /**
     * Debounce function calls
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @returns {Function} Debounced function
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

// Global utility functions
window.showToast = (message, type, duration) => {
    if (window.app) {
        window.app.showToast(message, type, duration);
    }
};

window.showLoading = (show) => {
    if (window.app) {
        window.app.showLoading(show);
    }
};

window.formatDate = (date, options) => {
    if (window.app) {
        return window.app.formatDate(date, options);
    }
    return new Date(date).toLocaleDateString();
};

window.formatCurrency = (amount, currency) => {
    if (window.app) {
        return window.app.formatCurrency(amount, currency);
    }
    return `$${amount.toFixed(2)}`;
};

// Create global app instance
window.app = new App();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = App;
}