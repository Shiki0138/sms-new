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

        // Load specific interface based on tab
        if (tab === 'channels') {
            this.loadChannelConfigInterface();
        } else if (tab === 'integrations') {
            this.loadIntegrationsInterface();
        } else if (tab === 'automation') {
            this.loadAutomationInterface();
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

    // External Integrations
    loadIntegrationsInterface() {
        const container = document.getElementById('integrations-config-container');
        if (!container) return;

        container.innerHTML = this.renderIntegrationsInterface();
        this.bindIntegrationEvents();
    }

    renderIntegrationsInterface() {
        return `
            <div class="integrations-interface">
                <!-- Hot Pepper Beauty Integration -->
                <div class="integration-card">
                    <div class="integration-header">
                        <h4><i>🌶️</i> ホットペッパービューティー連携</h4>
                        <span class="integration-status ${this.integrations?.hotpepper?.isConnected ? 'connected' : 'disconnected'}">
                            ${this.integrations?.hotpepper?.isConnected ? '連携済み' : '未連携'}
                        </span>
                    </div>
                    <div class="integration-content">
                        <p>ホットペッパービューティーからの予約データや顧客情報を自動同期します。</p>
                        
                        <div class="form-group">
                            <label for="hotpepper-api-key">APIキー</label>
                            <input type="password" id="hotpepper-api-key" 
                                value="${this.integrations?.hotpepper?.apiKey || ''}" 
                                placeholder="ホットペッパーAPIキー">
                        </div>
                        
                        <div class="form-group">
                            <label for="hotpepper-salon-id">サロンID</label>
                            <input type="text" id="hotpepper-salon-id" 
                                value="${this.integrations?.hotpepper?.salonId || ''}" 
                                placeholder="サロンID">
                        </div>
                        
                        <div class="form-group">
                            <label>
                                <input type="checkbox" id="hotpepper-auto-sync" 
                                    ${this.integrations?.hotpepper?.autoSync ? 'checked' : ''}>
                                自動同期を有効にする
                            </label>
                        </div>
                        
                        <div class="form-actions">
                            <button type="button" class="btn btn-primary" onclick="settingsManager.saveIntegration('hotpepper')">
                                💾 保存
                            </button>
                            <button type="button" class="btn btn-secondary" onclick="settingsManager.testIntegration('hotpepper')">
                                🧪 接続テスト
                            </button>
                        </div>
                    </div>
                </div>

                <!-- CSV Import/Export -->
                <div class="integration-card">
                    <div class="integration-header">
                        <h4><i>📊</i> CSV インポート/エクスポート</h4>
                    </div>
                    <div class="integration-content">
                        <p>顧客データや予約データをCSV形式でインポート・エクスポートします。</p>
                        
                        <div class="csv-section">
                            <h5>データインポート</h5>
                            <div class="form-group">
                                <label for="csv-import-type">インポートタイプ</label>
                                <select id="csv-import-type" class="form-select">
                                    <option value="customers">顧客データ</option>
                                    <option value="appointments">予約データ</option>
                                    <option value="services">サービスデータ</option>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label for="csv-file">CSVファイル</label>
                                <input type="file" id="csv-file" accept=".csv" class="form-input">
                            </div>
                            
                            <button type="button" class="btn btn-primary" onclick="settingsManager.importCSV()">
                                📥 インポート
                            </button>
                            
                            <p class="form-note">
                                <a href="#" onclick="settingsManager.downloadTemplate()">テンプレートをダウンロード</a>
                            </p>
                        </div>
                        
                        <div class="csv-section">
                            <h5>データエクスポート</h5>
                            <div class="form-group">
                                <label for="csv-export-type">エクスポートタイプ</label>
                                <select id="csv-export-type" class="form-select">
                                    <option value="customers">顧客データ</option>
                                    <option value="appointments">予約データ</option>
                                    <option value="services">サービスデータ</option>
                                    <option value="sales">売上データ</option>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label for="csv-export-range">期間</label>
                                <select id="csv-export-range" class="form-select">
                                    <option value="all">すべて</option>
                                    <option value="month">今月</option>
                                    <option value="quarter">今四半期</option>
                                    <option value="year">今年</option>
                                    <option value="custom">カスタム</option>
                                </select>
                            </div>
                            
                            <button type="button" class="btn btn-primary" onclick="settingsManager.exportCSV()">
                                📤 エクスポート
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Other Integrations -->
                <div class="integration-card">
                    <div class="integration-header">
                        <h4><i>🔗</i> その他の連携</h4>
                    </div>
                    <div class="integration-content">
                        <p>今後追加予定の連携サービス:</p>
                        <ul>
                            <li>Google Calendar - 予約の自動同期</li>
                            <li>会計ソフト連携 - 売上データの自動転記</li>
                            <li>在庫管理システム - 商品在庫の連携</li>
                            <li>POSシステム - 決済データの連携</li>
                        </ul>
                    </div>
                </div>
            </div>
        `;
    }

    // Automation Settings
    loadAutomationInterface() {
        const container = document.getElementById('automation-config-container');
        if (!container) return;

        container.innerHTML = this.renderAutomationInterface();
        this.bindAutomationEvents();
    }

    renderAutomationInterface() {
        return `
            <div class="automation-interface">
                <!-- Auto Reminder Settings -->
                <div class="automation-card">
                    <div class="automation-header">
                        <h4><i>⏰</i> 自動リマインダー設定</h4>
                        <label class="switch">
                            <input type="checkbox" id="reminder-enabled" 
                                ${this.automations?.reminder?.enabled ? 'checked' : ''}>
                            <span class="slider"></span>
                        </label>
                    </div>
                    <div class="automation-content">
                        <div class="form-group">
                            <label for="reminder-timing">リマインダー送信タイミング</label>
                            <select id="reminder-timing" class="form-select">
                                <option value="24" ${this.automations?.reminder?.timing === 24 ? 'selected' : ''}>予約24時間前</option>
                                <option value="12" ${this.automations?.reminder?.timing === 12 ? 'selected' : ''}>予約12時間前</option>
                                <option value="6" ${this.automations?.reminder?.timing === 6 ? 'selected' : ''}>予約6時間前</option>
                                <option value="2" ${this.automations?.reminder?.timing === 2 ? 'selected' : ''}>予約2時間前</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="reminder-channels">送信チャンネル</label>
                            <div class="checkbox-group">
                                <label>
                                    <input type="checkbox" name="reminder-channel" value="sms" 
                                        ${this.automations?.reminder?.channels?.includes('sms') ? 'checked' : ''}>
                                    SMS
                                </label>
                                <label>
                                    <input type="checkbox" name="reminder-channel" value="email" 
                                        ${this.automations?.reminder?.channels?.includes('email') ? 'checked' : ''}>
                                    Email
                                </label>
                                <label>
                                    <input type="checkbox" name="reminder-channel" value="line" 
                                        ${this.automations?.reminder?.channels?.includes('line') ? 'checked' : ''}>
                                    LINE
                                </label>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label for="reminder-template">メッセージテンプレート</label>
                            <textarea id="reminder-template" class="form-textarea" rows="4">${this.automations?.reminder?.template || 
                                '{customerName}様\n\n明日{appointmentTime}からのご予約をお待ちしております。\n\n{salonName}'}</textarea>
                            <p class="form-note">
                                使用可能な変数: {customerName}, {appointmentDate}, {appointmentTime}, {serviceName}, {staffName}, {salonName}
                            </p>
                        </div>
                    </div>
                </div>

                <!-- Follow-up Messages -->
                <div class="automation-card">
                    <div class="automation-header">
                        <h4><i>💌</i> フォローアップメッセージ</h4>
                        <label class="switch">
                            <input type="checkbox" id="followup-enabled" 
                                ${this.automations?.followup?.enabled ? 'checked' : ''}>
                            <span class="slider"></span>
                        </label>
                    </div>
                    <div class="automation-content">
                        <div class="form-group">
                            <label for="followup-timing">送信タイミング</label>
                            <select id="followup-timing" class="form-select">
                                <option value="1" ${this.automations?.followup?.timing === 1 ? 'selected' : ''}>来店翌日</option>
                                <option value="3" ${this.automations?.followup?.timing === 3 ? 'selected' : ''}>来店3日後</option>
                                <option value="7" ${this.automations?.followup?.timing === 7 ? 'selected' : ''}>来店1週間後</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="followup-template">メッセージテンプレート</label>
                            <textarea id="followup-template" class="form-textarea" rows="4">${this.automations?.followup?.template || 
                                '{customerName}様\n\n先日はご来店ありがとうございました。\nその後、お髪の調子はいかがでしょうか？\n\nまたのご来店を心よりお待ちしております。\n\n{salonName}'}</textarea>
                        </div>
                    </div>
                </div>

                <!-- Birthday Messages -->
                <div class="automation-card">
                    <div class="automation-header">
                        <h4><i>🎂</i> お誕生日メッセージ</h4>
                        <label class="switch">
                            <input type="checkbox" id="birthday-enabled" 
                                ${this.automations?.birthday?.enabled ? 'checked' : ''}>
                            <span class="slider"></span>
                        </label>
                    </div>
                    <div class="automation-content">
                        <div class="form-group">
                            <label for="birthday-template">メッセージテンプレート</label>
                            <textarea id="birthday-template" class="form-textarea" rows="4">${this.automations?.birthday?.template || 
                                '{customerName}様\n\nお誕生日おめでとうございます！🎉\n\n特別な日を記念して、お誕生日限定クーポンをプレゼントいたします。\n\n{salonName}'}</textarea>
                        </div>
                        
                        <div class="form-group">
                            <label>
                                <input type="checkbox" id="birthday-coupon" 
                                    ${this.automations?.birthday?.includeCoupon ? 'checked' : ''}>
                                誕生日クーポンを含める
                            </label>
                        </div>
                    </div>
                </div>

                <div class="form-actions">
                    <button type="button" class="btn btn-primary" onclick="settingsManager.saveAutomationSettings()">
                        💾 すべての設定を保存
                    </button>
                </div>
            </div>
        `;
    }

    // Integration Events
    bindIntegrationEvents() {
        // Add any specific event handlers for integrations
    }

    // Automation Events  
    bindAutomationEvents() {
        // Add any specific event handlers for automation
    }

    // Integration Methods
    async saveIntegration(integration) {
        const config = this.getIntegrationConfig(integration);
        
        try {
            this.showLoading();
            
            const response = await fetch(`/api/integrations/${integration}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token') || localStorage.getItem('salon_token')}`
                },
                body: JSON.stringify(config)
            });

            if (!response.ok) {
                throw new Error('Failed to save integration settings');
            }

            this.showNotification('連携設定を保存しました', 'success');
        } catch (error) {
            console.error('Error saving integration:', error);
            this.showNotification('連携設定の保存に失敗しました', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async testIntegration(integration) {
        try {
            this.showLoading();
            
            const response = await fetch(`/api/integrations/${integration}/test`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token') || localStorage.getItem('salon_token')}`
                }
            });

            const result = await response.json();
            
            if (result.success) {
                this.showNotification('接続テスト成功', 'success');
            } else {
                this.showNotification(`接続テスト失敗: ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('Error testing integration:', error);
            this.showNotification('接続テストでエラーが発生しました', 'error');
        } finally {
            this.hideLoading();
        }
    }

    getIntegrationConfig(integration) {
        if (integration === 'hotpepper') {
            return {
                apiKey: document.getElementById('hotpepper-api-key').value,
                salonId: document.getElementById('hotpepper-salon-id').value,
                autoSync: document.getElementById('hotpepper-auto-sync').checked
            };
        }
        return {};
    }

    // CSV Methods
    async importCSV() {
        const fileInput = document.getElementById('csv-file');
        const importType = document.getElementById('csv-import-type').value;
        
        if (!fileInput.files[0]) {
            this.showNotification('CSVファイルを選択してください', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('file', fileInput.files[0]);
        formData.append('type', importType);

        try {
            this.showLoading();
            
            const response = await fetch('/api/import/csv', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token') || localStorage.getItem('salon_token')}`
                },
                body: formData
            });

            const result = await response.json();
            
            if (response.ok) {
                this.showNotification(`インポート完了: ${result.imported}件`, 'success');
            } else {
                this.showNotification(`インポート失敗: ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('Error importing CSV:', error);
            this.showNotification('CSVインポートでエラーが発生しました', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async exportCSV() {
        const exportType = document.getElementById('csv-export-type').value;
        const exportRange = document.getElementById('csv-export-range').value;
        
        try {
            this.showLoading();
            
            const response = await fetch(`/api/export/csv?type=${exportType}&range=${exportRange}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token') || localStorage.getItem('salon_token')}`
                }
            });

            if (!response.ok) {
                throw new Error('Export failed');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `${exportType}_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            
            this.showNotification('エクスポート完了', 'success');
        } catch (error) {
            console.error('Error exporting CSV:', error);
            this.showNotification('CSVエクスポートでエラーが発生しました', 'error');
        } finally {
            this.hideLoading();
        }
    }

    downloadTemplate() {
        const importType = document.getElementById('csv-import-type').value;
        window.open(`/api/templates/csv/${importType}`, '_blank');
    }

    // Automation Methods
    async saveAutomationSettings() {
        const settings = {
            reminder: {
                enabled: document.getElementById('reminder-enabled').checked,
                timing: parseInt(document.getElementById('reminder-timing').value),
                channels: Array.from(document.querySelectorAll('input[name="reminder-channel"]:checked'))
                    .map(cb => cb.value),
                template: document.getElementById('reminder-template').value
            },
            followup: {
                enabled: document.getElementById('followup-enabled').checked,
                timing: parseInt(document.getElementById('followup-timing').value),
                template: document.getElementById('followup-template').value
            },
            birthday: {
                enabled: document.getElementById('birthday-enabled').checked,
                template: document.getElementById('birthday-template').value,
                includeCoupon: document.getElementById('birthday-coupon').checked
            }
        };

        try {
            this.showLoading();
            
            const response = await fetch('/api/automation/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token') || localStorage.getItem('salon_token')}`
                },
                body: JSON.stringify(settings)
            });

            if (!response.ok) {
                throw new Error('Failed to save automation settings');
            }

            this.showNotification('自動化設定を保存しました', 'success');
        } catch (error) {
            console.error('Error saving automation settings:', error);
            this.showNotification('自動化設定の保存に失敗しました', 'error');
        } finally {
            this.hideLoading();
        }
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