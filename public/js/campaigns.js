// Global variables
let currentUser = null;
let authToken = null;
let campaigns = [];
let templates = [];

// API base URL
const API_BASE = '/api';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupEventListeners();
    loadCampaigns();
    loadTemplates();
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
    document.getElementById('logoutBtn').addEventListener('click', logout);
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
        const error = await response.json();
        throw new Error(error.message || 'API request failed');
    }
    
    return response.json();
}

// Load campaigns
async function loadCampaigns() {
    try {
        const data = await apiRequest('/campaigns');
        campaigns = data.campaigns;
        renderCampaigns();
    } catch (error) {
        console.error('Load campaigns error:', error);
        showError('キャンペーンの読み込みに失敗しました');
    }
}

// Load templates
async function loadTemplates() {
    try {
        const data = await apiRequest('/templates');
        templates = data.templates;
    } catch (error) {
        console.error('Load templates error:', error);
    }
}

// Render campaigns
function renderCampaigns() {
    const active = campaigns.filter(c => c.status === 'sending' || c.status === 'sent');
    const scheduled = campaigns.filter(c => c.status === 'scheduled');
    const past = campaigns.filter(c => c.status === 'completed' || c.status === 'cancelled');
    
    renderCampaignGroup('activeCampaigns', active);
    renderCampaignGroup('scheduledCampaigns', scheduled);
    renderCampaignGroup('pastCampaigns', past);
}

// Render campaign group
function renderCampaignGroup(containerId, campaigns) {
    const container = document.getElementById(containerId);
    
    if (campaigns.length === 0) {
        container.innerHTML = '<div class="empty-campaign"><p>キャンペーンがありません</p></div>';
        return;
    }
    
    const html = campaigns.map(campaign => {
        const channelIcons = campaign.channels.map(ch => getChannelIcon(ch)).join(' ');
        const statusClass = campaign.status === 'sent' ? 'active' : 
                          campaign.status === 'scheduled' ? 'scheduled' : 'completed';
        
        return `
            <div class="campaign-card">
                <div class="campaign-header">
                    <div class="campaign-status ${statusClass}">${getStatusLabel(campaign.status)}</div>
                    <div class="campaign-title">${campaign.name}</div>
                    <div class="campaign-type">${getCampaignTypeLabel(campaign.type)}</div>
                </div>
                <div class="campaign-body">
                    <div class="campaign-stats">
                        <div class="stat-item">
                            <div class="stat-value">${campaign.stats.totalRecipients}</div>
                            <div class="stat-label">対象者数</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${campaign.stats.sent}</div>
                            <div class="stat-label">送信数</div>
                        </div>
                    </div>
                    <div class="campaign-channels">
                        配信チャネル: ${channelIcons}
                    </div>
                    ${campaign.scheduledAt ? 
                        `<div class="campaign-schedule">
                            配信予定: ${formatDateTime(campaign.scheduledAt)}
                        </div>` : ''}
                    <div class="campaign-actions">
                        <button class="action-btn" onclick="viewCampaign('${campaign.id}')">詳細</button>
                        ${campaign.status === 'scheduled' ? 
                            `<button class="action-btn" onclick="cancelCampaign('${campaign.id}')">キャンセル</button>` : ''}
                        ${campaign.status === 'draft' ? 
                            `<button class="action-btn primary" onclick="sendCampaign('${campaign.id}')">送信</button>` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = html;
}

// Create campaign
function createCampaign(type) {
    const content = `
        <form id="campaignForm" class="campaign-form">
            <div class="form-section">
                <h4>基本情報</h4>
                <div class="form-group">
                    <label>キャンペーン名</label>
                    <input type="text" name="name" required placeholder="例：春の新規顧客キャンペーン">
                </div>
                <div class="form-group">
                    <label>キャンペーンタイプ</label>
                    <select name="type" required>
                        <option value="reminder" ${type === 'reminder' ? 'selected' : ''}>リマインダー</option>
                        <option value="campaign" ${type === 'campaign' ? 'selected' : ''}>キャンペーン</option>
                        <option value="holiday" ${type === 'holiday' ? 'selected' : ''}>休業案内</option>
                        <option value="reengagement" ${type === 'reengagement' ? 'selected' : ''}>再来店促進</option>
                        <option value="custom">カスタム</option>
                    </select>
                </div>
            </div>
            
            <div class="form-section">
                <h4>配信チャネル</h4>
                <div class="channel-selection">
                    <div class="channel-option">
                        <input type="checkbox" id="channel_email" name="channels" value="email" checked>
                        <label for="channel_email">📧 メール</label>
                    </div>
                    <div class="channel-option">
                        <input type="checkbox" id="channel_line" name="channels" value="line">
                        <label for="channel_line">💚 LINE</label>
                    </div>
                    <div class="channel-option">
                        <input type="checkbox" id="channel_instagram" name="channels" value="instagram">
                        <label for="channel_instagram">📷 Instagram</label>
                    </div>
                </div>
            </div>
            
            <div class="form-section">
                <h4>ターゲット設定</h4>
                <div class="criteria-group">
                    <div class="criteria-item">
                        <label>
                            <input type="checkbox" id="useLastVisit" onchange="toggleCriteria('lastVisit')">
                            最終来店日からの経過日数
                        </label>
                        <div id="lastVisitCriteria" style="display: none;">
                            <input type="number" name="lastVisitMin" placeholder="最小日数">
                            〜
                            <input type="number" name="lastVisitMax" placeholder="最大日数">
                        </div>
                    </div>
                    <div class="criteria-item">
                        <label>
                            <input type="checkbox" id="useVisitCount" onchange="toggleCriteria('visitCount')">
                            来店回数
                        </label>
                        <div id="visitCountCriteria" style="display: none;">
                            <input type="number" name="visitCountMin" placeholder="最小回数">
                            〜
                            <input type="number" name="visitCountMax" placeholder="最大回数">
                        </div>
                    </div>
                    <div class="criteria-item">
                        <label>すべての顧客に送信</label>
                        <input type="checkbox" id="sendToAll" checked>
                    </div>
                </div>
            </div>
            
            <div class="form-section">
                <h4>メッセージ内容</h4>
                <div class="form-group">
                    <label>件名（メールのみ）</label>
                    <input type="text" name="subject" placeholder="例：【Salon Lumière】春の特別キャンペーンのお知らせ">
                </div>
                <div class="form-group">
                    <label>本文</label>
                    <textarea name="body" rows="10" required placeholder="{{lastName}} {{firstName}}様&#10;&#10;いつもSalon Lumièreをご利用いただき、ありがとうございます。"></textarea>
                    <div class="template-variables">
                        <span class="variable-chip" onclick="insertVariable('{{lastName}}')">姓</span>
                        <span class="variable-chip" onclick="insertVariable('{{firstName}}')">名</span>
                        <span class="variable-chip" onclick="insertVariable('{{fullName}}')">フルネーム</span>
                        <span class="variable-chip" onclick="insertVariable('{{salonName}}')">サロン名</span>
                        <span class="variable-chip" onclick="insertVariable('{{lastVisitDate}}')">最終来店日</span>
                    </div>
                </div>
            </div>
            
            <div class="form-section">
                <h4>配信設定</h4>
                <div class="form-group">
                    <label>
                        <input type="radio" name="sendTiming" value="immediate" checked>
                        今すぐ送信
                    </label>
                </div>
                <div class="form-group">
                    <label>
                        <input type="radio" name="sendTiming" value="scheduled">
                        予約送信
                    </label>
                    <input type="datetime-local" name="scheduledAt" id="scheduledAt" disabled>
                </div>
            </div>
            
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="previewCampaign()">プレビュー</button>
                <button type="submit" class="btn btn-primary">キャンペーンを作成</button>
            </div>
        </form>
    `;
    
    showModal('新規キャンペーン作成', content);
    
    // Setup form handlers
    document.getElementById('campaignForm').addEventListener('submit', handleCampaignSubmit);
    document.querySelectorAll('input[name="sendTiming"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            document.getElementById('scheduledAt').disabled = e.target.value !== 'scheduled';
        });
    });
}

// Handle campaign submit
async function handleCampaignSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    // Build campaign data
    const campaignData = {
        name: formData.get('name'),
        type: formData.get('type'),
        channels: Array.from(formData.getAll('channels')),
        targetCriteria: {},
        content: {
            subject: formData.get('subject'),
            body: formData.get('body')
        }
    };
    
    // Add target criteria
    if (!document.getElementById('sendToAll').checked) {
        if (document.getElementById('useLastVisit').checked) {
            campaignData.targetCriteria.lastVisitDays = {
                min: parseInt(formData.get('lastVisitMin')) || 0,
                max: parseInt(formData.get('lastVisitMax')) || null
            };
        }
        if (document.getElementById('useVisitCount').checked) {
            campaignData.targetCriteria.visitCount = {
                min: parseInt(formData.get('visitCountMin')) || 0,
                max: parseInt(formData.get('visitCountMax')) || null
            };
        }
    }
    
    // Add scheduling
    if (formData.get('sendTiming') === 'scheduled') {
        campaignData.scheduledAt = new Date(formData.get('scheduledAt')).toISOString();
    }
    
    try {
        const response = await apiRequest('/campaigns', {
            method: 'POST',
            body: JSON.stringify(campaignData)
        });
        
        if (formData.get('sendTiming') === 'immediate') {
            // Send immediately
            await apiRequest(`/campaigns/${response.campaign.id}/send`, {
                method: 'POST'
            });
        }
        
        closeModal();
        loadCampaigns();
        showSuccess('キャンペーンを作成しました');
    } catch (error) {
        showError(error.message);
    }
}

// Toggle criteria
function toggleCriteria(type) {
    const criteriaDiv = document.getElementById(`${type}Criteria`);
    const checkbox = document.getElementById(`use${type.charAt(0).toUpperCase() + type.slice(1)}`);
    criteriaDiv.style.display = checkbox.checked ? 'block' : 'none';
}

// Insert variable
function insertVariable(variable) {
    const textarea = document.querySelector('textarea[name="body"]');
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    
    textarea.value = text.substring(0, start) + variable + text.substring(end);
    textarea.selectionStart = textarea.selectionEnd = start + variable.length;
    textarea.focus();
}

// Preview campaign
function previewCampaign() {
    const formData = new FormData(document.getElementById('campaignForm'));
    const body = formData.get('body');
    
    // Sample customer data for preview
    const sampleCustomer = {
        lastName: '山田',
        firstName: '花子',
        lastVisitDate: new Date().toLocaleDateString('ja-JP')
    };
    
    const previewContent = personalizeContent(body, sampleCustomer);
    
    showModal('メッセージプレビュー', `
        <div class="message-preview">
            <div class="preview-header">
                <h4>プレビュー</h4>
                <div class="preview-tabs">
                    <button class="preview-tab active">📧 メール</button>
                    <button class="preview-tab">💚 LINE</button>
                    <button class="preview-tab">📷 Instagram</button>
                </div>
            </div>
            <div class="preview-content">${escapeHtml(previewContent)}</div>
        </div>
    `);
}

// Personalize content
function personalizeContent(content, customer) {
    return content
        .replace(/{{firstName}}/g, customer.firstName || '')
        .replace(/{{lastName}}/g, customer.lastName || '')
        .replace(/{{fullName}}/g, `${customer.lastName || ''} ${customer.firstName || ''}`)
        .replace(/{{salonName}}/g, currentUser.salonName)
        .replace(/{{lastVisitDate}}/g, customer.lastVisitDate || '初回');
}

// Utility functions
function getChannelIcon(channel) {
    const icons = {
        email: '📧',
        line: '💚',
        instagram: '📷'
    };
    return icons[channel] || '💬';
}

function getStatusLabel(status) {
    const labels = {
        draft: '下書き',
        scheduled: '予約済み',
        sending: '送信中',
        sent: '送信済み',
        cancelled: 'キャンセル',
        failed: '失敗'
    };
    return labels[status] || status;
}

function getCampaignTypeLabel(type) {
    const labels = {
        reminder: 'リマインダー',
        campaign: 'キャンペーン',
        holiday: '休業案内',
        reengagement: '再来店促進',
        custom: 'カスタム'
    };
    return labels[type] || type;
}

function formatDateTime(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleString('ja-JP');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML.replace(/\n/g, '<br>');
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
window.createCampaign = createCampaign;
window.viewCampaign = (id) => {
    const campaign = campaigns.find(c => c.id === id);
    if (campaign) {
        showModal(`キャンペーン詳細: ${campaign.name}`, '<p>詳細表示機能は準備中です</p>');
    }
};
window.cancelCampaign = async (id) => {
    if (!confirm('このキャンペーンをキャンセルしますか？')) return;
    // TODO: Implement cancel
    showSuccess('キャンセル機能は準備中です');
};
window.sendCampaign = async (id) => {
    if (!confirm('このキャンペーンを送信しますか？')) return;
    try {
        await apiRequest(`/campaigns/${id}/send`, { method: 'POST' });
        loadCampaigns();
        showSuccess('キャンペーンを送信しました');
    } catch (error) {
        showError(error.message);
    }
};
window.toggleCriteria = toggleCriteria;
window.insertVariable = insertVariable;
window.previewCampaign = previewCampaign;
window.closeModal = closeModal;