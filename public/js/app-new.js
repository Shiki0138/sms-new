// Global variables
let currentUser = null;
let authToken = null;
let calendar = null;

// API base URL
const API_BASE = '/api';

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupEventListeners();
});

// Check authentication
function checkAuth() {
    console.log('DOM loaded, initializing app...');
    console.log('Current path:', window.location.pathname);
    
    // Skip if running on login page
    if (window.location.pathname === '/login.html' || 
        window.location.pathname.includes('/login') ||
        window.location.pathname === '/register.html') {
        console.log('On auth page, skipping auth check');
        return;
    }
    
    // Simple auth check without race condition locks
    if (window.authCheckRunning) {
        console.log('Auth check already running, skipping');
        return;
    }
    window.authCheckRunning = true;
    
    console.log('Checking authentication...');
    
    // Use standardized token key only
    authToken = localStorage.getItem('salon_token') || 
                sessionStorage.getItem('salon_token');
    
    const userStr = localStorage.getItem('salon_user') || sessionStorage.getItem('salon_user');
    
    console.log('Auth token found:', !!authToken);
    console.log('User data found:', !!userStr);
    
    // Enhanced validation - check token format and user data structure
    let isValidToken = false;
    let isValidUser = false;
    
    if (authToken && authToken.length > 10) {
        isValidToken = true;
    }
    
    if (userStr) {
        try {
            const userData = JSON.parse(userStr);
            if (userData && userData.id && userData.name) {
                isValidUser = true;
            }
        } catch (e) {
            console.warn('Invalid user data format:', e);
        }
    }
    
    if (!isValidToken || !isValidUser) {
        console.log('Invalid or missing authentication data, redirecting to login');
        // Clear invalid data
        localStorage.removeItem('salon_token');
        localStorage.removeItem('salon_user');
        sessionStorage.removeItem('salon_token');
        sessionStorage.removeItem('salon_user');
        
        // Add delay to prevent redirect loops
        setTimeout(() => {
            if (window.location.pathname !== '/login.html') {
                window.location.href = '/login.html';
            }
        }, 100);
        return;
    }
    
    try {
        currentUser = JSON.parse(userStr);
        // Make authToken globally available
        window.authToken = authToken;
        
        console.log('User parsed successfully:', currentUser);
        console.log('Updating user info in UI...');
        
        // Clear the running flag on success
        window.authCheckRunning = false;
        
        updateUserInfo();
        
        // Load appropriate page content with delay for UI stability
        setTimeout(() => {
            if (window.location.pathname === '/dashboard.html' || 
                window.location.pathname.includes('/dashboard')) {
                console.log('Loading dashboard...');
                loadDashboard();
            }
        }, 50);
        
    } catch (error) {
        console.error('Auth error:', error);
        window.authCheckRunning = false;
        logout();
    }
}

// Update user info in UI
function updateUserInfo() {
    if (!currentUser) {
        console.warn('No current user data to update UI');
        return;
    }
    
    try {
        // Safely update UI elements if they exist
        const userName = document.getElementById('userName');
        const salonName = document.getElementById('salonName');
        const userPlan = document.getElementById('userPlan');
        
        if (userName && currentUser.name) {
            userName.textContent = currentUser.name;
        }
        if (salonName && currentUser.salonName) {
            salonName.textContent = currentUser.salonName;
        }
        if (userPlan && currentUser.planType) {
            userPlan.textContent = currentUser.planType.toUpperCase();
        }
        
        // Also update any other user info displays with error protection
        const userNameDisplays = document.querySelectorAll('.user-name');
        userNameDisplays.forEach(el => {
            try {
                if (el && currentUser.name && el.textContent !== currentUser.name) {
                    el.textContent = currentUser.name;
                }
            } catch (error) {
                console.warn('Error updating user name display:', error);
            }
        });
        
        console.log('User info updated successfully');
    } catch (error) {
        console.error('Error updating user info:', error);
        // Don't fail completely on UI update errors
    }
}

// Setup event listeners
function setupEventListeners() {
    // Logout - check if element exists
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;
            console.log('Navigation item clicked in app-new.js:', page);
            if (page) {
                navigateToPage(page);
            } else {
                console.warn('No data-page attribute found on nav item');
            }
        });
    });
    
    // Add buttons - use optional chaining
    document.getElementById('addCustomerBtn')?.addEventListener('click', showAddCustomerModal);
    document.getElementById('addAppointmentBtn')?.addEventListener('click', showAddAppointmentModal);
    document.getElementById('addSaleBtn')?.addEventListener('click', showAddSaleModal);
    
    // Search
    document.getElementById('customerSearch')?.addEventListener('input', searchCustomers);
    
    // Forms
    document.getElementById('profileForm')?.addEventListener('submit', updateProfile);
}

// Navigate to page
function navigateToPage(page) {
    console.log('Navigating to page:', page);
    
    // Update nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.page === page);
    });
    
    // Update pages
    document.querySelectorAll('.page').forEach(pageEl => {
        pageEl.classList.toggle('active', pageEl.id === page);
    });
    
    // Close mobile menu if open
    const sidebar = document.getElementById('sidebar');
    if (sidebar && window.innerWidth <= 768) {
        sidebar.classList.remove('active');
    }
    
    console.log('Loading page data for:', page);
    
    // Load page data
    switch(page) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'customers':
            loadCustomers();
            break;
        case 'appointments':
            loadAppointments();
            break;
        case 'sales':
            loadSales();
            break;
        case 'records':
            loadRecords();
            break;
        case 'services':
            loadServices();
            break;
        case 'staff':
            loadStaff();
            break;
        case 'messages':
            loadMessages();
            break;
        case 'analytics':
            loadAnalytics();
            break;
        case 'settings':
            loadSettings();
            break;
    }
}

// API request helper with enhanced error handling
async function apiRequest(endpoint, options = {}) {
    try {
        if (!authToken) {
            throw new Error('No authentication token available');
        }
        
        console.log(`Making API request to: ${API_BASE}${endpoint}`);
        console.log('Auth token length:', authToken.length);
        console.log('Request options:', options);
        
        const defaultOptions = {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000 // 10 second timeout
        };
        
        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers
            }
        });
        
        console.log(`Response status: ${response.status}`);
        console.log(`Response ok: ${response.ok}`);
        
        if (response.status === 401) {
            console.warn('Authentication failed, clearing invalid session');
            // Clear authentication data and redirect
            clearAuthData();
            // Only redirect if not already on login page
            if (!window.location.pathname.includes('login')) {
                setTimeout(() => {
                    window.location.href = '/login.html';
                }, 100);
            }
            throw new Error('Unauthorized');
        }
        
        if (!response.ok) {
            let errorMessage = 'API request failed';
            let errorData;
            try {
                errorData = await response.json();
                errorMessage = errorData.message || errorMessage;
                console.error('API error response:', errorData);
            } catch (parseError) {
                console.warn('Could not parse error response:', parseError);
                errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            }
            console.error(`API request failed: ${errorMessage}`, {
                endpoint,
                status: response.status,
                statusText: response.statusText,
                errorData
            });
            throw new Error(errorMessage);
        }
        
        const responseData = await response.json();
        console.log('API response data:', responseData);
        return responseData;
    } catch (error) {
        console.error(`API request to ${endpoint} failed:`, error);
        
        // Don't re-throw network errors immediately, allow retry logic
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            console.warn('Network error detected, API may be unavailable');
        }
        
        throw error;
    }
}

// Load dashboard with enhanced error handling and fallback data
async function loadDashboard() {
    try {
        console.log('Loading dashboard data...');
        console.log('Auth token available:', !!authToken);
        console.log('Current user:', currentUser);
        
        // Show loading state
        showLoadingState();
        
        const data = await apiRequest('/dashboard/summary');
        console.log('Dashboard data received:', data);
        
        // Hide loading state
        hideLoadingState();
        
        // Safely update stats with null checks and better fallbacks
        const updateStat = (id, value, fallback = '0') => {
            const element = document.getElementById(id);
            if (element) {
                const displayValue = value !== undefined && value !== null ? value : fallback;
                element.textContent = displayValue;
                console.log(`Updated ${id} with value: ${displayValue}`);
            } else {
                console.warn(`Element with ID '${id}' not found`);
            }
        };
        
        // Update statistics with better error handling
        updateStat('todayAppointments', data?.today?.appointmentCount || 0);
        updateStat('todaySales', data?.today?.sales?.total ? data.today.sales.total.toLocaleString() : '0');
        updateStat('totalCustomers', data?.customers?.total || 0);
        updateStat('monthlySales', data?.thisMonth?.sales?.total ? data.thisMonth.sales.total.toLocaleString() : '0');
        
        // Update today's schedule with safety checks
        const todayScheduleElement = document.getElementById('todaySchedule');
        if (todayScheduleElement) {
            const appointments = data?.today?.appointments || [];
            const scheduleHtml = appointments.length > 0
                ? appointments.map(apt => `
                    <div class="schedule-item">
                        <span class="time">${apt.startTime || '時間未設定'}</span>
                        <span class="customer">${(apt.customer?.lastName || '') + ' ' + (apt.customer?.firstName || '名前未設定')}</span>
                        <span class="status">${getStatusBadge(apt.status || 'unknown')}</span>
                    </div>
                `).join('')
                : '<p class="empty-state">本日の予約はありません</p>';
            
            todayScheduleElement.innerHTML = scheduleHtml;
        }
        
        // Update recent customers with safety checks
        const recentCustomersElement = document.getElementById('recentCustomers');
        if (recentCustomersElement) {
            const recentCustomers = data?.customers?.recent || [];
            const customersHtml = recentCustomers.length > 0
                ? recentCustomers.map(customer => `
                    <div class="customer-item">
                        <span>${(customer.lastName || '') + ' ' + (customer.firstName || '名前未設定')}</span>
                        <span class="date">${formatDate(customer.createdAt) || '登録日不明'}</span>
                    </div>
                `).join('')
                : '<p class="empty-state">データがありません</p>';
            
            recentCustomersElement.innerHTML = customersHtml;
        }
        
        console.log('Dashboard loaded successfully');
        
    } catch (error) {
        console.error('Dashboard load error:', error);
        console.error('Error details:', {
            message: error.message,
            status: error.status,
            authToken: !!authToken,
            user: !!currentUser
        });
        
        // Hide loading state
        hideLoadingState();
        
        // Show fallback data instead of complete failure
        showFallbackDashboard(error);
        
        // Don't redirect to login unless it's specifically an auth error
        if (error.message !== 'Unauthorized' && !error.message.includes('401')) {
            showError(`ダッシュボードの読み込みに失敗しました: ${error.message}. データを再取得しています...`);
            
            // Retry after 3 seconds
            setTimeout(() => {
                console.log('Retrying dashboard load...');
                loadDashboard();
            }, 3000);
        }
    }
}

// Load customers
async function loadCustomers() {
    try {
        const data = await apiRequest('/customers');
        
        const tbody = document.getElementById('customerTableBody');
        if (data.customers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-state">顧客データがありません</td></tr>';
            return;
        }
        
        tbody.innerHTML = data.customers.map(customer => `
            <tr>
                <td>${customer.lastName} ${customer.firstName}</td>
                <td>${customer.lastNameKana || ''} ${customer.firstNameKana || ''}</td>
                <td>${customer.phoneNumber}</td>
                <td>${customer.lastVisitDate ? formatDate(customer.lastVisitDate) : '-'}</td>
                <td>${customer.visitCount}回</td>
                <td>
                    <button class="btn btn-sm" onclick="viewCustomer('${customer.id}')">詳細</button>
                    <button class="btn btn-sm" onclick="editCustomer('${customer.id}')">編集</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Customers load error:', error);
        showError('顧客データの読み込みに失敗しました');
    }
}

// Load appointments
async function loadAppointments() {
    try {
        // Initialize calendar if not already initialized
        if (!calendar && window.AppointmentCalendar) {
            calendar = new AppointmentCalendar('appointmentCalendar', {
                view: 'month',
                onDateClick: (date) => {
                    showAddAppointmentModal(date);
                },
                onAppointmentClick: (appointment) => {
                    showAppointmentDetail(appointment);
                }
            });
            
            // Make calendar globally accessible
            window.calendar = calendar;
        }
    } catch (error) {
        console.error('Appointments load error:', error);
        showError('予約データの読み込みに失敗しました');
    }
}

// Load sales
async function loadSales() {
    try {
        const data = await apiRequest('/sales');
        
        document.getElementById('salesCount').textContent = `${data.summary.totalSales}件`;
        document.getElementById('salesTotal').textContent = data.summary.totalAmount.toLocaleString();
        
        const tbody = document.getElementById('salesTableBody');
        if (data.sales.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-state">売上データがありません</td></tr>';
            return;
        }
        
        tbody.innerHTML = data.sales.map(sale => `
            <tr>
                <td>${formatDate(sale.saleDate)}</td>
                <td>${sale.customer ? `${sale.customer.lastName} ${sale.customer.firstName}` : '-'}</td>
                <td>${sale.items.map(item => item.name).join(', ')}</td>
                <td>¥${parseFloat(sale.totalAmount).toLocaleString()}</td>
                <td>${getPaymentMethod(sale.paymentMethod)}</td>
                <td>
                    <button class="btn btn-sm" onclick="viewSale('${sale.id}')">詳細</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Sales load error:', error);
        showError('売上データの読み込みに失敗しました');
    }
}

// Load records
async function loadRecords() {
    // TODO: Implement medical records
    console.log('Loading records...');
}

// Load settings
async function loadSettings() {
    try {
        const data = await apiRequest('/settings');
        const setting = data.setting;
        
        // Update profile form
        document.getElementById('settingsName').value = currentUser.name;
        document.getElementById('settingsSalonName').value = currentUser.salonName;
        document.getElementById('settingsPhone').value = currentUser.phoneNumber;
        
        // Update plan info
        document.getElementById('currentPlan').textContent = getPlanName(currentUser.planType);
        document.getElementById('trialEnd').textContent = formatDate(currentUser.trialEndsAt);
        
        // Update business hours
        updateBusinessHoursUI(setting.businessHours);
        
        // Update holidays
        updateHolidaysUI(setting.holidays, setting.temporaryClosures);
    } catch (error) {
        console.error('Settings load error:', error);
        showError('設定の読み込みに失敗しました');
    }
}

// Update business hours UI
function updateBusinessHoursUI(businessHours) {
    const container = document.getElementById('businessHours');
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const dayNames = ['月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日', '日曜日'];
    
    let html = '<form id="businessHoursForm">';
    
    days.forEach((day, index) => {
        const hours = businessHours?.[day] || { open: '09:00', close: '19:00', isOpen: true };
        html += `
            <div class="day-hours">
                <label>
                    <input type="checkbox" name="${day}_isOpen" ${hours.isOpen ? 'checked' : ''}>
                    ${dayNames[index]}
                </label>
                <div class="time-inputs ${!hours.isOpen ? 'disabled' : ''}">
                    <input type="time" name="${day}_open" value="${hours.open}" ${!hours.isOpen ? 'disabled' : ''}>
                    <span>〜</span>
                    <input type="time" name="${day}_close" value="${hours.close}" ${!hours.isOpen ? 'disabled' : ''}>
                </div>
            </div>
        `;
    });
    
    html += '<button type="submit" class="btn btn-primary">営業時間を保存</button></form>';
    
    container.innerHTML = html;
    
    // Add event listeners
    document.getElementById('businessHoursForm').addEventListener('submit', saveBusinessHours);
    
    // Toggle time inputs based on checkbox
    days.forEach(day => {
        const checkbox = document.querySelector(`input[name="${day}_isOpen"]`);
        checkbox.addEventListener('change', (e) => {
            const timeInputs = e.target.closest('.day-hours').querySelector('.time-inputs');
            const inputs = timeInputs.querySelectorAll('input');
            
            if (e.target.checked) {
                timeInputs.classList.remove('disabled');
                inputs.forEach(input => input.disabled = false);
            } else {
                timeInputs.classList.add('disabled');
                inputs.forEach(input => input.disabled = true);
            }
        });
    });
}

// Update holidays UI
function updateHolidaysUI(holidays = [], temporaryClosures = []) {
    const container = document.createElement('div');
    container.className = 'card';
    container.innerHTML = `
        <h3>休日・休業日設定</h3>
        <div class="holidays-section">
            <h4>定休日</h4>
            <div id="regularHolidays">
                ${holidays.map(date => `
                    <div class="holiday-item">
                        <span>${formatDate(date)}</span>
                        <button class="btn btn-sm" onclick="removeHoliday('${date}')">削除</button>
                    </div>
                `).join('') || '<p>定休日が設定されていません</p>'}
            </div>
            <button class="btn btn-sm" onclick="addHoliday()">定休日を追加</button>
        </div>
        
        <div class="closures-section">
            <h4>臨時休業日</h4>
            <div id="temporaryClosures">
                ${temporaryClosures.map((closure, index) => `
                    <div class="closure-item">
                        <span>${formatDate(closure.startDate)} 〜 ${formatDate(closure.endDate)}</span>
                        ${closure.reason ? `<span class="closure-reason">${closure.reason}</span>` : ''}
                        <button class="btn btn-sm" onclick="removeClosure(${index})">削除</button>
                    </div>
                `).join('') || '<p>臨時休業日が設定されていません</p>'}
            </div>
            <button class="btn btn-sm" onclick="addClosure()">臨時休業日を追加</button>
        </div>
    `;
    
    // Insert after business hours
    const settingsSections = document.querySelector('.settings-sections');
    const businessHoursCard = document.querySelector('.settings-sections .card:nth-child(2)');
    businessHoursCard.insertAdjacentElement('afterend', container);
}

// Save business hours
async function saveBusinessHours(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const businessHours = {};
    
    days.forEach(day => {
        businessHours[day] = {
            isOpen: formData.get(`${day}_isOpen`) === 'on',
            open: formData.get(`${day}_open`) || '09:00',
            close: formData.get(`${day}_close`) || '19:00'
        };
    });
    
    try {
        await apiRequest('/settings/business-hours', {
            method: 'PUT',
            body: JSON.stringify({ businessHours })
        });
        
        showSuccess('営業時間を更新しました');
        
        // Update calendar if available
        if (window.calendar) {
            window.calendar.loadSettings();
        }
    } catch (error) {
        showError(error.message);
    }
}

// Holiday management functions
window.addHoliday = () => {
    const content = `
        <form id="holidayForm">
            <div class="form-group">
                <label>定休日</label>
                <input type="date" name="holidayDate" required>
            </div>
            <button type="submit" class="btn btn-primary">追加</button>
        </form>
    `;
    
    showModal('定休日を追加', content);
    
    document.getElementById('holidayForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        try {
            const data = await apiRequest('/settings');
            const holidays = data.setting.holidays || [];
            holidays.push(formData.get('holidayDate'));
            
            await apiRequest('/settings/holidays', {
                method: 'PUT',
                body: JSON.stringify({ holidays })
            });
            
            closeModal();
            loadSettings();
            showSuccess('定休日を追加しました');
        } catch (error) {
            showError(error.message);
        }
    });
};

window.removeHoliday = async (date) => {
    if (!confirm('この定休日を削除しますか？')) return;
    
    try {
        const data = await apiRequest('/settings');
        const holidays = data.setting.holidays?.filter(h => h !== date) || [];
        
        await apiRequest('/settings/holidays', {
            method: 'PUT',
            body: JSON.stringify({ holidays })
        });
        
        loadSettings();
        showSuccess('定休日を削除しました');
    } catch (error) {
        showError(error.message);
    }
};

window.addClosure = () => {
    const content = `
        <form id="closureForm">
            <div class="form-group">
                <label>開始日</label>
                <input type="date" name="startDate" required>
            </div>
            <div class="form-group">
                <label>終了日</label>
                <input type="date" name="endDate" required>
            </div>
            <div class="form-group">
                <label>理由（任意）</label>
                <input type="text" name="reason" placeholder="例：設備メンテナンス">
            </div>
            <button type="submit" class="btn btn-primary">追加</button>
        </form>
    `;
    
    showModal('臨時休業日を追加', content);
    
    document.getElementById('closureForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        try {
            const data = await apiRequest('/settings');
            const closures = data.setting.temporaryClosures || [];
            closures.push({
                startDate: formData.get('startDate'),
                endDate: formData.get('endDate'),
                reason: formData.get('reason')
            });
            
            await apiRequest('/settings/closures', {
                method: 'PUT',
                body: JSON.stringify({ closures })
            });
            
            closeModal();
            loadSettings();
            showSuccess('臨時休業日を追加しました');
        } catch (error) {
            showError(error.message);
        }
    });
};

window.removeClosure = async (index) => {
    if (!confirm('この臨時休業日を削除しますか？')) return;
    
    try {
        const data = await apiRequest('/settings');
        const closures = data.setting.temporaryClosures || [];
        closures.splice(index, 1);
        
        await apiRequest('/settings/closures', {
            method: 'PUT',
            body: JSON.stringify({ closures })
        });
        
        loadSettings();
        showSuccess('臨時休業日を削除しました');
    } catch (error) {
        showError(error.message);
    }
};

// Update profile
async function updateProfile(e) {
    e.preventDefault();
    
    try {
        const data = await apiRequest('/auth/profile', {
            method: 'PUT',
            body: JSON.stringify({
                name: document.getElementById('settingsName').value,
                salonName: document.getElementById('settingsSalonName').value,
                phoneNumber: document.getElementById('settingsPhone').value
            })
        });
        
        currentUser = data.user;
        localStorage.setItem('salon_user', JSON.stringify(currentUser));
        updateUserInfo();
        showSuccess('プロフィールを更新しました');
    } catch (error) {
        console.error('Profile update error:', error);
        showError('プロフィールの更新に失敗しました');
    }
}

// Modal functions
function showModal(title, content) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = content;
    document.getElementById('modal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('modal').style.display = 'none';
}

// Appointment modal
function showAddAppointmentModal(date = null) {
    const selectedDate = date ? date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    const selectedTime = date ? `${String(date.getHours()).padStart(2, '0')}:00` : '10:00';
    
    const content = `
        <form id="appointmentForm">
            <div class="form-group">
                <label>顧客</label>
                <select name="customerId" id="appointmentCustomer" required>
                    <option value="">顧客を選択してください</option>
                </select>
            </div>
            <div class="form-group">
                <label>予約日</label>
                <input type="date" name="appointmentDate" value="${selectedDate}" required>
            </div>
            <div class="form-group">
                <label>開始時刻</label>
                <input type="time" name="startTime" value="${selectedTime}" required>
            </div>
            <div class="form-group">
                <label>終了時刻</label>
                <input type="time" name="endTime" value="${String(parseInt(selectedTime) + 1).padStart(2, '0')}:00" required>
            </div>
            <div class="form-group">
                <label>サービス</label>
                <div id="servicesList">
                    <div class="service-item">
                        <input type="text" name="serviceName[]" placeholder="サービス名" required>
                        <input type="number" name="servicePrice[]" placeholder="価格" required>
                        <button type="button" class="btn btn-sm" onclick="removeService(this)">削除</button>
                    </div>
                </div>
                <button type="button" class="btn btn-sm" onclick="addService()">サービス追加</button>
            </div>
            <div class="form-group">
                <label>備考</label>
                <textarea name="notes" rows="3"></textarea>
            </div>
            <button type="submit" class="btn btn-primary">予約登録</button>
        </form>
    `;
    
    showModal('新規予約', content);
    
    // Load customers
    loadCustomersForSelect();
    
    document.getElementById('appointmentForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        // Build services array
        const services = [];
        const serviceNames = formData.getAll('serviceName[]');
        const servicePrices = formData.getAll('servicePrice[]');
        
        for (let i = 0; i < serviceNames.length; i++) {
            if (serviceNames[i]) {
                services.push({
                    name: serviceNames[i],
                    price: parseInt(servicePrices[i]) || 0
                });
            }
        }
        
        const appointmentData = {
            customerId: formData.get('customerId'),
            appointmentDate: formData.get('appointmentDate'),
            startTime: formData.get('startTime'),
            endTime: formData.get('endTime'),
            services: services,
            notes: formData.get('notes'),
            totalAmount: services.reduce((sum, s) => sum + s.price, 0)
        };
        
        try {
            await apiRequest('/appointments', {
                method: 'POST',
                body: JSON.stringify(appointmentData)
            });
            
            closeModal();
            
            // Reload calendar if available
            if (window.calendar) {
                window.calendar.loadAppointments();
            }
            
            showSuccess('予約を登録しました');
        } catch (error) {
            showError(error.message);
        }
    });
}

async function loadCustomersForSelect() {
    try {
        const data = await apiRequest('/customers');
        const select = document.getElementById('appointmentCustomer');
        
        select.innerHTML = '<option value="">顧客を選択してください</option>' +
            data.customers.map(customer => 
                `<option value="${customer.id}">${customer.lastName} ${customer.firstName}</option>`
            ).join('');
    } catch (error) {
        console.error('Load customers error:', error);
    }
}

window.addService = () => {
    const servicesList = document.getElementById('servicesList');
    const newService = document.createElement('div');
    newService.className = 'service-item';
    newService.innerHTML = `
        <input type="text" name="serviceName[]" placeholder="サービス名" required>
        <input type="number" name="servicePrice[]" placeholder="価格" required>
        <button type="button" class="btn btn-sm" onclick="removeService(this)">削除</button>
    `;
    servicesList.appendChild(newService);
};

window.removeService = (button) => {
    button.parentElement.remove();
};

// Customer modal
function showAddCustomerModal() {
    const content = `
        <form id="customerForm">
            <div class="form-group">
                <label>姓</label>
                <input type="text" name="lastName" required>
            </div>
            <div class="form-group">
                <label>名</label>
                <input type="text" name="firstName" required>
            </div>
            <div class="form-group">
                <label>姓（カナ）</label>
                <input type="text" name="lastNameKana">
            </div>
            <div class="form-group">
                <label>名（カナ）</label>
                <input type="text" name="firstNameKana">
            </div>
            <div class="form-group">
                <label>電話番号</label>
                <input type="tel" name="phoneNumber" required>
            </div>
            <div class="form-group">
                <label>メールアドレス</label>
                <input type="email" name="email">
            </div>
            <button type="submit" class="btn btn-primary">登録</button>
        </form>
    `;
    
    showModal('新規顧客登録', content);
    
    document.getElementById('customerForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData);
        
        try {
            await apiRequest('/customers', {
                method: 'POST',
                body: JSON.stringify(data)
            });
            
            closeModal();
            loadCustomers();
            showSuccess('顧客を登録しました');
        } catch (error) {
            showError(error.message);
        }
    });
}

// Utility functions
function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ja-JP');
}

function getStatusBadge(status) {
    const badges = {
        scheduled: '<span class="badge badge-info">予定</span>',
        confirmed: '<span class="badge badge-success">確定</span>',
        completed: '<span class="badge badge-secondary">完了</span>',
        cancelled: '<span class="badge badge-danger">キャンセル</span>'
    };
    return badges[status] || status;
}

function getPaymentMethod(method) {
    const methods = {
        cash: '現金',
        credit_card: 'クレジットカード',
        debit_card: 'デビットカード',
        electronic_money: '電子マネー',
        bank_transfer: '銀行振込',
        other: 'その他'
    };
    return methods[method] || method;
}

function getPlanName(plan) {
    const plans = {
        light: 'ライトプラン',
        standard: 'スタンダードプラン',
        premium: 'プレミアムプラン'
    };
    return plans[plan] || plan;
}

function showSuccess(message) {
    // TODO: Implement toast notification
    alert(message);
}

function showError(message) {
    // TODO: Implement toast notification
    alert('エラー: ' + message);
}

// Clear authentication data without redirect
function clearAuthData() {
    console.log('Clearing authentication data...');
    
    // Clear all authentication data
    localStorage.removeItem('salon_token');
    localStorage.removeItem('salon_user');
    localStorage.removeItem('salon_accessToken');
    sessionStorage.removeItem('salon_token');
    sessionStorage.removeItem('salon_user');
    sessionStorage.removeItem('salon_accessToken');
    
    // Reset global variables
    currentUser = null;
    authToken = null;
    window.authToken = null;
    window.authCheckInProgress = false;
    
    // Clear any pending timeouts
    if (window.authCheckTimeout) {
        clearTimeout(window.authCheckTimeout);
    }
}

function logout() {
    console.log('Logging out user...');
    
    // Clear authentication data
    clearAuthData();
    
    // Redirect to login with slight delay to ensure cleanup
    setTimeout(() => {
        if (window.location.pathname !== '/login.html') {
            window.location.href = '/login.html';
        }
    }, 50);
}

// Global functions for onclick handlers
window.viewCustomer = (id) => {
    window.location.href = `/customer-detail.html?id=${id}`;
};

window.editCustomer = (id) => {
    window.location.href = `/customer-detail.html?id=${id}&mode=edit`;
};

window.viewSale = (id) => {
    console.log('View sale:', id);
    // TODO: Implement
};

window.showAppointmentDetail = (appointment) => {
    const content = `
        <div class="appointment-detail">
            <div class="form-group">
                <label>顧客名</label>
                <p>${appointment.customer?.lastName || ''} ${appointment.customer?.firstName || ''}</p>
            </div>
            <div class="form-group">
                <label>日時</label>
                <p>${formatDate(appointment.appointmentDate)} ${appointment.startTime} - ${appointment.endTime}</p>
            </div>
            <div class="form-group">
                <label>サービス</label>
                <p>${appointment.services?.map(s => s.name).join(', ') || '-'}</p>
            </div>
            <div class="form-group">
                <label>ステータス</label>
                <p>${getStatusLabel(appointment.status)}</p>
            </div>
            ${appointment.notes ? `
                <div class="form-group">
                    <label>備考</label>
                    <p>${appointment.notes}</p>
                </div>
            ` : ''}
        </div>
    `;
    
    showModal('予約詳細', content);
};

window.getStatusLabel = (status) => {
    const labels = {
        scheduled: '予定',
        confirmed: '確定',
        in_progress: '進行中',
        completed: '完了',
        cancelled: 'キャンセル',
        no_show: '無断キャンセル'
    };
    return labels[status] || status;
};

window.closeModal = closeModal;

// Loading state functions
function showLoadingState() {
    // Show loading indicators if elements exist
    const loadingElements = document.querySelectorAll('.loading-indicator');
    loadingElements.forEach(el => el.style.display = 'block');
    
    // Show loading on stat elements
    const statElements = ['todayAppointments', 'todaySales', 'totalCustomers', 'monthlySales'];
    statElements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = '読み込み中...';
        }
    });
}

function hideLoadingState() {
    // Hide loading indicators
    const loadingElements = document.querySelectorAll('.loading-indicator');
    loadingElements.forEach(el => el.style.display = 'none');
}

// Fallback dashboard function
function showFallbackDashboard(error) {
    console.log('Showing fallback dashboard due to error:', error.message);
    
    // Show basic fallback data
    const updateStat = (id, value) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    };
    
    // Set fallback values
    updateStat('todayAppointments', '---');
    updateStat('todaySales', '---');
    updateStat('totalCustomers', '---');
    updateStat('monthlySales', '---');
    
    // Show error messages in content areas
    const todayScheduleElement = document.getElementById('todaySchedule');
    if (todayScheduleElement) {
        todayScheduleElement.innerHTML = '<p class="error-state">データを読み込めませんでした。しばらくお待ちください。</p>';
    }
    
    const recentCustomersElement = document.getElementById('recentCustomers');
    if (recentCustomersElement) {
        recentCustomersElement.innerHTML = '<p class="error-state">データを読み込めませんでした。しばらくお待ちください。</p>';
    }
}

// Load sales
async function loadSales() {
    try {
        console.log('Loading sales');
        // 売上管理の実装
    } catch (error) {
        console.error('Sales load error:', error);
        showError('売上の読み込みに失敗しました');
    }
}

// Load records
async function loadRecords() {
    try {
        console.log('Loading records');
        // カルテ管理の実装
    } catch (error) {
        console.error('Records load error:', error);
        showError('カルテの読み込みに失敗しました');
    }
}

// Load settings
async function loadSettings() {
    try {
        console.log('Loading settings');
        // 設定機能の実装
    } catch (error) {
        console.error('Settings load error:', error);
        showError('設定の読み込みに失敗しました');
    }
}


// Load services
async function loadServices() {
    try {
        console.log('Loading services');
        // サービス管理の実装
    } catch (error) {
        console.error('Services load error:', error);
        showError('サービスの読み込みに失敗しました');
    }
}

// Load staff
async function loadStaff() {
    try {
        console.log('Loading staff');
        // スタッフ管理の実装
    } catch (error) {
        console.error('Staff load error:', error);
        showError('スタッフの読み込みに失敗しました');
    }
}

// Load messages
async function loadMessages() {
    try {
        console.log('Loading messages page - function called successfully');
        // For now, just show the messages section
        // Later, we can add functionality to load message data
        const messagesContent = document.querySelector('#messages .content-area');
        console.log('Messages content element found:', !!messagesContent);
        if (messagesContent) {
            messagesContent.innerHTML = `
                <div style="text-align: center; padding: 3rem;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 3rem; margin-bottom: 1rem;">💬</div>
                    <h3 style="color: var(--text-dark); margin-bottom: 1rem; font-size: 1.5rem;">統合メッセージング</h3>
                    <p style="color: var(--text-light); margin-bottom: 2rem;">LINE、SMS、メール、Instagramを統合管理</p>
                    <button onclick="window.open('/messages.html', '_blank')" style="background: var(--gradient-2); color: white; border: none; padding: 1rem 2rem; border-radius: 12px; font-weight: 500; cursor: pointer; transition: all 0.3s ease; box-shadow: var(--shadow-md);">
                        メッセージセンターを開く
                    </button>
                </div>
            `;
        }
    } catch (error) {
        console.error('Messages load error:', error);
        showError('メッセージの読み込みに失敗しました');
    }
}

// Load analytics
async function loadAnalytics() {
    try {
        console.log('Loading analytics');
        // 分析・レポート機能の実装
    } catch (error) {
        console.error('Analytics load error:', error);
        showError('分析の読み込みに失敗しました');
    }
}