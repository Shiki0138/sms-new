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
    if (currentUser) {
        document.getElementById('userName').textContent = currentUser.name || 'Admin';
        document.getElementById('salonName').textContent = currentUser.salonName || 'Salon Lumière';
        document.getElementById('userPlan').textContent = (currentUser.planType || 'light').toUpperCase();
    }
}

// Setup event listeners
function setupEventListeners() {
    // Channel filters
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            currentChannel = btn.dataset.channel;
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderConversations();
        });
    });
    
    // Message input
    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }
    
    // Send button
    const sendButton = document.getElementById('sendButton');
    if (sendButton) {
        sendButton.addEventListener('click', () => sendMessage());
    }
    
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
    
    try {
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
            throw new Error(`API request failed: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('API request error:', error);
        throw error;
    }
}

// Load conversations with mock data fallback
async function loadConversations() {
    try {
        // Use mock data for now since the messaging API isn't fully implemented
        conversations = [
            {
                id: 'conv-001',
                customerId: 'cust-001',
                customerName: '田中 さくら',
                channel: 'line',
                lastMessage: {
                    content: '次回の予約は来週の土曜日でお願いします。',
                    timestamp: new Date(Date.now() - 3600000).toISOString(),
                    isFromCustomer: true,
                    status: 'delivered'
                },
                unreadCount: 0,
                updatedAt: new Date(Date.now() - 3600000).toISOString()
            },
            {
                id: 'conv-002',
                customerId: 'cust-002',
                customerName: '佐藤 美由紀',
                channel: 'email',
                lastMessage: {
                    content: '先日はありがとうございました。とても満足しています！',
                    timestamp: new Date(Date.now() - 7200000).toISOString(),
                    isFromCustomer: true,
                    status: 'delivered'
                },
                unreadCount: 1,
                updatedAt: new Date(Date.now() - 7200000).toISOString()
            },
            {
                id: 'conv-003',
                customerId: 'cust-003',
                customerName: '高橋 恵子',
                channel: 'instagram',
                lastMessage: {
                    content: '新しいヘアスタイルの写真見せてください！',
                    timestamp: new Date(Date.now() - 14400000).toISOString(),
                    isFromCustomer: false,
                    status: 'read'
                },
                unreadCount: 0,
                updatedAt: new Date(Date.now() - 14400000).toISOString()
            }
        ];
        
        renderConversations();
    } catch (error) {
        console.error('Load conversations error:', error);
        showNotification('会話の読み込みに失敗しました', 'error');
    }
}

// Render conversations
function renderConversations() {
    const container = document.getElementById('conversationsList');
    if (!container) return;
    
    let filteredConversations = conversations;
    if (currentChannel !== 'all') {
        filteredConversations = conversations.filter(c => c.channel === currentChannel);
    }
    
    if (filteredConversations.length === 0) {
        container.innerHTML = '<div class="no-conversations">会話がありません</div>';
        return;
    }
    
    container.innerHTML = filteredConversations.map(conv => `
        <div class="conversation-item ${conv.unreadCount > 0 ? 'unread' : ''}" onclick="selectConversation('${conv.id}')">
            <div class="conversation-header">
                <div class="customer-name">${conv.customerName}</div>
                <div class="conversation-time">${formatRelativeTime(conv.lastMessage.timestamp)}</div>
            </div>
            <div class="conversation-preview">
                <div class="channel-icon">${getChannelIcon(conv.channel)}</div>
                <div class="message-preview">${conv.lastMessage.content}</div>
            </div>
            ${conv.unreadCount > 0 ? `<div class="unread-badge">${conv.unreadCount}</div>` : ''}
        </div>
    `).join('');
}

// Select conversation
async function selectConversation(conversationId) {
    currentConversation = conversations.find(c => c.id === conversationId);
    if (!currentConversation) return;
    
    // Mark as read
    currentConversation.unreadCount = 0;
    
    // Update UI
    document.querySelectorAll('.conversation-item').forEach(item => {
        item.classList.remove('selected');
    });
    event.currentTarget.classList.add('selected');
    
    // Load messages
    await loadMessages(conversationId);
    
    // Update customer info
    updateCustomerInfo();
    
    // Re-render conversations to update unread count
    renderConversations();
}

// Load messages for a conversation
async function loadMessages(conversationId) {
    try {
        // Use mock messages for now
        const mockMessages = [
            {
                id: 'msg-001',
                content: 'こんにちは！本日の予約の確認です。',
                timestamp: new Date(Date.now() - 7200000).toISOString(),
                isFromCustomer: false,
                status: 'read'
            },
            {
                id: 'msg-002',
                content: '確認しました。よろしくお願いします。',
                timestamp: new Date(Date.now() - 6000000).toISOString(),
                isFromCustomer: true,
                status: 'delivered'
            },
            {
                id: 'msg-003',
                content: currentConversation.lastMessage.content,
                timestamp: currentConversation.lastMessage.timestamp,
                isFromCustomer: currentConversation.lastMessage.isFromCustomer,
                status: currentConversation.lastMessage.status
            }
        ];
        
        renderMessages(mockMessages);
    } catch (error) {
        console.error('Load messages error:', error);
        showNotification('メッセージの読み込みに失敗しました', 'error');
    }
}

// Render messages
function renderMessages(messages) {
    const container = document.getElementById('messagesContainer');
    if (!container) return;
    
    container.innerHTML = messages.map(msg => `
        <div class="message ${msg.isFromCustomer ? 'customer' : 'salon'}">
            <div class="message-content">${msg.content}</div>
            <div class="message-time">${formatTime(msg.timestamp)}</div>
            ${!msg.isFromCustomer ? `<div class="message-status">${getStatusIcon(msg.status)}</div>` : ''}
        </div>
    `).join('');
    
    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
}

// Send message
async function sendMessage() {
    const input = document.getElementById('messageInput');
    if (!input || !input.value.trim() || !currentConversation) return;
    
    const message = {
        id: `msg-${Date.now()}`,
        content: input.value.trim(),
        timestamp: new Date().toISOString(),
        isFromCustomer: false,
        status: 'sending'
    };
    
    // Add message to UI immediately
    const container = document.getElementById('messagesContainer');
    if (container) {
        container.innerHTML += `
            <div class="message salon">
                <div class="message-content">${message.content}</div>
                <div class="message-time">${formatTime(message.timestamp)}</div>
                <div class="message-status">${getStatusIcon(message.status)}</div>
            </div>
        `;
        container.scrollTop = container.scrollHeight;
    }
    
    // Clear input
    input.value = '';
    
    // Update conversation
    currentConversation.lastMessage = {
        content: message.content,
        timestamp: message.timestamp,
        isFromCustomer: false,
        status: 'sent'
    };
    currentConversation.updatedAt = message.timestamp;
    
    // Re-render conversations
    renderConversations();
    
    // In production, send to API
    // await apiRequest(`/messages/${currentConversation.id}`, {
    //     method: 'POST',
    //     body: JSON.stringify({ content: message.content, channel: currentConversation.channel })
    // });
}

// Update customer info panel
function updateCustomerInfo() {
    if (!currentConversation) return;
    
    document.getElementById('customerName').textContent = currentConversation.customerName;
    document.getElementById('customerPhone').textContent = currentConversation.customerPhone || '未登録';
    document.getElementById('customerEmail').textContent = currentConversation.customerEmail || '未登録';
    document.getElementById('lastVisit').textContent = currentConversation.lastVisit || '情報なし';
}

// Start message polling
function startMessagePolling() {
    // Poll every 10 seconds for new messages
    messagePollingInterval = setInterval(() => {
        if (currentConversation) {
            // In production, this would check for new messages
            console.log('Checking for new messages...');
        }
    }, 10000);
}

// Utility functions
function formatRelativeTime(timestamp) {
    const now = new Date();
    const date = new Date(timestamp);
    const diff = now - date;
    
    if (diff < 60000) return '今';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}時間前`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}日前`;
    
    return date.toLocaleDateString('ja-JP');
}

function formatTime(timestamp) {
    return new Date(timestamp).toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getChannelIcon(channel) {
    const icons = {
        line: '💚',
        email: '✉️',
        sms: '💬',
        instagram: '📷'
    };
    return icons[channel] || '💬';
}

function getStatusIcon(status) {
    const icons = {
        sending: '⏳',
        sent: '✓',
        delivered: '✓✓',
        read: '👁️',
        failed: '❌'
    };
    return icons[status] || '';
}

function showNotification(message, type = 'info') {
    console.log(`${type}: ${message}`);
}

function showError(message) {
    showNotification(message, 'error');
}

function logout() {
    localStorage.removeItem('salon_token');
    localStorage.removeItem('salon_user');
    sessionStorage.removeItem('salon_token');
    sessionStorage.removeItem('salon_user');
    
    if (messagePollingInterval) {
        clearInterval(messagePollingInterval);
    }
    
    window.location.href = '/login.html';
}