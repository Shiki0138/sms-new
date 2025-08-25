// Global variables
let currentUser = null;
let authToken = null;
let conversations = [];
let currentConversation = null;
let currentChannel = 'all';
let messagePollingInterval = null;

// API base URL
const API_BASE = '/api';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupEventListeners();
    loadConversations();
    startMessagePolling();
});

// Check authentication
function checkAuth() {
    authToken = localStorage.getItem('salon_token') || sessionStorage.getItem('salon_token');
    const userStr = localStorage.getItem('salon_user') || sessionStorage.getItem('salon_user');
    
    if (!authToken || !userStr) {
        window.location.href = '/login.html';
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
    // Channel filters
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const channel = e.target.dataset.channel;
            filterByChannel(channel);
        });
    });
    
    // Message input
    const messageText = document.getElementById('messageText');
    messageText?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // Logout
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

// Load conversations
async function loadConversations() {
    try {
        const data = await apiRequest('/messages');
        conversations = data.conversations;
        renderConversations();
    } catch (error) {
        console.error('Load conversations error:', error);
        showError('会話の読み込みに失敗しました');
    }
}

// Render conversations
function renderConversations() {
    const container = document.getElementById('conversationsList');
    
    let filteredConversations = conversations;
    if (currentChannel !== 'all') {
        filteredConversations = conversations.filter(c => c.channel === currentChannel);
    }
    
    if (filteredConversations.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>会話がありません</p></div>';
        return;
    }
    
    const html = filteredConversations.map(conv => {
        const lastMessage = conv.lastMessage;
        const isActive = currentConversation?.customerId === conv.customerId;
        const channelIcon = getChannelIcon(conv.channel);
        const initials = conv.customer ? 
            `${conv.customer.lastName?.[0] || ''}${conv.customer.firstName?.[0] || ''}` : '?';
        
        return `
            <div class="conversation-item ${isActive ? 'active' : ''}" 
                 onclick="selectConversation('${conv.customerId || conv.channelUserId}')">
                <div class="conversation-avatar">${initials}</div>
                <div class="conversation-content">
                    <div class="conversation-header">
                        <div class="conversation-name">
                            ${conv.customer ? 
                                `${conv.customer.lastName} ${conv.customer.firstName}` : 
                                conv.channelUserId}
                        </div>
                        <div class="conversation-time">${formatTime(lastMessage.createdAt)}</div>
                    </div>
                    <div class="conversation-preview">
                        ${lastMessage.direction === 'outbound' ? 'あなた: ' : ''}
                        ${lastMessage.content}
                    </div>
                    <div class="conversation-meta">
                        <span class="channel-badge">${channelIcon}</span>
                        ${conv.unreadCount > 0 ? 
                            `<span class="unread-badge">${conv.unreadCount}</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = html;
}

// Select conversation
async function selectConversation(customerId) {
    currentConversation = conversations.find(c => 
        c.customerId === customerId || c.channelUserId === customerId
    );
    
    if (!currentConversation) return;
    
    // Update UI
    renderConversations();
    renderMessages();
    
    // Show customer panel if customer exists
    if (currentConversation.customer) {
        showCustomerPanel(currentConversation.customer);
    }
    
    // Show message input
    document.getElementById('messageInputArea').style.display = 'block';
    
    // Mark messages as read
    const unreadMessages = currentConversation.messages.filter(m => 
        m.direction === 'inbound' && !m.isRead
    );
    
    for (const msg of unreadMessages) {
        try {
            await apiRequest(`/messages/${msg.id}/read`, { method: 'PUT' });
            msg.isRead = true;
        } catch (error) {
            console.error('Mark as read error:', error);
        }
    }
    
    currentConversation.unreadCount = 0;
}

// Render messages
function renderMessages() {
    const header = document.getElementById('messageHeader');
    const thread = document.getElementById('messagesThread');
    
    if (!currentConversation) {
        header.innerHTML = '<div class="customer-info"><h3>会話を選択してください</h3></div>';
        thread.innerHTML = '<div class="empty-state"><p>💬</p><p>会話を選択してメッセージを表示</p></div>';
        return;
    }
    
    // Update header
    const customer = currentConversation.customer;
    const channelIcon = getChannelIcon(currentConversation.channel);
    header.innerHTML = `
        <div class="customer-info">
            <h3>
                ${customer ? `${customer.lastName} ${customer.firstName}` : currentConversation.channelUserId}
                <span class="channel-badge" style="margin-left: 0.5rem;">${channelIcon}</span>
            </h3>
            ${customer ? `<p>${customer.phoneNumber || customer.email || ''}</p>` : ''}
        </div>
    `;
    
    // Group messages by date
    const messagesByDate = {};
    currentConversation.messages.forEach(msg => {
        const date = new Date(msg.createdAt).toLocaleDateString('ja-JP');
        if (!messagesByDate[date]) {
            messagesByDate[date] = [];
        }
        messagesByDate[date].push(msg);
    });
    
    // Render messages
    let html = '';
    Object.entries(messagesByDate).forEach(([date, messages]) => {
        html += `<div class="date-divider"><span>${date}</span></div>`;
        
        messages.forEach(msg => {
            const statusIcon = getStatusIcon(msg.status);
            html += `
                <div class="message-item ${msg.direction}">
                    <div class="message-bubble">
                        <div class="message-text">${escapeHtml(msg.content)}</div>
                        <div class="message-time">
                            ${formatTime(msg.createdAt)}
                            ${msg.direction === 'outbound' ? statusIcon : ''}
                        </div>
                    </div>
                </div>
            `;
        });
    });
    
    thread.innerHTML = html;
    thread.scrollTop = thread.scrollHeight;
}

// Send message
async function sendMessage() {
    const messageText = document.getElementById('messageText');
    const content = messageText.value.trim();
    
    if (!content || !currentConversation) return;
    
    try {
        const messageData = {
            customerId: currentConversation.customerId,
            channel: currentConversation.channel,
            channelUserId: currentConversation.channelUserId,
            content: content
        };
        
        const response = await apiRequest('/messages', {
            method: 'POST',
            body: JSON.stringify(messageData)
        });
        
        // Add message to current conversation
        currentConversation.messages.push(response.data);
        currentConversation.lastMessage = response.data;
        
        // Clear input and re-render
        messageText.value = '';
        renderMessages();
        renderConversations();
        
    } catch (error) {
        console.error('Send message error:', error);
        showError('メッセージの送信に失敗しました');
    }
}

// Filter by channel
function filterByChannel(channel) {
    currentChannel = channel;
    
    // Update filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.channel === channel);
    });
    
    renderConversations();
}

// Show customer panel
function showCustomerPanel(customer) {
    const panel = document.getElementById('customerPanel');
    const details = document.getElementById('customerDetails');
    
    const html = `
        <div class="detail-section">
            <h4>基本情報</h4>
            <div class="detail-item">
                <span class="detail-label">電話番号</span>
                <span class="detail-value">${customer.phoneNumber || '-'}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">メール</span>
                <span class="detail-value">${customer.email || '-'}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">最終来店</span>
                <span class="detail-value">${customer.lastVisitDate ? 
                    formatDate(customer.lastVisitDate) : '-'}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">来店回数</span>
                <span class="detail-value">${customer.visitCount || 0}回</span>
            </div>
        </div>
        
        <div class="detail-section">
            <div class="action-buttons">
                <button class="action-btn" onclick="viewCustomerDetail('${customer.id}')">
                    顧客詳細を見る
                </button>
                <button class="action-btn" onclick="createAppointment('${customer.id}')">
                    予約を作成
                </button>
            </div>
        </div>
    `;
    
    details.innerHTML = html;
    panel.style.display = 'flex';
}

// Close customer panel
function closeCustomerPanel() {
    document.getElementById('customerPanel').style.display = 'none';
}

// Insert template
function insertTemplate() {
    showModal('テンプレートを選択', '<p>テンプレート機能は準備中です</p>');
}

// Attach file
function attachFile() {
    showModal('ファイルを添付', '<p>ファイル添付機能は準備中です</p>');
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

function getStatusIcon(status) {
    const icons = {
        sent: '✓',
        delivered: '✓✓',
        read: '✓✓',
        failed: '⚠️'
    };
    return icons[status] ? `<span class="message-status">${icons[status]}</span>` : '';
}

function formatTime(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return '今';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分前`;
    if (diff < 86400000) return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
    
    return date.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' });
}

function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('ja-JP');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Start message polling
function startMessagePolling() {
    // Poll for new messages every 10 seconds
    messagePollingInterval = setInterval(loadConversations, 10000);
}

// Stop message polling
function stopMessagePolling() {
    if (messagePollingInterval) {
        clearInterval(messagePollingInterval);
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

function showError(message) {
    alert('エラー: ' + message);
}

function logout() {
    stopMessagePolling();
    localStorage.removeItem('salon_token');
    localStorage.removeItem('salon_user');
    sessionStorage.removeItem('salon_token');
    sessionStorage.removeItem('salon_user');
    window.location.href = '/login-new.html';
}

// Global functions
window.closeCustomerPanel = closeCustomerPanel;
window.insertTemplate = insertTemplate;
window.attachFile = attachFile;
window.sendMessage = sendMessage;
window.selectConversation = selectConversation;
window.closeModal = closeModal;

window.viewCustomerDetail = (customerId) => {
    window.location.href = `/customer-detail.html?id=${customerId}`;
};

window.createAppointment = (customerId) => {
    window.location.href = `/dashboard.html#appointments?customerId=${customerId}`;
};