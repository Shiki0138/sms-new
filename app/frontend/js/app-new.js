// Global variables
let currentUser = null;
let authToken = null;
let calendar = null;
let customerViewMode = 'card'; // 'card' or 'list'
let customersData = [];

// API base URL
const API_BASE = '/api';

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded, initializing app...');
    
    // Immediate page navigation setup
    initializePageNavigation();
    
    // Also set up with delay as backup
    setTimeout(() => {
        console.log('Backup initialization...');
        initializePageNavigation();
    }, 500);
    
    checkAuth();
    setupEventListeners();
});

// Emergency page switching for debugging
window.addEventListener('load', () => {
    console.log('Window fully loaded, setting up emergency functions...');
    
    // Emergency function to force show any page
    window.emergencyShowPage = function(pageId) {
        console.log(`🚨 Emergency showing page: ${pageId}`);
        const page = document.getElementById(pageId);
        if (page) {
            document.querySelectorAll('.page').forEach(p => {
                p.style.display = 'none';
                p.classList.remove('active');
            });
            page.style.display = 'block';
            page.classList.add('active');
            console.log(`🚨 Emergency page ${pageId} forced visible`);
        }
    };
    
    // Make showPage globally available for debugging
    window.showPage = showPage;
});

// Page Navigation for SPA
function initializePageNavigation() {
    console.log('Initializing page navigation...');
    
    // Ensure all pages are hidden first
    document.querySelectorAll('.page').forEach(page => {
        if (!page.classList.contains('active')) {
            page.style.display = 'none';
        }
    });
    
    // Show dashboard by default if no active page
    const activePage = document.querySelector('.page.active');
    if (!activePage) {
        // Use unified navigation path so data loaders run
        navigateToPage('dashboard');
    }
    
    // Setup navigation event listeners with debugging (handles any [data-page])
    const navItems = document.querySelectorAll('[data-page]');
    console.log(`Found ${navItems.length} [data-page] elements`);

    navItems.forEach((item, index) => {
        // Prevent duplicate bindings
        if (item.hasAttribute('data-nav-bound')) return;
        item.setAttribute('data-nav-bound', 'true');

        const page = item.dataset.page?.trim();
        console.log(`Nav item ${index}: ${page}`);

        item.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            if (!page) {
                console.error('No page data found for navigation item');
                return;
            }

            console.log(`Navigation clicked: ${page}`);
            navigateToPage(page);
        });
    });
    
    // Global page switching function for debugging
    window.switchToPage = function(pageId) {
        console.log(`Manual page switch to: ${pageId}`);
        showPage(pageId);
        updateActiveNavItem(pageId);
    };
}

// Show specific page
function showPage(pageId) {
    console.log(`=== SHOWING PAGE: ${pageId} ===`);
    
    try {
        const allPages = document.querySelectorAll('.page');
        console.log(`Found ${allPages.length} total pages`);

        // Find target before mutating state to avoid white screen
        const targetPage = document.getElementById(pageId);
        if (!targetPage) {
            console.error(`❌ Page element not found: ${pageId}`);
            const pageIds = Array.from(allPages).map(p => p.id).filter(id => id);
            console.log('Available page IDs:', pageIds);
            return; // Do not hide current view if target missing
        }

        // Hide all pages and remove active class
        allPages.forEach((page, index) => {
            console.log(`Processing page ${index}: ${page.id}`);
            page.classList.remove('active');
            page.style.display = 'none';
            page.style.visibility = 'hidden';
            page.style.opacity = '0';
        });
        
        console.log(`✅ Found target page: ${pageId}`);
        
        // Force show the page
        targetPage.classList.add('active');
        targetPage.style.display = 'block';
        targetPage.style.visibility = 'visible';
        targetPage.style.opacity = '1';
        
        // Additional force display
        setTimeout(() => {
            targetPage.style.setProperty('display', 'block', 'important');
        }, 10);
        
        // Check content
        const hasContent = targetPage.innerHTML.trim().length > 100;
        console.log(`Page content length: ${targetPage.innerHTML.length}`);
        console.log(`Page has content: ${hasContent}`);
        
        if (!hasContent) {
            console.warn(`⚠️ Page ${pageId} appears to be empty or has minimal content!`);
            console.log('Page HTML snippet:', targetPage.innerHTML.substring(0, 200));
        }
        
        console.log(`🎉 Page ${pageId} should now be visible`);
        
    } catch (error) {
        console.error('Error in showPage function:', error);
    }
}

// Update active navigation item
function updateActiveNavItem(pageId) {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    const activeItem = document.querySelector(`.nav-item[data-page="${pageId}"]`);
    if (activeItem) {
        activeItem.classList.add('active');
    }
}

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
    
    // Development mode: スキップ認証チェックfor debugging
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.log('Development mode: Setting demo authentication');
        authToken = 'demo_token_development_mode';
        currentUser = {
            id: 'demo_user',
            name: '管理者',
            email: 'admin@salon-lumiere.com',
            role: 'admin'
        };
        localStorage.setItem('salon_token', authToken);
        localStorage.setItem('salon_user', JSON.stringify(currentUser));
        console.log('Demo authentication set for development');
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
    
    // Navigation (guarded to avoid duplicate binding; initializePageNavigation binds all [data-page])
    document.querySelectorAll('.nav-item[data-page]').forEach(item => {
        if (item.hasAttribute('data-nav-bound')) return;
        item.setAttribute('data-nav-bound', 'true');
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page?.trim();
            console.log('Navigation item clicked in setupEventListeners:', page);
            if (page) navigateToPage(page);
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
    
    // Message buttons
    document.getElementById('sendMessageBtn')?.addEventListener('click', sendMessage);
    document.getElementById('saveDraftBtn')?.addEventListener('click', saveDraft);
    document.getElementById('createMessageBtn')?.addEventListener('click', () => navigateToPage('messages'));
    document.getElementById('sendBulkBtn')?.addEventListener('click', sendBulkMessage);
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
            console.log('Loading customers page...');
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
        console.log('Loading customers data...');
        
        // Support both legacy and current container IDs
        const container = document.getElementById('customersList') || document.getElementById('customersContainer');
        const loadingElement = document.getElementById('customersLoading');

        if (loadingElement) {
            loadingElement.style.display = 'block';
        }
        
        // APIを使用してデータを取得（認証なしで直接アクセス）
        const response = await fetch('/api/customers');
        const data = await response.json();
        console.log('Customers data received:', data);
        
        const customers = data.customers || [];
        customersData = customers; // グローバルに保存
        window.customersData = customers; // windowオブジェクトにも保存
        
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }
        
        if (!container) {
            console.warn('Customers container element not found');
        } else if (customers.length === 0) {
            container.innerHTML = `
                <div class="text-center py-12">
                    <h3 class="text-xl font-semibold text-gray-500 mb-2">顧客が見つかりません</h3>
                    <p class="text-gray-400 mb-6">新しい顧客を登録してください</p>
                </div>
            `;
            return;
        }
        
        // 顧客リストのレンダリング（美しいカードデザイン）
        const customersHtml = `
            <div class="customers-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(400px, 1fr)); gap: 2rem; padding: 1rem;">
                ${customers.map((customer, index) => `
                    <div class="customer-card" style="
                        background: linear-gradient(135deg, #ffffff 0%, #fafafa 100%);
                        border-radius: 16px;
                        padding: 2rem;
                        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
                        border: 1px solid rgba(212, 165, 116, 0.2);
                        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                        animation: fadeInUp 0.6s ease-out ${index * 0.1}s both;
                        position: relative;
                        overflow: hidden;
                    " onmouseover="this.style.transform='translateY(-8px)'; this.style.boxShadow='0 16px 48px rgba(0, 0, 0, 0.15)'" 
                       onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 8px 32px rgba(0, 0, 0, 0.1)'">
                        
                        <!-- カードの装飾要素 -->
                        <div style="
                            position: absolute;
                            top: -20px;
                            right: -20px;
                            width: 80px;
                            height: 80px;
                            background: linear-gradient(135deg, rgba(212, 165, 116, 0.1), rgba(248, 229, 225, 0.1));
                            border-radius: 50%;
                            pointer-events: none;
                        "></div>
                        
                        <!-- 顧客アバター -->
                        <div class="customer-header" style="display: flex; align-items: center; margin-bottom: 1.5rem;">
                            <div style="
                                width: 64px;
                                height: 64px;
                                background: linear-gradient(135deg, #d4a574, #c49660);
                                border-radius: 50%;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                color: white;
                                font-size: 1.5rem;
                                font-weight: 600;
                                margin-right: 1rem;
                                box-shadow: 0 4px 16px rgba(212, 165, 116, 0.3);
                            ">
                                ${customer.firstName.charAt(0)}${customer.lastName.charAt(0)}
                            </div>
                            <div class="customer-basic-info">
                                <h3 style="
                                    font-size: 1.5rem;
                                    font-weight: 700;
                                    color: #2d3748;
                                    margin: 0 0 0.25rem 0;
                                    font-family: 'Noto Sans JP', sans-serif;
                                ">${customer.lastName} ${customer.firstName} 様</h3>
                                <div style="
                                    display: inline-flex;
                                    align-items: center;
                                    background: linear-gradient(135deg, #48bb78, #38a169);
                                    color: white;
                                    padding: 0.25rem 0.75rem;
                                    border-radius: 20px;
                                    font-size: 0.75rem;
                                    font-weight: 500;
                                ">
                                    <span style="margin-right: 0.25rem;">●</span>
                                    アクティブ
                                </div>
                            </div>
                        </div>
                        
                        <!-- 連絡先情報 -->
                        <div class="customer-contact" style="
                            background: rgba(248, 229, 225, 0.3);
                            border-radius: 12px;
                            padding: 1rem;
                            margin-bottom: 1.5rem;
                        ">
                            <div style="display: flex; align-items: center; margin-bottom: 0.5rem;">
                                <span style="color: #d4a574; margin-right: 0.5rem; font-size: 1rem;">📞</span>
                                <span style="font-weight: 500; color: #2d3748;">${customer.phone}</span>
                            </div>
                            <div style="display: flex; align-items: center;">
                                <span style="color: #d4a574; margin-right: 0.5rem; font-size: 1rem;">✉️</span>
                                <span style="color: #718096; font-size: 0.9rem;">${customer.email}</span>
                            </div>
                        </div>
                        
                        <!-- 統計情報 -->
                        <div class="customer-stats" style="
                            display: grid;
                            grid-template-columns: 1fr 1fr;
                            gap: 1rem;
                            margin-bottom: 1.5rem;
                        ">
                            <div style="
                                background: linear-gradient(135deg, #667eea, #764ba2);
                                color: white;
                                padding: 1rem;
                                border-radius: 12px;
                                text-align: center;
                            ">
                                <div style="font-size: 1.75rem; font-weight: 700; margin-bottom: 0.25rem;">
                                    ${customer.totalVisits}
                                </div>
                                <div style="font-size: 0.75rem; opacity: 0.9;">来店回数</div>
                            </div>
                            <div style="
                                background: linear-gradient(135deg, #f093fb, #f5576c);
                                color: white;
                                padding: 1rem;
                                border-radius: 12px;
                                text-align: center;
                            ">
                                <div style="font-size: 0.9rem; font-weight: 600; margin-bottom: 0.25rem;">
                                    ${customer.lastVisit || '未来店'}
                                </div>
                                <div style="font-size: 0.75rem; opacity: 0.9;">最終来店日</div>
                            </div>
                        </div>
                        
                        <!-- アクションボタン -->
                        <div class="customer-actions" style="
                            display: flex;
                            gap: 0.75rem;
                            justify-content: space-between;
                        ">
                            <button onclick="viewCustomer('${customer.id}')" style="
                                flex: 1;
                                padding: 0.75rem 1rem;
                                background: linear-gradient(135deg, #e2e8f0, #cbd5e0);
                                color: #2d3748;
                                border: none;
                                border-radius: 8px;
                                font-weight: 500;
                                cursor: pointer;
                                transition: all 0.2s;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                gap: 0.5rem;
                            " onmouseover="this.style.background='linear-gradient(135deg, #cbd5e0, #a0aec0)'" 
                               onmouseout="this.style.background='linear-gradient(135deg, #e2e8f0, #cbd5e0)'">
                                <span>👁️</span>
                                詳細
                            </button>
                            <button onclick="editCustomer('${customer.id}')" style="
                                flex: 1;
                                padding: 0.75rem 1rem;
                                background: linear-gradient(135deg, #d4a574, #c49660);
                                color: white;
                                border: none;
                                border-radius: 8px;
                                font-weight: 500;
                                cursor: pointer;
                                transition: all 0.2s;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                gap: 0.5rem;
                                box-shadow: 0 4px 12px rgba(212, 165, 116, 0.3);
                            " onmouseover="this.style.background='linear-gradient(135deg, #c49660, #b8854c)'; this.style.transform='translateY(-2px)'" 
                               onmouseout="this.style.background='linear-gradient(135deg, #d4a574, #c49660)'; this.style.transform='translateY(0)'">
                                <span>✏️</span>
                                編集
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <style>
                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(30px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                .customer-card:hover {
                    border-color: rgba(212, 165, 116, 0.4) !important;
                }
            </style>
        `;
        
        // 現在の表示モードに応じてレンダリング
        renderCustomers(customers);
        
    } catch (error) {
        console.error('Load customers error:', error);
        const container = document.getElementById('customersContainer');
        const loadingElement = document.getElementById('customersLoading');
        
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }
        
        container.innerHTML = `
            <div class="text-center py-12">
                <h3 class="text-xl font-semibold text-red-600 mb-2">データの読み込みに失敗しました</h3>
                <p class="text-gray-500 mb-6">${error.message}</p>
                <button onclick="loadCustomers()" class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                    再試行
                </button>
            </div>
        `;
    }
}

// 表示切り替え機能
function switchCustomerView(mode) {
    console.log('Switching customer view to:', mode);
    customerViewMode = mode;
    
    // ボタンの状態更新
    const cardViewBtn = document.getElementById('cardViewBtn');
    const listViewBtn = document.getElementById('listViewBtn');
    
    if (mode === 'card') {
        cardViewBtn.style.background = '#d4a574';
        cardViewBtn.style.color = 'white';
        listViewBtn.style.background = 'transparent';
        listViewBtn.style.color = '#d4a574';
    } else {
        listViewBtn.style.background = '#d4a574';
        listViewBtn.style.color = 'white';
        cardViewBtn.style.background = 'transparent';
        cardViewBtn.style.color = '#d4a574';
    }
    
    // 顧客データを再レンダリング
    if (customersData && customersData.length > 0) {
        renderCustomers(customersData);
    } else {
        console.log('No customers data available, reloading...');
        loadCustomers();
    }
}

// 顧客データのレンダリング関数
function renderCustomers(customers) {
    const container = document.getElementById('customersContainer');
    
    if (!customers || customers.length === 0) {
        container.innerHTML = `
            <div class="text-center py-12">
                <h3 class="text-xl font-semibold text-gray-500 mb-2">顧客が見つかりません</h3>
                <p class="text-gray-400 mb-6">新しい顧客を登録してください</p>
            </div>
        `;
        return;
    }
    
    let customersHtml;
    
    if (customerViewMode === 'list') {
        // リスト表示
        customersHtml = `
            <div class="customers-table" style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead style="background: linear-gradient(135deg, #d4a574, #c49660); color: white;">
                        <tr>
                            <th style="padding: 1rem; text-align: left; font-weight: 600;">顧客名</th>
                            <th style="padding: 1rem; text-align: left; font-weight: 600;">連絡先</th>
                            <th style="padding: 1rem; text-align: center; font-weight: 600;">来店回数</th>
                            <th style="padding: 1rem; text-align: center; font-weight: 600;">最終来店</th>
                            <th style="padding: 1rem; text-align: center; font-weight: 600;">ステータス</th>
                            <th style="padding: 1rem; text-align: center; font-weight: 600;">アクション</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${customers.map((customer, index) => `
                            <tr style="border-bottom: 1px solid #e2e8f0; transition: background 0.2s;" 
                                onmouseover="this.style.background='#f8f9fa'" 
                                onmouseout="this.style.background='white'">
                                <td style="padding: 1rem;">
                                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                                        <div style="
                                            width: 40px;
                                            height: 40px;
                                            background: linear-gradient(135deg, #d4a574, #c49660);
                                            border-radius: 50%;
                                            display: flex;
                                            align-items: center;
                                            justify-content: center;
                                            color: white;
                                            font-weight: 600;
                                        ">
                                            ${customer.firstName.charAt(0)}${customer.lastName.charAt(0)}
                                        </div>
                                        <div>
                                            <div style="font-weight: 600; color: #2d3748;">${customer.lastName} ${customer.firstName} 様</div>
                                        </div>
                                    </div>
                                </td>
                                <td style="padding: 1rem;">
                                    <div style="color: #4a5568;">📞 ${customer.phone}</div>
                                    <div style="color: #718096; font-size: 0.9rem;">✉️ ${customer.email}</div>
                                </td>
                                <td style="padding: 1rem; text-align: center;">
                                    <span style="
                                        display: inline-block;
                                        padding: 0.25rem 0.75rem;
                                        background: linear-gradient(135deg, #667eea, #764ba2);
                                        color: white;
                                        border-radius: 20px;
                                        font-weight: 600;
                                        font-size: 0.9rem;
                                    ">${customer.totalVisits}回</span>
                                </td>
                                <td style="padding: 1rem; text-align: center;">
                                    <div style="color: #4a5568; font-weight: 500;">${customer.lastVisit || '未来店'}</div>
                                </td>
                                <td style="padding: 1rem; text-align: center;">
                                    <span style="
                                        display: inline-flex;
                                        align-items: center;
                                        background: linear-gradient(135deg, #48bb78, #38a169);
                                        color: white;
                                        padding: 0.25rem 0.75rem;
                                        border-radius: 20px;
                                        font-size: 0.75rem;
                                        font-weight: 500;
                                    ">
                                        <span style="margin-right: 0.25rem;">●</span>
                                        アクティブ
                                    </span>
                                </td>
                                <td style="padding: 1rem; text-align: center;">
                                    <div style="display: flex; gap: 0.5rem; justify-content: center;">
                                        <button onclick="viewCustomer('${customer.id}')" style="
                                            padding: 0.5rem 0.75rem;
                                            background: #e2e8f0;
                                            color: #2d3748;
                                            border: none;
                                            border-radius: 6px;
                                            font-size: 0.85rem;
                                            font-weight: 500;
                                            cursor: pointer;
                                            transition: all 0.2s;
                                        " onmouseover="this.style.background='#cbd5e0'" 
                                           onmouseout="this.style.background='#e2e8f0'">
                                            👁️ 詳細
                                        </button>
                                        <button onclick="editCustomer('${customer.id}')" style="
                                            padding: 0.5rem 0.75rem;
                                            background: #d4a574;
                                            color: white;
                                            border: none;
                                            border-radius: 6px;
                                            font-size: 0.85rem;
                                            font-weight: 500;
                                            cursor: pointer;
                                            transition: all 0.2s;
                                        " onmouseover="this.style.background='#c49660'" 
                                           onmouseout="this.style.background='#d4a574'">
                                            ✏️ 編集
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } else {
        // カード表示（既存のコード）
        customersHtml = `
            <div class="customers-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(400px, 1fr)); gap: 2rem; padding: 1rem;">
                ${customers.map((customer, index) => `
                    <div class="customer-card" style="
                        background: linear-gradient(135deg, #ffffff 0%, #fafafa 100%);
                        border-radius: 16px;
                        padding: 2rem;
                        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
                        border: 1px solid rgba(212, 165, 116, 0.2);
                        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                        animation: fadeInUp 0.6s ease-out ${index * 0.1}s both;
                        position: relative;
                        overflow: hidden;
                    " onmouseover="this.style.transform='translateY(-8px)'; this.style.boxShadow='0 16px 48px rgba(0, 0, 0, 0.15)'" 
                       onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 8px 32px rgba(0, 0, 0, 0.1)'">
                        
                        <!-- カードの装飾要素 -->
                        <div style="
                            position: absolute;
                            top: -20px;
                            right: -20px;
                            width: 80px;
                            height: 80px;
                            background: linear-gradient(135deg, rgba(212, 165, 116, 0.1), rgba(248, 229, 225, 0.1));
                            border-radius: 50%;
                            pointer-events: none;
                        "></div>
                        
                        <!-- 顧客アバター -->
                        <div class="customer-header" style="display: flex; align-items: center; margin-bottom: 1.5rem;">
                            <div style="
                                width: 64px;
                                height: 64px;
                                background: linear-gradient(135deg, #d4a574, #c49660);
                                border-radius: 50%;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                color: white;
                                font-size: 1.5rem;
                                font-weight: 600;
                                margin-right: 1rem;
                                box-shadow: 0 4px 16px rgba(212, 165, 116, 0.3);
                            ">
                                ${customer.firstName.charAt(0)}${customer.lastName.charAt(0)}
                            </div>
                            <div class="customer-basic-info">
                                <h3 style="
                                    font-size: 1.5rem;
                                    font-weight: 700;
                                    color: #2d3748;
                                    margin: 0 0 0.25rem 0;
                                    font-family: 'Noto Sans JP', sans-serif;
                                ">${customer.lastName} ${customer.firstName} 様</h3>
                                <div style="
                                    display: inline-flex;
                                    align-items: center;
                                    background: linear-gradient(135deg, #48bb78, #38a169);
                                    color: white;
                                    padding: 0.25rem 0.75rem;
                                    border-radius: 20px;
                                    font-size: 0.75rem;
                                    font-weight: 500;
                                ">
                                    <span style="margin-right: 0.25rem;">●</span>
                                    アクティブ
                                </div>
                            </div>
                        </div>
                        
                        <!-- 連絡先情報 -->
                        <div class="customer-contact" style="
                            background: rgba(248, 229, 225, 0.3);
                            border-radius: 12px;
                            padding: 1rem;
                            margin-bottom: 1.5rem;
                        ">
                            <div style="display: flex; align-items: center; margin-bottom: 0.5rem;">
                                <span style="color: #d4a574; margin-right: 0.5rem; font-size: 1rem;">📞</span>
                                <span style="font-weight: 500; color: #2d3748;">${customer.phone}</span>
                            </div>
                            <div style="display: flex; align-items: center;">
                                <span style="color: #d4a574; margin-right: 0.5rem; font-size: 1rem;">✉️</span>
                                <span style="color: #718096; font-size: 0.9rem;">${customer.email}</span>
                            </div>
                        </div>
                        
                        <!-- 統計情報 -->
                        <div class="customer-stats" style="
                            display: grid;
                            grid-template-columns: 1fr 1fr;
                            gap: 1rem;
                            margin-bottom: 1.5rem;
                        ">
                            <div style="
                                background: linear-gradient(135deg, #667eea, #764ba2);
                                color: white;
                                padding: 1rem;
                                border-radius: 12px;
                                text-align: center;
                            ">
                                <div style="font-size: 1.75rem; font-weight: 700; margin-bottom: 0.25rem;">
                                    ${customer.totalVisits}
                                </div>
                                <div style="font-size: 0.75rem; opacity: 0.9;">来店回数</div>
                            </div>
                            <div style="
                                background: linear-gradient(135deg, #f093fb, #f5576c);
                                color: white;
                                padding: 1rem;
                                border-radius: 12px;
                                text-align: center;
                            ">
                                <div style="font-size: 0.9rem; font-weight: 600; margin-bottom: 0.25rem;">
                                    ${customer.lastVisit || '未来店'}
                                </div>
                                <div style="font-size: 0.75rem; opacity: 0.9;">最終来店日</div>
                            </div>
                        </div>
                        
                        <!-- アクションボタン -->
                        <div class="customer-actions" style="
                            display: flex;
                            gap: 0.75rem;
                            justify-content: space-between;
                        ">
                            <button onclick="viewCustomer('${customer.id}')" style="
                                flex: 1;
                                padding: 0.75rem 1rem;
                                background: linear-gradient(135deg, #e2e8f0, #cbd5e0);
                                color: #2d3748;
                                border: none;
                                border-radius: 8px;
                                font-weight: 500;
                                cursor: pointer;
                                transition: all 0.2s;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                gap: 0.5rem;
                            " onmouseover="this.style.background='linear-gradient(135deg, #cbd5e0, #a0aec0)'" 
                               onmouseout="this.style.background='linear-gradient(135deg, #e2e8f0, #cbd5e0)'">
                                <span>👁️</span>
                                詳細
                            </button>
                            <button onclick="editCustomer('${customer.id}')" style="
                                flex: 1;
                                padding: 0.75rem 1rem;
                                background: linear-gradient(135deg, #d4a574, #c49660);
                                color: white;
                                border: none;
                                border-radius: 8px;
                                font-weight: 500;
                                cursor: pointer;
                                transition: all 0.2s;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                gap: 0.5rem;
                                box-shadow: 0 4px 12px rgba(212, 165, 116, 0.3);
                            " onmouseover="this.style.background='linear-gradient(135deg, #c49660, #b8854c)'; this.style.transform='translateY(-2px)'" 
                               onmouseout="this.style.background='linear-gradient(135deg, #d4a574, #c49660)'; this.style.transform='translateY(0)'">
                                <span>✏️</span>
                                編集
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <style>
                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(30px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                .customer-card:hover {
                    border-color: rgba(212, 165, 116, 0.4) !important;
                }
            </style>
        `;
    }
    
    if (container) {
        container.innerHTML = customersHtml;
    }
}

// グローバル関数として公開
window.switchCustomerView = switchCustomerView;
window.renderCustomers = renderCustomers;
window.loadCustomers = loadCustomers;
window.customersData = customersData;

// Load appointments
async function loadAppointments() {
    try {
        console.log('Loading appointments page...');
        
        // Initialize calendar if not already initialized
        const calendarContainer = document.getElementById('appointmentCalendar');
        if (calendarContainer && !calendar && window.AppointmentCalendar) {
            console.log('Initializing appointment calendar...');
            
            calendar = new AppointmentCalendar('appointmentCalendar', {
                view: 'month',
                onDateClick: (date) => {
                    console.log('Calendar date clicked:', date);
                    showAddAppointmentModal(date);
                },
                onAppointmentClick: (appointment) => {
                    console.log('Appointment clicked:', appointment);
                    showAppointmentDetail(appointment);
                }
            });
            
            // Make calendar globally accessible
            window.calendar = calendar;
            console.log('Calendar initialized successfully');
        } else if (calendar) {
            // Refresh existing calendar
            console.log('Refreshing existing calendar...');
            calendar.loadAppointments();
        } else if (!calendarContainer) {
            console.warn('Calendar container not found in DOM');
        } else if (!window.AppointmentCalendar) {
            console.error('AppointmentCalendar class not available - check if calendar.js is loaded');
        }
    } catch (error) {
        console.error('Appointments load error:', error);
        showError('予約カレンダーの読み込みに失敗しました: ' + error.message);
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
        
        // Handle different response structures
        const setting = data.setting || data;
        
        if (!setting) {
            throw new Error('設定データが見つかりません');
        }
        
        // Update profile form only if elements exist
        const settingsName = document.getElementById('settingsName');
        const settingsSalonName = document.getElementById('settingsSalonName');
        const settingsPhone = document.getElementById('settingsPhone');
        
        if (settingsName && currentUser.name) settingsName.value = currentUser.name;
        if (settingsSalonName && currentUser.salonName) settingsSalonName.value = currentUser.salonName;
        if (settingsPhone && currentUser.phoneNumber) settingsPhone.value = currentUser.phoneNumber;
        
        // Update plan info only if elements exist
        const currentPlan = document.getElementById('currentPlan');
        const trialEnd = document.getElementById('trialEnd');
        
        if (currentPlan && currentUser.planType) {
            currentPlan.textContent = getPlanName(currentUser.planType);
        }
        if (trialEnd && currentUser.trialEndsAt) {
            trialEnd.textContent = formatDate(currentUser.trialEndsAt);
        }
        
        // Update business hours
        updateBusinessHoursUI(setting.businessHours);
        
        // Update holidays
        updateHolidaysUI(setting.holidays || [], setting.temporaryClosures || []);
    } catch (error) {
        console.error('Settings load error:', error);
        showError('設定の読み込みに失敗しました: ' + error.message);
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

window.viewCustomerDetail = (id) => {
    console.log('Viewing customer detail:', id);
    navigateToPage('customers');
    // Show customer detail in the same page
    showCustomerDetailModal(id);
};

window.viewCustomerRecords = (id) => {
    console.log('Viewing customer records:', id);
    // Navigate to records page with customer filter
    navigateToPage('records');
    // Filter records by customer
    filterRecordsByCustomer(id);
};

window.bookAppointment = (id) => {
    console.log('Booking appointment for customer:', id);
    showAddAppointmentModalForCustomer(id);
};

window.sendReturnMessage = (id) => {
    console.log('Sending return message to customer:', id);
    showReturnMessageModal(id);
};

window.viewSale = (id) => {
    console.log('View sale:', id);
    // TODO: Implement
};

// Calendar refresh function
window.refreshCalendar = () => {
    console.log('Refreshing calendar...');
    if (window.calendar) {
        window.calendar.loadAppointments();
        showSuccess('カレンダーを更新しました');
    } else {
        console.warn('Calendar not initialized');
        // Try to load appointments page again
        loadAppointments();
    }
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
        
        // Setup settings navigation tabs
        setupSettingsNavigation();
        
        // Load current settings data
        await loadSettingsData();
        
        console.log('Settings loaded successfully');
    } catch (error) {
        console.error('Settings load error:', error);
        showError('設定の読み込みに失敗しました');
    }
}

// Setup settings navigation
function setupSettingsNavigation() {
    const navItems = document.querySelectorAll('.settings-nav-item');
    const tabContents = document.querySelectorAll('.settings-tab');
    
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            // Remove active class from all nav items and tabs
            navItems.forEach(nav => nav.classList.remove('active'));
            tabContents.forEach(tab => tab.classList.remove('active'));
            
            // Add active class to clicked nav item
            item.classList.add('active');
            
            // Show corresponding tab content
            const tabName = item.getAttribute('data-tab');
            const tabContent = document.getElementById(`${tabName}-tab`);
            if (tabContent) {
                tabContent.classList.add('active');
            }
        });
    });
}

// Load settings data
async function loadSettingsData() {
    try {
        // In a real implementation, this would fetch from API
        // For now, use the existing static content and add some functionality
        
        // Setup form handlers
        setupSettingsFormHandlers();
        
        console.log('Settings data loaded');
    } catch (error) {
        console.error('Settings data load error:', error);
    }
}

// Setup settings form handlers
function setupSettingsFormHandlers() {
    // General settings form
    const generalForm = document.querySelector('#general-tab form');
    if (generalForm) {
        generalForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await saveGeneralSettings(new FormData(generalForm));
        });
    }
    
    // Business hours form
    const businessHoursForm = document.querySelector('#business-hours-tab form');
    if (businessHoursForm) {
        businessHoursForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await saveBusinessHours(new FormData(businessHoursForm));
        });
    }
    
    // Setup day toggle checkboxes
    const dayCheckboxes = document.querySelectorAll('input[type="checkbox"][name$="_isOpen"]');
    dayCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const dayContainer = e.target.closest('.hours-item');
            const timeInputs = dayContainer.querySelectorAll('input[type="time"]');
            
            timeInputs.forEach(input => {
                input.disabled = !e.target.checked;
                if (e.target.checked) {
                    input.parentElement.style.opacity = '1';
                } else {
                    input.parentElement.style.opacity = '0.5';
                }
            });
        });
    });
}

// Save general settings
async function saveGeneralSettings(formData) {
    try {
        const data = Object.fromEntries(formData);
        
        await apiRequest('/settings/general', {
            method: 'PUT',
            body: JSON.stringify(data)
        });
        
        showSuccess('基本設定を保存しました');
    } catch (error) {
        showError('設定の保存に失敗しました: ' + error.message);
    }
}

// Save business hours
async function saveBusinessHours(formData) {
    try {
        const businessHours = {};
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        
        days.forEach(day => {
            businessHours[day] = {
                isOpen: formData.get(`${day}_isOpen`) === 'on',
                openTime: formData.get(`${day}_open`) || '09:00',
                closeTime: formData.get(`${day}_close`) || '19:00'
            };
        });
        
        await apiRequest('/settings/business-hours', {
            method: 'PUT',
            body: JSON.stringify({ businessHours })
        });
        
        showSuccess('営業時間を保存しました');
    } catch (error) {
        showError('営業時間の保存に失敗しました: ' + error.message);
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
        
        // Set up message tab functionality
        setupMessageTabs();
        
        // Load recent message history
        loadMessageHistory();
        
        // Set up character count for message composition
        setupMessageCharacterCount();
        
        console.log('Messages page loaded successfully');
    } catch (error) {
        console.error('Messages load error:', error);
        showError('メッセージの読み込みに失敗しました');
    }
}

// Setup message tabs functionality
function setupMessageTabs() {
    const tabs = document.querySelectorAll('.message-tab');
    const contents = document.querySelectorAll('.message-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs and contents
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked tab
            tab.classList.add('active');
            
            // Show corresponding content
            const tabName = tab.getAttribute('data-tab');
            const content = document.getElementById(`${tabName}-tab`);
            if (content) {
                content.classList.add('active');
            }
        });
    });
    
    // Setup send timing radio buttons
    const timingRadios = document.querySelectorAll('input[name="sendTiming"]');
    const scheduleInput = document.querySelector('.schedule-input');
    
    timingRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            if (radio.value === 'schedule') {
                scheduleInput.style.display = 'block';
            } else {
                scheduleInput.style.display = 'none';
            }
        });
    });
}

// Load message history
async function loadMessageHistory() {
    try {
        // This would normally fetch from API
        // For now, the static HTML content in dashboard.html is sufficient
        console.log('Message history loaded from static content');
    } catch (error) {
        console.error('Error loading message history:', error);
    }
}

// Setup message character count
function setupMessageCharacterCount() {
    const messageTextarea = document.getElementById('messageContent');
    const charCount = document.getElementById('charCount');
    const previewContent = document.getElementById('previewContent');
    
    if (messageTextarea && charCount) {
        messageTextarea.addEventListener('input', () => {
            const length = messageTextarea.value.length;
            charCount.textContent = length;
            charCount.style.color = length > 160 ? 'red' : 'inherit';
            
            // Update preview
            if (previewContent) {
                previewContent.textContent = messageTextarea.value || 'メッセージを入力するとプレビューが表示されます';
            }
        });
    }
    
    // Setup template selection
    const templateSelect = document.getElementById('messageTemplate');
    if (templateSelect) {
        templateSelect.addEventListener('change', () => {
            const templates = {
                reminder: '{customer_name}様、明日の予約のご確認です。{date} {time}〜{service}でお待ちしております。変更がございましたらお気軽にご連絡ください。',
                thanks: '{customer_name}様、本日はご来店ありがとうございました。{service}の仕上がりはいかがでしょうか？何かご質問がございましたらお気軽にご連絡ください。',
                followup: '{customer_name}様、前回の{service}から{days}日が経ちました。お手入れの調子はいかがでしょうか？ご不明な点がございましたらお気軽にご連絡ください。',
                promotion: '{customer_name}様、{month}月限定キャンペーンのご案内です。{service}が特別価格でご利用いただけます。この機会にぜひご来店ください。'
            };
            
            const selectedTemplate = templates[templateSelect.value];
            if (selectedTemplate && messageTextarea) {
                messageTextarea.value = selectedTemplate;
                messageTextarea.dispatchEvent(new Event('input'));
            }
        });
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

// Customer detail modal
function showCustomerDetailModal(customerId) {
    console.log('Showing customer detail modal for ID:', customerId);
    
    // For now, show a placeholder modal
    const content = `
        <div class="customer-detail-modal">
            <div class="customer-info-section">
                <h3>顧客詳細情報</h3>
                <div class="loading-message">顧客情報を読み込み中...</div>
            </div>
            <div class="customer-actions">
                <button class="btn btn-primary" onclick="viewCustomerRecords('${customerId}')">カルテ履歴を表示</button>
                <button class="btn btn-secondary" onclick="bookAppointment('${customerId}')">新規予約</button>
                <button class="btn btn-secondary" onclick="editCustomer('${customerId}')">編集</button>
            </div>
        </div>
    `;
    
    showModal('顧客詳細', content);
    
    // Load actual customer data
    loadCustomerDetailData(customerId);
}

// Load customer detail data
async function loadCustomerDetailData(customerId) {
    try {
        const data = await apiRequest(`/customers/${customerId}`);
        const customer = data.customer;
        
        // Update modal content with real data
        const modalBody = document.getElementById('modalBody');
        if (modalBody) {
            modalBody.innerHTML = `
                <div class="customer-detail-modal">
                    <div class="customer-info-section">
                        <h3>顧客詳細情報</h3>
                        <div class="customer-basic-info">
                            <div class="info-group">
                                <label>氏名:</label>
                                <span>${customer.lastName} ${customer.firstName}</span>
                            </div>
                            <div class="info-group">
                                <label>フリガナ:</label>
                                <span>${customer.lastNameKana || ''} ${customer.firstNameKana || ''}</span>
                            </div>
                            <div class="info-group">
                                <label>電話番号:</label>
                                <span>${customer.phoneNumber}</span>
                            </div>
                            <div class="info-group">
                                <label>メールアドレス:</label>
                                <span>${customer.email || '未登録'}</span>
                            </div>
                            <div class="info-group">
                                <label>最終来店日:</label>
                                <span>${customer.lastVisitDate ? formatDate(customer.lastVisitDate) : '来店履歴なし'}</span>
                            </div>
                            <div class="info-group">
                                <label>来店回数:</label>
                                <span>${customer.visitCount || 0}回</span>
                            </div>
                            <div class="info-group">
                                <label>累計金額:</label>
                                <span>¥${customer.totalAmount ? customer.totalAmount.toLocaleString() : '0'}</span>
                            </div>
                        </div>
                    </div>
                    <div class="customer-actions">
                        <button class="btn btn-primary" onclick="viewCustomerRecords('${customerId}')">カルテ履歴を表示</button>
                        <button class="btn btn-secondary" onclick="bookAppointment('${customerId}')">新規予約</button>
                        <button class="btn btn-secondary" onclick="editCustomer('${customerId}')">編集</button>
                    </div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Customer detail load error:', error);
        const modalBody = document.getElementById('modalBody');
        if (modalBody) {
            modalBody.innerHTML = `
                <div class="error-message">
                    <p>顧客情報の読み込みに失敗しました: ${error.message}</p>
                    <button class="btn btn-primary" onclick="closeModal()">閉じる</button>
                </div>
            `;
        }
    }
}

// Filter records by customer
function filterRecordsByCustomer(customerId) {
    console.log('Filtering records for customer:', customerId);
    
    // Hide other customer records and show only the selected customer's records
    const recordCards = document.querySelectorAll('.record-card');
    recordCards.forEach(card => {
        const recordCustomerId = card.getAttribute('data-customer-id');
        if (recordCustomerId && recordCustomerId !== customerId.toString()) {
            card.style.display = 'none';
        } else {
            card.style.display = 'block';
        }
    });
    
    // Update page title to indicate filtering
    const pageTitle = document.querySelector('#records .page-title');
    if (pageTitle) {
        pageTitle.textContent = 'カルテ管理 (顧客でフィルタ中)';
    }
    
    // Add a notice
    const contentArea = document.querySelector('#records .content-area');
    if (contentArea) {
        const existingNotice = contentArea.querySelector('.filter-notice');
        if (!existingNotice) {
            const notice = document.createElement('div');
            notice.className = 'filter-notice';
            notice.innerHTML = `
                <div style="background: #e3f2fd; border: 1px solid #2196f3; padding: 1rem; margin-bottom: 1rem; border-radius: 8px;">
                    <span>特定の顧客のカルテのみ表示中</span>
                    <button onclick="clearRecordFilter()" style="margin-left: 1rem; padding: 0.25rem 0.5rem; border: none; background: #2196f3; color: white; border-radius: 4px; cursor: pointer;">フィルタを解除</button>
                </div>
            `;
            contentArea.insertBefore(notice, contentArea.firstChild);
        }
    }
}

// Clear record filter
window.clearRecordFilter = function() {
    const recordCards = document.querySelectorAll('.record-card');
    recordCards.forEach(card => {
        card.style.display = 'block';
    });
    
    const pageTitle = document.querySelector('#records .page-title');
    if (pageTitle) {
        pageTitle.textContent = 'カルテ管理';
    }
    
    const notice = document.querySelector('.filter-notice');
    if (notice) {
        notice.remove();
    }
};

// Show add appointment modal for specific customer
function showAddAppointmentModalForCustomer(customerId) {
    console.log('Showing appointment modal for customer:', customerId);
    
    const selectedDate = new Date().toISOString().split('T')[0];
    const selectedTime = '10:00';
    
    const content = `
        <form id="appointmentForm">
            <div class="form-group">
                <label>顧客</label>
                <select name="customerId" id="appointmentCustomer" required disabled>
                    <option value="${customerId}">選択された顧客</option>
                </select>
                <input type="hidden" name="customerId" value="${customerId}">
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
                <input type="time" name="endTime" value="11:00" required>
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
    
    // Load customer info and populate the form
    loadCustomerForAppointment(customerId);
    
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
            customerId: customerId, // Use the passed customer ID
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

// Load customer info for appointment
async function loadCustomerForAppointment(customerId) {
    try {
        const data = await apiRequest(`/customers/${customerId}`);
        const customer = data.customer;
        
        const select = document.getElementById('appointmentCustomer');
        if (select) {
            select.innerHTML = `<option value="${customerId}">${customer.lastName} ${customer.firstName}</option>`;
        }
    } catch (error) {
        console.error('Load customer for appointment error:', error);
    }
}

// Show return message modal
function showReturnMessageModal(customerId) {
    console.log('Showing return message modal for customer:', customerId);
    
    const content = `
        <div class="return-message-modal">
            <div class="form-group">
                <label>メッセージテンプレート</label>
                <select id="returnMessageTemplate" class="form-control" onchange="updateReturnMessageContent()">
                    <option value="">テンプレートを選択...</option>
                    <option value="general">一般的な復帰促進</option>
                    <option value="special_offer">特別オファー</option>
                    <option value="season">季節のご案内</option>
                </select>
            </div>
            <div class="form-group">
                <label>メッセージ内容</label>
                <textarea id="returnMessageContent" class="form-control" rows="4" placeholder="復帰促進メッセージを入力してください..."></textarea>
                <div class="character-count">
                    <span id="returnCharCount">0</span>/160文字
                </div>
            </div>
            <div class="message-preview">
                <h4>プレビュー</h4>
                <div class="preview-phone">
                    <div class="preview-header">Salon Lumière</div>
                    <div class="preview-content" id="returnPreviewContent">
                        メッセージを入力するとプレビューが表示されます
                    </div>
                </div>
            </div>
            <div class="modal-actions">
                <button class="btn btn-secondary" onclick="closeModal()">キャンセル</button>
                <button class="btn btn-primary" onclick="sendReturnMessageToCustomer('${customerId}')">送信</button>
            </div>
        </div>
    `;
    
    showModal('復帰促進メッセージ', content);
    
    // Add event listeners for real-time updates
    const textarea = document.getElementById('returnMessageContent');
    if (textarea) {
        textarea.addEventListener('input', updateReturnMessagePreview);
    }
}

// Update return message content based on template
window.updateReturnMessageContent = function() {
    const template = document.getElementById('returnMessageTemplate').value;
    const textarea = document.getElementById('returnMessageContent');
    
    const templates = {
        general: 'お久しぶりです！最近いかがお過ごしでしょうか？髪のお手入れはいかがですか？ご都合の良い時にぜひお越しください。',
        special_offer: 'ご無沙汰しております！今月限定で前回ご利用いただいたサービスを10%オフでご提供いたします。ぜひこの機会にご来店ください。',
        season: '季節の変わり目ですが、お元気でお過ごしでしょうか？この時期は髪のダメージが気になりませんか？お気軽にご相談ください。'
    };
    
    if (template && templates[template]) {
        textarea.value = templates[template];
        updateReturnMessagePreview();
    }
};

// Update return message preview
function updateReturnMessagePreview() {
    const content = document.getElementById('returnMessageContent').value;
    const charCount = document.getElementById('returnCharCount');
    const preview = document.getElementById('returnPreviewContent');
    
    if (charCount) {
        charCount.textContent = content.length;
        charCount.style.color = content.length > 160 ? 'red' : 'inherit';
    }
    
    if (preview) {
        preview.textContent = content || 'メッセージを入力するとプレビューが表示されます';
    }
}

// Send return message to customer
window.sendReturnMessageToCustomer = async function(customerId) {
    const content = document.getElementById('returnMessageContent').value;
    
    if (!content.trim()) {
        showError('メッセージを入力してください');
        return;
    }
    
    if (content.length > 160) {
        showError('メッセージは160文字以内で入力してください');
        return;
    }
    
    try {
        await apiRequest('/messages/send', {
            method: 'POST',
            body: JSON.stringify({
                customerId: customerId,
                content: content,
                type: 'return_promotion'
            })
        });
        
        closeModal();
        showSuccess('復帰促進メッセージを送信しました');
    } catch (error) {
        showError('メッセージの送信に失敗しました: ' + error.message);
    }
};

// Send message function
async function sendMessage() {
    const customerId = document.getElementById('customerSelect')?.value;
    const content = document.getElementById('messageContent')?.value;
    const sendTiming = document.querySelector('input[name="sendTiming"]:checked')?.value;
    const scheduleTime = document.getElementById('scheduleTime')?.value;
    
    if (!customerId) {
        showError('送信先を選択してください');
        return;
    }
    
    if (!content || !content.trim()) {
        showError('メッセージ内容を入力してください');
        return;
    }
    
    if (content.length > 160) {
        showError('メッセージは160文字以内で入力してください');
        return;
    }
    
    if (sendTiming === 'schedule' && !scheduleTime) {
        showError('送信日時を設定してください');
        return;
    }
    
    try {
        const messageData = {
            customerId: customerId,
            content: content.trim(),
            type: 'manual',
            sendTiming: sendTiming
        };
        
        if (sendTiming === 'schedule') {
            messageData.scheduledAt = scheduleTime;
        }
        
        await apiRequest('/messages/send', {
            method: 'POST',
            body: JSON.stringify(messageData)
        });
        
        // Clear form
        document.getElementById('customerSelect').value = '';
        document.getElementById('messageContent').value = '';
        document.getElementById('messageTemplate').value = '';
        document.getElementById('charCount').textContent = '0';
        document.getElementById('previewContent').textContent = 'メッセージを入力するとプレビューが表示されます';
        
        if (sendTiming === 'schedule') {
            showSuccess('メッセージを予約送信しました');
        } else {
            showSuccess('メッセージを送信しました');
        }
        
        // Refresh message history
        loadMessageHistory();
    } catch (error) {
        showError('メッセージの送信に失敗しました: ' + error.message);
    }
}

// Save draft function
async function saveDraft() {
    const customerId = document.getElementById('customerSelect')?.value;
    const content = document.getElementById('messageContent')?.value;
    
    if (!content || !content.trim()) {
        showError('保存するメッセージ内容を入力してください');
        return;
    }
    
    try {
        await apiRequest('/messages/draft', {
            method: 'POST',
            body: JSON.stringify({
                customerId: customerId || null,
                content: content.trim(),
                type: 'draft'
            })
        });
        
        showSuccess('下書きを保存しました');
    } catch (error) {
        showError('下書きの保存に失敗しました: ' + error.message);
    }
}

// Send bulk message function
async function sendBulkMessage() {
    const content = document.getElementById('bulkMessageContent')?.value;
    const selectedCount = document.getElementById('selectedCount')?.textContent;
    
    if (!content || !content.trim()) {
        showError('メッセージ内容を入力してください');
        return;
    }
    
    if (content.length > 160) {
        showError('メッセージは160文字以内で入力してください');
        return;
    }
    
    if (!selectedCount || selectedCount === '0') {
        showError('送信対象を選択してください');
        return;
    }
    
    if (!confirm(`${selectedCount}名の顧客にメッセージを送信しますか？`)) {
        return;
    }
    
    try {
        // Get selected customer filters
        const selectAll = document.getElementById('selectAll')?.checked;
        const selectActive = document.getElementById('selectActive')?.checked;
        const selectInactive = document.getElementById('selectInactive')?.checked;
        
        const filterData = {
            all: selectAll,
            active: selectActive,
            inactive: selectInactive
        };
        
        await apiRequest('/messages/bulk-send', {
            method: 'POST',
            body: JSON.stringify({
                content: content.trim(),
                filters: filterData,
                type: 'bulk'
            })
        });
        
        // Clear form
        document.getElementById('bulkMessageContent').value = '';
        document.getElementById('bulkTemplate').value = '';
        
        showSuccess(`${selectedCount}名の顧客にメッセージを送信しました`);
        
        // Refresh message history
        loadMessageHistory();
    } catch (error) {
        showError('一括送信に失敗しました: ' + error.message);
    }
}

// Update selected count for bulk send
function updateSelectedCount() {
    const selectAll = document.getElementById('selectAll')?.checked;
    const selectActive = document.getElementById('selectActive')?.checked;
    const selectInactive = document.getElementById('selectInactive')?.checked;
    const selectedCountElement = document.getElementById('selectedCount');
    
    let count = 0;
    if (selectAll) count = 156; // Total customers from dashboard
    else {
        if (selectActive) count += 120; // Estimated active customers
        if (selectInactive) count += 36; // Estimated inactive customers
    }
    
    if (selectedCountElement) {
        selectedCountElement.textContent = count;
    }
}

// Setup bulk message selection
window.addEventListener('DOMContentLoaded', () => {
    // Setup bulk message checkboxes
    const bulkCheckboxes = ['selectAll', 'selectActive', 'selectInactive'];
    bulkCheckboxes.forEach(id => {
        const checkbox = document.getElementById(id);
        if (checkbox) {
            checkbox.addEventListener('change', updateSelectedCount);
        }
    });
    
    // Initial count update
    setTimeout(updateSelectedCount, 500);
});
