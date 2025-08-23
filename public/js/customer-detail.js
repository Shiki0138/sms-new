// Global variables
let currentUser = null;
let authToken = null;
let customerId = null;
let currentCustomer = null;

// API base URL
const API_BASE = '/api';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupEventListeners();
    loadCustomerDetails();
});

// Check authentication
function checkAuth() {
    authToken = localStorage.getItem('salon_token') || sessionStorage.getItem('salon_token');
    const userStr = localStorage.getItem('salon_user') || sessionStorage.getItem('salon_user');
    
    if (!authToken || !userStr) {
        window.location.href = '/login-new.html';
        return;
    }
    
    try {
        currentUser = JSON.parse(userStr);
        updateUserInfo();
    } catch (error) {
        console.error('Auth error:', error);
        logout();
    }
}

// Update user info
function updateUserInfo() {
    document.getElementById('userName').textContent = currentUser.name;
    document.getElementById('salonName').textContent = currentUser.salonName;
    document.getElementById('userPlan').textContent = currentUser.planType.toUpperCase();
}

// Setup event listeners
function setupEventListeners() {
    // Get customer ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    customerId = urlParams.get('id');
    
    console.log('Customer ID from URL:', customerId);
    console.log('Full URL:', window.location.href);
    console.log('URL search params:', window.location.search);
    
    if (!customerId) {
        console.error('No customer ID found in URL parameters');
        alert('顧客IDが指定されていません。顧客一覧に戻ります。');
        window.location.href = '/dashboard.html#customers';
        return;
    }
    
    // Tab navigation
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', (e) => {
            const tab = e.target.dataset.tab;
            switchTab(tab);
        });
    });
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', logout);
}

// Switch tabs
function switchTab(tabName) {
    // Update buttons
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.toggle('active', button.dataset.tab === tabName);
    });
    
    // Update content
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.toggle('active', pane.id === tabName);
    });
    
    // Load tab-specific data
    switch(tabName) {
        case 'history':
            loadVisitHistory();
            break;
        case 'records':
            loadMedicalRecords();
            break;
        case 'photos':
            loadPhotos();
            break;
        case 'growth':
            loadGrowthHistory();
            break;
    }
}

// API request helper
async function apiRequest(endpoint, options = {}) {
    const defaultOptions = {
        headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
        }
    };
    
    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    });
    
    if (response.status === 401) {
        logout();
        throw new Error('Unauthorized');
    }
    
    if (!response.ok) {
        let error;
        try {
            // Try to parse JSON error response
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                error = await response.json();
            } else {
                // Handle HTML error pages (like Vercel 404)
                const text = await response.text();
                error = { message: `HTTP ${response.status}: ${response.statusText}` };
                console.error('Non-JSON response:', text.substring(0, 200));
            }
        } catch (parseError) {
            console.error('Error parsing response:', parseError);
            error = { message: `HTTP ${response.status}: ${response.statusText}` };
        }
        throw new Error(error.message || 'API request failed');
    }
    
    try {
        return await response.json();
    } catch (parseError) {
        console.error('Error parsing successful response:', parseError);
        throw new Error('Invalid JSON response from server');
    }
}

// Load customer details
async function loadCustomerDetails() {
    try {
        console.log('Loading customer details for ID:', customerId);
        const data = await apiRequest(`/customers/${customerId}`);
        
        if (!data || !data.customer) {
            throw new Error('Invalid response format: customer data not found');
        }
        
        currentCustomer = data.customer;
        
        // Update header
        document.getElementById('customerFullName').textContent = 
            `${currentCustomer.lastName} ${currentCustomer.firstName}`;
        document.getElementById('customerFullNameKana').textContent = 
            `${currentCustomer.lastNameKana || ''} ${currentCustomer.firstNameKana || ''}`;
        document.getElementById('customerNameBreadcrumb').textContent = 
            `${currentCustomer.lastName} ${currentCustomer.firstName}`;
        
        // Update basic info
        document.getElementById('customerPhone').textContent = currentCustomer.phoneNumber || '-';
        document.getElementById('customerEmail').textContent = currentCustomer.email || '-';
        document.getElementById('customerBirthDate').textContent = 
            currentCustomer.birthDate ? formatDate(currentCustomer.birthDate) : '-';
        document.getElementById('customerGender').textContent = 
            getGenderLabel(currentCustomer.gender);
        document.getElementById('customerPostalCode').textContent = currentCustomer.postalCode || '-';
        document.getElementById('customerAddress').textContent = 
            formatAddress(currentCustomer);
        document.getElementById('customerFirstVisit').textContent = 
            currentCustomer.firstVisitDate ? formatDate(currentCustomer.firstVisitDate) : '-';
        document.getElementById('customerLastVisit').textContent = 
            currentCustomer.lastVisitDate ? formatDate(currentCustomer.lastVisitDate) : '-';
        document.getElementById('customerVisitCount').textContent = currentCustomer.visitCount || 0;
        document.getElementById('customerTotalSales').textContent = 
            (currentCustomer.totalSales || 0).toLocaleString();
        document.getElementById('customerNotes').textContent = currentCustomer.notes || '-';
        
        // Update tags
        if (currentCustomer.tags && currentCustomer.tags.length > 0) {
            document.getElementById('customerTags').innerHTML = currentCustomer.tags
                .map(tag => `<span class="tag">${tag}</span>`)
                .join('');
        }
        
        // Update desires & needs
        updateDesiresNeeds();
        
    } catch (error) {
        console.error('Load customer error:', error);
        console.error('Customer ID that failed:', customerId);
        
        // Provide specific error messages based on error type
        if (error.message.includes('404') || error.message.includes('not found')) {
            showError(`指定された顧客が見つかりません (ID: ${customerId})\n\n有効な顧客IDを確認してください。`);
        } else if (error.message.includes('Unauthorized')) {
            showError('認証に失敗しました。再度ログインしてください。');
            logout();
        } else if (error.message.includes('Invalid JSON')) {
            showError('サーバーからの応答が正しくありません。管理者に連絡してください。');
        } else {
            showError(`顧客情報の読み込みに失敗しました: ${error.message}`);
        }
    }
}

// Update desires & needs
function updateDesiresNeeds() {
    const desiresText = document.querySelector('#customerDesires .content-text');
    const needsText = document.querySelector('#customerNeeds .content-text');
    
    desiresText.textContent = currentCustomer.desires || 'まだ記録がありません';
    needsText.textContent = currentCustomer.needs || 'まだ記録がありません';
    
    // Update preferences
    if (currentCustomer.preferences && Object.keys(currentCustomer.preferences).length > 0) {
        const prefsHtml = Object.entries(currentCustomer.preferences)
            .map(([key, value]) => `
                <div class="preference-item">
                    <div class="preference-label">${key}</div>
                    <div class="preference-value">${value}</div>
                </div>
            `).join('');
        document.getElementById('customerPreferences').innerHTML = prefsHtml;
    }
}

// Load visit history
async function loadVisitHistory() {
    try {
        const appointments = await apiRequest(`/appointments?customerId=${customerId}`);
        const sales = await apiRequest(`/sales?customerId=${customerId}`);
        
        // Combine and sort by date
        const history = [];
        
        appointments.appointments.forEach(apt => {
            history.push({
                type: 'appointment',
                date: apt.appointmentDate,
                data: apt
            });
        });
        
        sales.sales.forEach(sale => {
            history.push({
                type: 'sale',
                date: sale.saleDate,
                data: sale
            });
        });
        
        history.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // Render history
        const historyHtml = history.map(item => {
            if (item.type === 'appointment') {
                return `
                    <div class="history-item">
                        <div class="history-date">${formatDate(item.data.appointmentDate)} ${item.data.startTime}</div>
                        <div class="history-services">
                            ${item.data.services.map(s => s.name).join(', ')}
                        </div>
                        <div class="history-status">${getStatusBadge(item.data.status)}</div>
                    </div>
                `;
            } else {
                return `
                    <div class="history-item">
                        <div class="history-date">${formatDate(item.data.saleDate)}</div>
                        <div class="history-services">
                            ${item.data.items.map(i => i.name).join(', ')}
                        </div>
                        <div class="history-amount">¥${item.data.totalAmount.toLocaleString()}</div>
                    </div>
                `;
            }
        }).join('');
        
        document.getElementById('visitHistory').innerHTML = historyHtml || 
            '<p class="empty-state">来店履歴がありません</p>';
            
    } catch (error) {
        console.error('Load history error:', error);
        showError('来店履歴の読み込みに失敗しました');
    }
}

// Load medical records
async function loadMedicalRecords() {
    try {
        const data = await apiRequest(`/records/customer/${customerId}`);
        
        if (data.records.length === 0) {
            document.getElementById('medicalRecords').innerHTML = 
                '<p class="empty-state">カルテがありません</p>';
            return;
        }
        
        const recordsHtml = data.records.map(record => `
            <div class="record-card">
                <div class="record-header">
                    <span class="record-date">${formatDate(record.visitDate)}</span>
                    <button class="btn btn-sm" onclick="viewRecord('${record.id}')">詳細</button>
                </div>
                <div class="record-content">
                    ${record.services.length > 0 ? `
                        <div class="record-section">
                            <h4>施術内容</h4>
                            <p>${record.services.join(', ')}</p>
                        </div>
                    ` : ''}
                    ${record.treatmentDetails ? `
                        <div class="record-section">
                            <h4>施術詳細</h4>
                            <p>${record.treatmentDetails}</p>
                        </div>
                    ` : ''}
                    ${record.recommendations ? `
                        <div class="record-section">
                            <h4>次回への提案</h4>
                            <p>${record.recommendations}</p>
                        </div>
                    ` : ''}
                </div>
            </div>
        `).join('');
        
        document.getElementById('medicalRecords').innerHTML = recordsHtml;
        
    } catch (error) {
        console.error('Load records error:', error);
        showError('カルテの読み込みに失敗しました');
    }
}

// Load photos
async function loadPhotos() {
    try {
        const data = await apiRequest(`/records/customer/${customerId}`);
        const photos = [];
        
        // Collect all photos from records
        data.records.forEach(record => {
            if (record.beforePhotoUrl) {
                photos.push({
                    url: record.beforePhotoUrl,
                    date: record.visitDate,
                    type: 'before',
                    recordId: record.id
                });
            }
            if (record.afterPhotoUrl) {
                photos.push({
                    url: record.afterPhotoUrl,
                    date: record.visitDate,
                    type: 'after',
                    recordId: record.id
                });
            }
            if (record.photos && record.photos.length > 0) {
                record.photos.forEach(photo => {
                    photos.push({
                        ...photo,
                        date: record.visitDate,
                        recordId: record.id
                    });
                });
            }
        });
        
        // Sort by date
        photos.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        if (photos.length === 0) {
            document.getElementById('customerPhotos').innerHTML = 
                '<p class="empty-state">写真がありません</p>';
            return;
        }
        
        const photosHtml = photos.map(photo => `
            <div class="photo-item" onclick="viewPhoto('${photo.url}')">
                <img src="${photo.url}" alt="Customer photo">
                <div class="photo-info">
                    <div class="photo-date">${formatDate(photo.date)}</div>
                    ${photo.caption ? `<div class="photo-caption">${photo.caption}</div>` : ''}
                </div>
            </div>
        `).join('');
        
        document.getElementById('customerPhotos').innerHTML = photosHtml;
        
    } catch (error) {
        console.error('Load photos error:', error);
        showError('写真の読み込みに失敗しました');
    }
}

// Edit desires
function editDesires() {
    const content = `
        <form id="desiresForm">
            <div class="form-group">
                <label>お客様の願望</label>
                <textarea name="desires" rows="10" style="width: 100%;">${currentCustomer.desires || ''}</textarea>
            </div>
            <button type="submit" class="btn btn-primary">保存</button>
        </form>
    `;
    
    showModal('願望を編集', content);
    
    document.getElementById('desiresForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        try {
            await apiRequest(`/customers/${customerId}`, {
                method: 'PUT',
                body: JSON.stringify({
                    desires: formData.get('desires')
                })
            });
            
            currentCustomer.desires = formData.get('desires');
            updateDesiresNeeds();
            closeModal();
            showSuccess('願望を更新しました');
        } catch (error) {
            showError('更新に失敗しました');
        }
    });
}

// Edit needs
function editNeeds() {
    const content = `
        <form id="needsForm">
            <div class="form-group">
                <label>お客様のニーズ</label>
                <textarea name="needs" rows="10" style="width: 100%;">${currentCustomer.needs || ''}</textarea>
            </div>
            <button type="submit" class="btn btn-primary">保存</button>
        </form>
    `;
    
    showModal('ニーズを編集', content);
    
    document.getElementById('needsForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        try {
            await apiRequest(`/customers/${customerId}`, {
                method: 'PUT',
                body: JSON.stringify({
                    needs: formData.get('needs')
                })
            });
            
            currentCustomer.needs = formData.get('needs');
            updateDesiresNeeds();
            closeModal();
            showSuccess('ニーズを更新しました');
        } catch (error) {
            showError('更新に失敗しました');
        }
    });
}

// Utility functions
function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ja-JP');
}

function formatAddress(customer) {
    const parts = [];
    if (customer.prefecture) parts.push(customer.prefecture);
    if (customer.city) parts.push(customer.city);
    if (customer.address) parts.push(customer.address);
    return parts.length > 0 ? parts.join(' ') : '-';
}

function getGenderLabel(gender) {
    const labels = {
        male: '男性',
        female: '女性',
        other: 'その他'
    };
    return labels[gender] || '-';
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

// Modal functions
function showModal(title, content) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = content;
    document.getElementById('modal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('modal').style.display = 'none';
}

function showSuccess(message) {
    alert(message);
}

function showError(message) {
    alert('エラー: ' + message);
}

function logout() {
    localStorage.removeItem('salon_token');
    localStorage.removeItem('salon_user');
    sessionStorage.removeItem('salon_token');
    sessionStorage.removeItem('salon_user');
    window.location.href = '/login-new.html';
}

// Global functions
window.editCustomer = () => {
    window.location.href = `/customer-edit.html?id=${customerId}`;
};

window.createAppointment = () => {
    window.location.href = `/appointment-new.html?customerId=${customerId}`;
};

window.addRecord = () => {
    window.location.href = `/record-new.html?customerId=${customerId}`;
};

window.viewRecord = (recordId) => {
    window.location.href = `/record-detail.html?id=${recordId}`;
};

window.viewPhoto = (url) => {
    window.open(url, '_blank');
};

window.uploadPhoto = () => {
    const content = `
        <form id="photoUploadForm">
            <div class="form-group">
                <label>写真タイプ</label>
                <select name="photoType" required>
                    <option value="">選択してください</option>
                    <option value="before">施術前</option>
                    <option value="after">施術後</option>
                    <option value="other">その他</option>
                </select>
            </div>
            <div class="form-group">
                <label>施術記録を選択</label>
                <select name="recordId" id="recordSelect" required>
                    <option value="">選択してください</option>
                </select>
            </div>
            <div class="form-group">
                <label>キャプション（任意）</label>
                <input type="text" name="caption" placeholder="写真の説明">
            </div>
            <div class="form-group">
                <label>写真を選択</label>
                <input type="file" name="photo" accept="image/*" required>
            </div>
            <button type="submit" class="btn btn-primary">アップロード</button>
        </form>
    `;
    
    showModal('写真をアップロード', content);
    
    // Load medical records for selection
    loadRecordsForSelect();
    
    document.getElementById('photoUploadForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        try {
            // Simulate photo upload
            await apiRequest(`/records/${formData.get('recordId')}/photos`, {
                method: 'POST',
                body: JSON.stringify({
                    type: formData.get('photoType'),
                    caption: formData.get('caption')
                })
            });
            
            closeModal();
            loadPhotos();
            showSuccess('写真をアップロードしました');
        } catch (error) {
            showError('アップロードに失敗しました');
        }
    });
};

async function loadRecordsForSelect() {
    try {
        const data = await apiRequest(`/records/customer/${customerId}`);
        const select = document.getElementById('recordSelect');
        
        if (data.records.length === 0) {
            select.innerHTML = '<option value="">施術記録がありません</option>';
            return;
        }
        
        select.innerHTML = '<option value="">選択してください</option>' +
            data.records.map(record => 
                `<option value="${record.id}">${formatDate(record.visitDate)} - ${record.services.join(', ')}</option>`
            ).join('');
    } catch (error) {
        console.error('Load records error:', error);
    }
}

window.editDesires = editDesires;
window.editNeeds = editNeeds;
window.closeModal = closeModal;

// Growth history functions
async function loadGrowthHistory() {
    try {
        // Load appointments and sales for growth tracking
        const appointments = await apiRequest(`/appointments?customerId=${customerId}`);
        const sales = await apiRequest(`/sales?customerId=${customerId}`);
        
        // Process data for visualization
        const growthData = processGrowthData(appointments.appointments, sales.sales);
        
        // Render chart
        renderGrowthChart(growthData);
        
        // Generate insights
        generateGrowthInsights(growthData);
        
    } catch (error) {
        console.error('Load growth history error:', error);
        showError('成長履歴の読み込みに失敗しました');
    }
}

function processGrowthData(appointments, sales) {
    // Group data by month
    const monthlyData = {};
    
    // Process appointments
    appointments.forEach(apt => {
        const date = new Date(apt.appointmentDate);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = {
                visits: 0,
                revenue: 0,
                services: {}
            };
        }
        
        monthlyData[monthKey].visits++;
        
        // Count services
        apt.services.forEach(service => {
            if (!monthlyData[monthKey].services[service.name]) {
                monthlyData[monthKey].services[service.name] = 0;
            }
            monthlyData[monthKey].services[service.name]++;
        });
    });
    
    // Process sales
    sales.forEach(sale => {
        const date = new Date(sale.saleDate);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = {
                visits: 0,
                revenue: 0,
                services: {}
            };
        }
        
        monthlyData[monthKey].revenue += sale.totalAmount;
    });
    
    // Convert to array and sort by date
    const dataArray = Object.entries(monthlyData)
        .map(([month, data]) => ({ month, ...data }))
        .sort((a, b) => a.month.localeCompare(b.month));
    
    return dataArray;
}

function renderGrowthChart(data) {
    const chartContainer = document.getElementById('growthChart');
    
    if (data.length === 0) {
        chartContainer.innerHTML = '<p class="empty-state">成長履歴データがありません</p>';
        return;
    }
    
    // Create a simple bar chart visualization
    const maxRevenue = Math.max(...data.map(d => d.revenue));
    const chartHeight = 300;
    
    let html = `
        <div class="chart-wrapper">
            <div class="chart-title">来店回数と売上の推移</div>
            <div class="chart-container" style="height: ${chartHeight}px;">
    `;
    
    data.forEach((monthData, index) => {
        const revenueHeight = (monthData.revenue / maxRevenue) * (chartHeight - 50) || 0;
        const month = new Date(monthData.month + '-01');
        const monthLabel = `${month.getMonth() + 1}月`;
        
        html += `
            <div class="chart-bar-group" style="left: ${index * 80 + 20}px;">
                <div class="chart-bar revenue-bar" 
                     style="height: ${revenueHeight}px;"
                     title="売上: ¥${monthData.revenue.toLocaleString()}">
                </div>
                <div class="chart-visits">${monthData.visits}回</div>
                <div class="chart-label">${monthLabel}</div>
                <div class="chart-revenue">¥${(monthData.revenue / 1000).toFixed(0)}k</div>
            </div>
        `;
    });
    
    html += `
            </div>
            <div class="chart-legend">
                <span class="legend-item"><span class="legend-color revenue"></span>売上</span>
            </div>
        </div>
    `;
    
    chartContainer.innerHTML = html;
}

function generateGrowthInsights(data) {
    const insightsContainer = document.getElementById('growthInsights');
    
    if (data.length < 2) {
        insightsContainer.innerHTML = '<p>データが不足しているため分析できません</p>';
        return;
    }
    
    // Calculate trends
    const recentMonths = data.slice(-3);
    const totalVisits = data.reduce((sum, d) => sum + d.visits, 0);
    const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);
    const avgRevenuePerVisit = totalRevenue / totalVisits || 0;
    
    // Find most popular services
    const allServices = {};
    data.forEach(monthData => {
        Object.entries(monthData.services).forEach(([service, count]) => {
            allServices[service] = (allServices[service] || 0) + count;
        });
    });
    
    const popularServices = Object.entries(allServices)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);
    
    let html = `
        <div class="insight-cards">
            <div class="insight-card">
                <h5>総来店回数</h5>
                <p class="insight-value">${totalVisits}回</p>
            </div>
            <div class="insight-card">
                <h5>累計売上</h5>
                <p class="insight-value">¥${totalRevenue.toLocaleString()}</p>
            </div>
            <div class="insight-card">
                <h5>平均単価</h5>
                <p class="insight-value">¥${Math.round(avgRevenuePerVisit).toLocaleString()}</p>
            </div>
        </div>
    `;
    
    if (popularServices.length > 0) {
        html += `
            <div class="popular-services">
                <h5>よく利用されるサービス</h5>
                <ul>
        `;
        
        popularServices.forEach(([service, count]) => {
            html += `<li>${service} (${count}回)</li>`;
        });
        
        html += `
                </ul>
            </div>
        `;
    }
    
    // Growth trend
    if (recentMonths.length >= 2) {
        const recentGrowth = recentMonths[recentMonths.length - 1].revenue - recentMonths[0].revenue;
        const growthRate = (recentGrowth / recentMonths[0].revenue * 100) || 0;
        
        html += `
            <div class="growth-trend">
                <h5>直近の成長傾向</h5>
                <p class="${recentGrowth >= 0 ? 'positive' : 'negative'}">
                    ${recentGrowth >= 0 ? '↑' : '↓'} ${Math.abs(growthRate).toFixed(1)}%
                </p>
            </div>
        `;
    }
    
    insightsContainer.innerHTML = html;
}

// Period selector for growth chart
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('period-btn')) {
        document.querySelectorAll('.period-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        e.target.classList.add('active');
        
        // Reload with selected period
        loadGrowthHistory();
    }
});