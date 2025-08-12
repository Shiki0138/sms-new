/**
 * Dashboard controller for SMS Salon Management System
 * Handles dashboard data loading and visualization with beautiful salon-focused design
 */

class Dashboard {
    constructor() {
        this.stats = null;
        this.charts = {};
        this.init();
    }

    /**
     * Initialize dashboard
     */
    init() {
        this.loadDashboardData();
        this.setupRefreshTimer();
        this.setupEventListeners();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Refresh button
        const refreshBtn = document.getElementById('refreshDashboard');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refresh());
        }

        // Revenue period selector
        const revenuePeriod = document.getElementById('revenuePeriod');
        if (revenuePeriod) {
            revenuePeriod.addEventListener('change', (e) => {
                this.loadRevenueData(e.target.value);
            });
        }
    }

    /**
     * Setup auto refresh timer (every 5 minutes)
     */
    setupRefreshTimer() {
        setInterval(() => {
            this.loadDashboardData();
        }, 300000); // 5 minutes
    }

    /**
     * Load dashboard data from API
     */
    async loadDashboardData() {
        try {
            window.showLoading(true);
            
            // Load all dashboard data in parallel
            const [statsResponse, activityResponse, upcomingResponse] = await Promise.all([
                api.getDashboardStats(),
                api.getDashboardActivity(),
                api.getDashboardUpcoming()
            ]);
            
            this.stats = statsResponse;
            this.updateStats(statsResponse);
            this.updateRecentActivity(activityResponse);
            this.updateUpcomingAppointments(upcomingResponse);
            
            // Update timestamp
            this.updateLastRefresh();
            
            window.showToast('ダッシュボードが更新されました', 'success', 2000);
            
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            window.showToast('ダッシュボードデータの読み込みに失敗しました', 'error');
            this.showErrorState();
        } finally {
            window.showLoading(false);
        }
    }

    /**
     * Update dashboard statistics with beautiful animations
     * @param {Object} statsResponse - Dashboard statistics response
     */
    updateStats(statsResponse) {
        const stats = statsResponse.data;
        
        // Today's appointments with progress indicator
        this.animateCounter('todayAppointments', stats.today.appointments || 0);
        this.updateProgressRing('appointmentProgress', stats.today.completionRate || 0);
        
        // Total customers with growth indicator
        this.animateCounter('totalCustomers', stats.totals.customers || 0);
        this.updateGrowthIndicator('customersGrowth', stats.thisMonth.newCustomers || 0);
        
        // Monthly revenue with beautiful formatting
        this.animateRevenue('monthlyRevenue', stats.thisMonth.revenue || 0);
        
        // Services completed today
        this.animateCounter('servicesCompleted', stats.today.completed || 0);
        
        // Update additional metrics
        this.updateAdditionalMetrics(stats);
    }

    /**
     * Animate counter with smooth transition
     * @param {string} elementId - Element ID
     * @param {number} targetValue - Target value
     */
    animateCounter(elementId, targetValue) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        const currentValue = parseInt(element.textContent) || 0;
        const increment = Math.max(1, Math.ceil((targetValue - currentValue) / 20));
        
        const animate = () => {
            const current = parseInt(element.textContent) || 0;
            if (current < targetValue) {
                element.textContent = Math.min(current + increment, targetValue);
                requestAnimationFrame(animate);
            } else {
                element.textContent = targetValue;
            }
        };
        
        if (currentValue !== targetValue) {
            animate();
        }
    }

    /**
     * Animate revenue with currency formatting
     * @param {string} elementId - Element ID
     * @param {number} targetValue - Target value
     */
    animateRevenue(elementId, targetValue) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        const currentText = element.textContent.replace(/[^0-9.]/g, '');
        const currentValue = parseFloat(currentText) || 0;
        const increment = Math.max(1, Math.ceil((targetValue - currentValue) / 30));
        
        const animate = () => {
            const currentText = element.textContent.replace(/[^0-9.]/g, '');
            const current = parseFloat(currentText) || 0;
            if (current < targetValue) {
                const newValue = Math.min(current + increment, targetValue);
                element.textContent = window.formatCurrency(newValue);
                requestAnimationFrame(animate);
            } else {
                element.textContent = window.formatCurrency(targetValue);
            }
        };
        
        if (currentValue !== targetValue) {
            animate();
        }
    }

    /**
     * Update progress ring
     * @param {string} elementId - Element ID
     * @param {number} percentage - Percentage (0-100)
     */
    updateProgressRing(elementId, percentage) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        const circle = element.querySelector('circle:last-child');
        const text = element.querySelector('text');
        
        if (circle && text) {
            const circumference = 2 * Math.PI * 45; // radius = 45
            const offset = circumference - (percentage / 100) * circumference;
            
            circle.style.strokeDasharray = circumference;
            circle.style.strokeDashoffset = offset;
            text.textContent = `${Math.round(percentage)}%`;
        }
    }

    /**
     * Update growth indicator
     * @param {string} elementId - Element ID 
     * @param {number} newCustomers - New customers count
     */
    updateGrowthIndicator(elementId, newCustomers) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        element.innerHTML = `
            <div class="flex items-center text-sm ${
                newCustomers > 0 ? 'text-green-600' : 'text-gray-500'
            }">
                <i class="fas fa-${newCustomers > 0 ? 'arrow-up' : 'minus'} mr-1"></i>
                +${newCustomers} this month
            </div>
        `;
    }

    /**
     * Update additional metrics
     * @param {Object} stats - Statistics data
     */
    updateAdditionalMetrics(stats) {
        // Update staff count
        const staffCountEl = document.getElementById('staffCount');
        if (staffCountEl) {
            staffCountEl.textContent = stats.totals.staff || 0;
        }
        
        // Update services count
        const servicesCountEl = document.getElementById('servicesCount');
        if (servicesCountEl) {
            servicesCountEl.textContent = stats.totals.services || 0;
        }
        
        // Update completion rate
        const completionRateEl = document.getElementById('completionRate');
        if (completionRateEl) {
            completionRateEl.textContent = `${stats.today.completionRate || 0}%`;
        }
    }

    /**
     * Update recent activity sections
     * @param {Object} activityResponse - Recent activity response
     */
    updateRecentActivity(activityResponse) {
        const activity = activityResponse.data;
        this.updateRecentAppointments(activity.recentAppointments);
        this.updateNewCustomers(activity.recentCustomers);
    }

    /**
     * Update recent appointments with beautiful cards
     * @param {Array} appointments - Recent appointments
     */
    updateRecentAppointments(appointments) {
        const container = document.getElementById('recentAppointments');
        if (!container) return;
        
        if (!appointments || appointments.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8">
                    <i class="fas fa-calendar-alt text-gray-300 text-4xl mb-3"></i>
                    <p class="text-gray-500">最近の予約はありません</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = appointments.map(appointment => `
            <div class="flex items-center justify-between p-4 bg-gradient-to-r from-white to-gray-50 rounded-lg border border-gray-100 hover:shadow-md transition-shadow">
                <div class="flex items-center flex-1">
                    <div class="w-12 h-12 ${this.getStatusGradient(appointment.status)} rounded-full flex items-center justify-center mr-4">
                        <i class="fas fa-${this.getStatusIcon(appointment.status)} text-white"></i>
                    </div>
                    <div class="flex-1">
                        <p class="font-semibold text-gray-900">${appointment.customerName}</p>
                        <p class="text-sm text-gray-600">${appointment.serviceName}</p>
                        <p class="text-xs text-gray-500">
                            <i class="fas fa-clock mr-1"></i>
                            ${window.formatDate(appointment.scheduledFor, { 
                                hour: '2-digit', 
                                minute: '2-digit',
                                month: 'short',
                                day: 'numeric'
                            })}
                        </p>
                    </div>
                </div>
                <div class="text-right">
                    <div class="${this.getStatusClass(appointment.status)} text-xs px-3 py-1 rounded-full font-medium mb-1">
                        ${appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                    </div>
                    <p class="text-lg font-bold text-gray-900">
                        ${window.formatCurrency(appointment.totalAmount || 0)}
                    </p>
                </div>
            </div>
        `).join('');
    }

    /**
     * Update new customers with elegant cards
     * @param {Array} customers - New customers
     */
    updateNewCustomers(customers) {
        const container = document.getElementById('newCustomers');
        if (!container) return;
        
        if (!customers || customers.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8">
                    <i class="fas fa-users text-gray-300 text-4xl mb-3"></i>
                    <p class="text-gray-500">新規顧客はいません</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = customers.map(customer => `
            <div class="flex items-center justify-between p-4 bg-gradient-to-r from-white to-purple-50 rounded-lg border border-purple-100 hover:shadow-md transition-shadow">
                <div class="flex items-center">
                    <div class="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mr-4">
                        <span class="text-white font-semibold text-lg">
                            ${customer.firstName.charAt(0)}${customer.lastName.charAt(0)}
                        </span>
                    </div>
                    <div>
                        <p class="font-semibold text-gray-900">${customer.firstName} ${customer.lastName}</p>
                        <p class="text-sm text-gray-600">${customer.email}</p>
                        <p class="text-xs text-purple-600">
                            <i class="fas fa-star mr-1"></i>
                            New Customer
                        </p>
                    </div>
                </div>
                <div class="text-right">
                    <p class="text-sm text-gray-500">
                        <i class="fas fa-calendar mr-1"></i>
                        ${window.formatDate(customer.createdAt, { dateStyle: 'short' })}
                    </p>
                    <p class="text-xs text-gray-400">${customer.totalVisits || 0} visits</p>
                </div>
            </div>
        `).join('');
    }

    /**
     * Update upcoming appointments
     * @param {Object} upcomingResponse - Upcoming appointments response
     */
    updateUpcomingAppointments(upcomingResponse) {
        const container = document.getElementById('upcomingAppointments');
        if (!container) return;
        
        const upcoming = upcomingResponse.data;
        
        if (!upcoming || upcoming.length === 0) {
            container.innerHTML = `
                <div class="text-center py-6">
                    <i class="fas fa-clock text-gray-300 text-3xl mb-2"></i>
                    <p class="text-gray-500">今日の予定はありません</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = `
            <div class="space-y-3">
                ${upcoming.slice(0, 5).map(appointment => `
                    <div class="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                        <div class="flex items-center">
                            <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mr-3">
                                <i class="fas fa-clock text-white text-xs"></i>
                            </div>
                            <div>
                                <p class="font-medium text-gray-900">${appointment.customerName}</p>
                                <p class="text-sm text-gray-600">${appointment.serviceName}</p>
                            </div>
                        </div>
                        <div class="text-right">
                            <p class="font-bold text-blue-600">${appointment.startTime}</p>
                            <p class="text-xs text-gray-500">${window.formatCurrency(appointment.totalAmount || 0)}</p>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    /**
     * Get status gradient class
     * @param {string} status - Appointment status
     * @returns {string} CSS gradient class
     */
    getStatusGradient(status) {
        const gradients = {
            'scheduled': 'bg-gradient-to-r from-yellow-400 to-orange-500',
            'confirmed': 'bg-gradient-to-r from-blue-400 to-blue-600',
            'completed': 'bg-gradient-to-r from-green-400 to-green-600',
            'cancelled': 'bg-gradient-to-r from-red-400 to-red-600',
            'no-show': 'bg-gradient-to-r from-gray-400 to-gray-600'
        };
        return gradients[status] || 'bg-gradient-to-r from-gray-400 to-gray-600';
    }

    /**
     * Get status icon
     * @param {string} status - Appointment status
     * @returns {string} Font Awesome icon name
     */
    getStatusIcon(status) {
        const icons = {
            'scheduled': 'clock',
            'confirmed': 'check-circle',
            'completed': 'star',
            'cancelled': 'times-circle',
            'no-show': 'user-slash'
        };
        return icons[status] || 'question-circle';
    }

    /**
     * Get status class for appointment status
     * @param {string} status - Appointment status
     * @returns {string} CSS class
     */
    getStatusClass(status) {
        const statusClasses = {
            'scheduled': 'bg-yellow-100 text-yellow-800',
            'confirmed': 'bg-blue-100 text-blue-800',
            'completed': 'bg-green-100 text-green-800',
            'cancelled': 'bg-red-100 text-red-800',
            'no-show': 'bg-gray-100 text-gray-800'
        };
        return statusClasses[status] || 'bg-gray-100 text-gray-800';
    }

    /**
     * Update last refresh timestamp
     */
    updateLastRefresh() {
        const element = document.getElementById('lastRefresh');
        if (element) {
            element.textContent = new Date().toLocaleTimeString();
        }
    }

    /**
     * Show error state
     */
    showErrorState() {
        const containers = ['recentAppointments', 'newCustomers', 'upcomingAppointments'];
        containers.forEach(containerId => {
            const container = document.getElementById(containerId);
            if (container) {
                container.innerHTML = `
                    <div class="text-center py-6">
                        <i class="fas fa-exclamation-triangle text-red-300 text-3xl mb-2"></i>
                        <p class="text-red-500">データの読み込みエラー</p>
                        <button onclick="window.dashboard.refresh()" class="text-blue-500 hover:text-blue-700 text-sm mt-2">
                            再試行
                        </button>
                    </div>
                `;
            }
        });
    }

    /**
     * Load revenue data for specific period
     * @param {string} period - Time period (week|month)
     */
    async loadRevenueData(period = 'month') {
        try {
            const revenue = await api.getDashboardRevenue(period);
            this.updateRevenueChart(revenue.data);
        } catch (error) {
            console.error('Error loading revenue data:', error);
            window.showToast('売上データの読み込みに失敗しました', 'error');
        }
    }

    /**
     * Update revenue chart
     * @param {Object} revenueData - Revenue data
     */
    updateRevenueChart(revenueData) {
        const container = document.getElementById('revenueChart');
        if (!container) return;
        
        container.innerHTML = `
            <div class="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6">
                <div class="flex items-center justify-between mb-4">
                    <h4 class="text-lg font-semibold text-gray-800">Revenue (${revenueData.period})</h4>
                    <div class="text-2xl font-bold text-green-600">
                        ${window.formatCurrency(revenueData.total)}
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-4 text-center">
                    <div class="bg-white rounded-lg p-3">
                        <p class="text-sm text-gray-600">平均</p>
                        <p class="text-lg font-semibold text-gray-900">${window.formatCurrency(revenueData.average)}</p>
                    </div>
                    <div class="bg-white rounded-lg p-3">
                        <p class="text-sm text-gray-600">予約数</p>
                        <p class="text-lg font-semibold text-gray-900">${revenueData.appointments}</p>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Refresh dashboard data
     */
    refresh() {
        this.loadDashboardData();
    }
}

// Create global dashboard instance
window.dashboard = new Dashboard();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Dashboard;
}