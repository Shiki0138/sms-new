/**
 * Settings Page JavaScript
 * Handles channel configuration and settings management
 */

class SettingsManager {
    constructor() {
        this.currentTab = 'general';
        this.channelConfigs = {};
        this.isLoading = false;
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadChannelConfigs();
    }

    bindEvents() {
        // Settings navigation
        document.querySelectorAll('.settings-nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const tab = e.currentTarget.getAttribute('data-tab');
                this.switchTab(tab);
            });
        });
    }

    switchTab(tab) {
        // Update navigation
        document.querySelectorAll('.settings-nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');

        // Update content
        document.querySelectorAll('.settings-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.getElementById(`${tab}-tab`).classList.add('active');

        this.currentTab = tab;

        // Load channel configuration if switching to channels tab
        if (tab === 'channels') {
            this.loadChannelConfigInterface();
        }
    }

    async loadChannelConfigs() {
        try {
            const token = localStorage.getItem('token') || localStorage.getItem('salon_token') || sessionStorage.getItem('salon_token');
            
            if (!token) {
                console.warn('No authentication token found');
                return;
            }
            
            const response = await fetch('/api/channel-config', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                if (response.status === 404) {
                    console.warn('Channel configuration endpoint not found');
                    // Set default empty configs
                    this.channelConfigs = {};
                    return;
                }
                throw new Error(`Failed to load channel configurations: ${response.status}`);
            }

            const data = await response.json();
            this.channelConfigs = data.configs.reduce((acc, config) => {
                acc[config.channel] = config;
                return acc;
            }, {});

        } catch (error) {
            console.error('Error loading channel configurations:', error);
            // Don't show error notification for initial load failures
            if (error.message && !error.message.includes('404')) {
                this.showNotification('チャネル設定の読み込みに失敗しました', 'error');
            }
            // Set default empty configs to prevent further errors
            this.channelConfigs = {};
        }
    }

    loadChannelConfigInterface() {
        const container = document.getElementById('channel-config-container');
        if (!container) return;

        container.innerHTML = this.renderChannelConfigInterface();
        this.bindChannelEvents();
    }

    renderChannelConfigInterface() {
        const channels = [
            { key: 'sms', name: 'SMS', icon: '📱' },
            { key: 'email', name: 'Email', icon: '📧' },
            { key: 'line', name: 'LINE', icon: '💬' },
            { key: 'instagram', name: 'Instagram', icon: '📷' }
        ];

        return `
            <div class="channel-config-interface">
                <div class="channel-tabs">
                    ${channels.map((channel, index) => `
                        <div class="channel-tab ${index === 0 ? 'active' : ''}" data-channel="${channel.key}">
                            <span>${channel.icon}</span>
                            <span>${channel.name}</span>
                            ${this.renderChannelStatus(channel.key)}
                        </div>
                    `).join('')}
                </div>
                
                <div class="channel-content">
                    ${channels.map((channel, index) => `
                        <div class="channel-panel ${index === 0 ? 'active' : ''}" data-channel="${channel.key}">
                            ${this.renderChannelForm(channel.key)}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    renderChannelStatus(channel) {
        const config = this.channelConfigs[channel];
        
        if (!config) {
            return '<span class="channel-status disconnected">未設定</span>';
        }

        const statusClass = config.connectionStatus || 'disconnected';
        const statusText = {
            'connected': '接続済み',
            'disconnected': '未接続',
            'error': 'エラー',
            'testing': 'テスト中'
        }[statusClass] || '未設定';

        return `<span class="channel-status ${statusClass}">${statusText}</span>`;
    }

    renderChannelForm(channel) {
        const config = this.channelConfigs[channel] || {};
        const forms = {
            sms: this.renderSMSForm(config),
            email: this.renderEmailForm(config),
            line: this.renderLINEForm(config),
            instagram: this.renderInstagramForm(config)
        };

        return forms[channel] || '<p>設定フォームの準備中です。</p>';
    }

    renderSMSForm(config) {
        return `
            <div class="channel-form">
                <h4>SMS設定 (Twilio)</h4>
                
                <div class="form-group">
                    <label for="sms-account-sid">Account SID *</label>
                    <input type="text" id="sms-account-sid" value="${config.config?.accountSid || ''}" placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx">
                </div>
                
                <div class="form-group">
                    <label for="sms-auth-token">Auth Token *</label>
                    <input type="password" id="sms-auth-token" value="${config.config?.authToken || ''}" placeholder="認証トークン">
                </div>
                
                <div class="form-group">
                    <label for="sms-phone-number">送信元電話番号 *</label>
                    <input type="text" id="sms-phone-number" value="${config.config?.phoneNumber || ''}" placeholder="+81XXXXXXXXX">
                </div>
                
                <div class="form-group">
                    <label for="sms-messaging-service-sid">Messaging Service SID (オプション)</label>
                    <input type="text" id="sms-messaging-service-sid" value="${config.config?.messagingServiceSid || ''}" placeholder="MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx">
                </div>
                
                ${this.renderWebhookInfo(config)}
                
                <div class="form-actions">
                    <button type="button" class="btn btn-primary" onclick="settingsManager.saveChannelConfig('sms')">
                        💾 保存
                    </button>
                    <button type="button" class="btn btn-secondary" onclick="settingsManager.testChannelConfig('sms')">
                        🧪 接続テスト
                    </button>
                </div>
            </div>
        `;
    }

    renderEmailForm(config) {
        return `
            <div class="channel-form">
                <h4>Email設定 (SendGrid)</h4>
                
                <div class="form-group">
                    <label for="email-api-key">API Key *</label>
                    <input type="password" id="email-api-key" value="${config.config?.apiKey || ''}" placeholder="SG.xxxxxxxxxx">
                </div>
                
                <div class="form-group">
                    <label for="email-from-email">送信元メールアドレス *</label>
                    <input type="email" id="email-from-email" value="${config.config?.fromEmail || ''}" placeholder="noreply@yourdomain.com">
                </div>
                
                <div class="form-group">
                    <label for="email-from-name">送信者名</label>
                    <input type="text" id="email-from-name" value="${config.config?.fromName || ''}" placeholder="Salon Lumière">
                </div>
                
                <div class="form-group">
                    <label for="email-domain">ドメイン (オプション)</label>
                    <input type="text" id="email-domain" value="${config.config?.domain || ''}" placeholder="yourdomain.com">
                </div>
                
                <div class="form-actions">
                    <button type="button" class="btn btn-primary" onclick="settingsManager.saveChannelConfig('email')">
                        💾 保存
                    </button>
                    <button type="button" class="btn btn-secondary" onclick="settingsManager.testChannelConfig('email')">
                        🧪 接続テスト
                    </button>
                </div>
            </div>
        `;
    }

    renderLINEForm(config) {
        return `
            <div class="channel-form">
                <h4>LINE設定 (Messaging API)</h4>
                
                <div class="form-group">
                    <label for="line-access-token">Channel Access Token *</label>
                    <input type="password" id="line-access-token" value="${config.config?.channelAccessToken || ''}" placeholder="チャネルアクセストークン">
                </div>
                
                <div class="form-group">
                    <label for="line-channel-secret">Channel Secret *</label>
                    <input type="password" id="line-channel-secret" value="${config.config?.channelSecret || ''}" placeholder="チャネルシークレット">
                </div>
                
                <div class="form-group">
                    <label for="line-channel-id">Channel ID (オプション)</label>
                    <input type="text" id="line-channel-id" value="${config.config?.channelId || ''}" placeholder="チャネルID">
                </div>
                
                ${this.renderWebhookInfo(config)}
                
                <div class="form-actions">
                    <button type="button" class="btn btn-primary" onclick="settingsManager.saveChannelConfig('line')">
                        💾 保存
                    </button>
                    <button type="button" class="btn btn-secondary" onclick="settingsManager.testChannelConfig('line')">
                        🧪 接続テスト
                    </button>
                </div>
            </div>
        `;
    }

    renderInstagramForm(config) {
        return `
            <div class="channel-form">
                <h4>Instagram設定 (Messaging API)</h4>
                
                <div class="form-group">
                    <label for="instagram-access-token">Access Token *</label>
                    <input type="password" id="instagram-access-token" value="${config.config?.accessToken || ''}" placeholder="アクセストークン">
                </div>
                
                <div class="form-group">
                    <label for="instagram-business-account-id">Business Account ID *</label>
                    <input type="text" id="instagram-business-account-id" value="${config.config?.businessAccountId || ''}" placeholder="ビジネスアカウントID">
                </div>
                
                <div class="form-group">
                    <label for="instagram-webhook-secret">Webhook Secret</label>
                    <input type="password" id="instagram-webhook-secret" value="${config.config?.webhookSecret || ''}" placeholder="Webhookシークレット">
                </div>
                
                ${this.renderWebhookInfo(config)}
                
                <div class="form-actions">
                    <button type="button" class="btn btn-primary" onclick="settingsManager.saveChannelConfig('instagram')">
                        💾 保存
                    </button>
                    <button type="button" class="btn btn-secondary" onclick="settingsManager.testChannelConfig('instagram')">
                        🧪 接続テスト
                    </button>
                </div>
            </div>
        `;
    }

    renderWebhookInfo(config) {
        if (!config.webhookUrl) return '';

        return `
            <div class="webhook-info">
                <strong>Webhook設定</strong>
                <p>以下のURLをプロバイダーのWebhook設定に登録してください：</p>
                <div class="webhook-url">${config.webhookUrl}</div>
                ${config.webhookSecret ? `<p><strong>Secret:</strong> <code>${config.webhookSecret}</code></p>` : ''}
            </div>
        `;
    }

    bindChannelEvents() {
        // Channel tab switching
        document.querySelectorAll('.channel-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const channel = e.currentTarget.getAttribute('data-channel');
                this.switchChannelTab(channel);
            });
        });
    }

    switchChannelTab(channel) {
        // Update tabs
        document.querySelectorAll('.channel-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`.channel-tab[data-channel="${channel}"]`).classList.add('active');

        // Update panels
        document.querySelectorAll('.channel-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        document.querySelector(`.channel-panel[data-channel="${channel}"]`).classList.add('active');
    }

    async saveChannelConfig(channel) {
        const formData = this.getChannelFormData(channel);
        
        if (!this.validateChannelConfig(channel, formData)) {
            return;
        }

        try {
            this.showLoading();
            
            const response = await fetch(`/api/channel-config/${channel}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    provider: this.getProviderForChannel(channel),
                    config: formData
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to save configuration');
            }

            await this.loadChannelConfigs();
            this.loadChannelConfigInterface();
            this.showNotification('設定を保存しました', 'success');
            
        } catch (error) {
            console.error('Error saving channel config:', error);
            this.showNotification(`設定の保存に失敗しました: ${error.message}`, 'error');
        } finally {
            this.hideLoading();
        }
    }

    async testChannelConfig(channel) {
        try {
            this.showLoading();
            
            const response = await fetch(`/api/channel-config/${channel}?action=test`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            const result = await response.json();
            
            if (result.success) {
                this.showNotification(`${channel.toUpperCase()} 接続テスト成功`, 'success');
            } else {
                this.showNotification(`${channel.toUpperCase()} 接続テスト失敗: ${result.error}`, 'error');
            }

            await this.loadChannelConfigs();
            this.loadChannelConfigInterface();
            
        } catch (error) {
            console.error('Error testing channel config:', error);
            this.showNotification(`接続テストでエラーが発生しました: ${error.message}`, 'error');
        } finally {
            this.hideLoading();
        }
    }

    getChannelFormData(channel) {
        const forms = {
            sms: () => ({
                accountSid: document.getElementById('sms-account-sid').value,
                authToken: document.getElementById('sms-auth-token').value,
                phoneNumber: document.getElementById('sms-phone-number').value,
                messagingServiceSid: document.getElementById('sms-messaging-service-sid').value
            }),
            email: () => ({
                apiKey: document.getElementById('email-api-key').value,
                fromEmail: document.getElementById('email-from-email').value,
                fromName: document.getElementById('email-from-name').value,
                domain: document.getElementById('email-domain').value
            }),
            line: () => ({
                channelAccessToken: document.getElementById('line-access-token').value,
                channelSecret: document.getElementById('line-channel-secret').value,
                channelId: document.getElementById('line-channel-id').value
            }),
            instagram: () => ({
                accessToken: document.getElementById('instagram-access-token').value,
                businessAccountId: document.getElementById('instagram-business-account-id').value,
                webhookSecret: document.getElementById('instagram-webhook-secret').value
            })
        };

        return forms[channel] ? forms[channel]() : {};
    }

    validateChannelConfig(channel, config) {
        const validations = {
            sms: () => config.accountSid && config.authToken && config.phoneNumber,
            email: () => config.apiKey && config.fromEmail,
            line: () => config.channelAccessToken && config.channelSecret,
            instagram: () => config.accessToken && config.businessAccountId
        };

        const isValid = validations[channel] ? validations[channel]() : false;
        
        if (!isValid) {
            this.showNotification('必須フィールドを入力してください', 'error');
        }

        return isValid;
    }

    getProviderForChannel(channel) {
        const providers = {
            sms: 'twilio',
            email: 'sendgrid',
            line: 'line-api',
            instagram: 'instagram-api'
        };

        return providers[channel];
    }

    showLoading() {
        this.isLoading = true;
        // Add loading UI
    }

    hideLoading() {
        this.isLoading = false;
        // Remove loading UI
    }

    showNotification(message, type = 'info') {
        // Simple notification implementation
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 16px rgba(0,0,0,0.2);
            z-index: 10000;
            transition: all 0.3s ease;
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// Initialize settings manager when page loads
let settingsManager;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        settingsManager = new SettingsManager();
    });
} else {
    settingsManager = new SettingsManager();
}