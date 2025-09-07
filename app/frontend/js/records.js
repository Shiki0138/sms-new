/**
 * カルテ管理システム - records.js
 * 美容室VOTAN テーマ対応
 */

// グローバル状態管理
const RecordManager = {
    records: [],
    customers: [],
    currentFilter: 'all',
    searchQuery: '',
    
    // 初期化
    init() {
        console.log('Record Manager initialized');
        this.loadRecords();
        this.loadCustomers();
        this.initializeEventListeners();
    },

    // イベントリスナーの初期化
    initializeEventListeners() {
        // 検索入力
        const searchInput = document.getElementById('recordSearch');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.searchRecords(e.target.value);
                }, 300);
            });
        }

        // 日付フィルター
        const startDate = document.getElementById('startDate');
        const endDate = document.getElementById('endDate');
        if (startDate) startDate.addEventListener('change', () => this.applyFilters());
        if (endDate) endDate.addEventListener('change', () => this.applyFilters());

        // モーダル関連
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModal(e.target);
            }
        });

        // ESCキーでモーダルを閉じる
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const openModal = document.querySelector('.modal[style*="display: block"]');
                if (openModal) {
                    this.closeModal(openModal);
                }
            }
        });

        // フォーム送信
        const newRecordForm = document.getElementById('newRecordForm');
        if (newRecordForm) {
            newRecordForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleNewRecordSubmit(e.target);
            });
        }
    },

    // カルテデータの読み込み
    async loadRecords() {
        try {
            const response = await fetch('/api/records');
            if (response.ok) {
                const data = await response.json();
                this.records = data.records || [];
            } else {
                // モックデータを使用
                this.records = this.getMockRecords();
            }
            this.displayRecords();
        } catch (error) {
            console.error('Failed to load records:', error);
            this.records = this.getMockRecords();
            this.displayRecords();
        }
    },

    // 顧客データの読み込み
    async loadCustomers() {
        try {
            const response = await fetch('/api/customers');
            if (response.ok) {
                const data = await response.json();
                this.customers = data.customers || [];
            } else {
                this.customers = this.getMockCustomers();
            }
            this.populateCustomerSelect();
        } catch (error) {
            console.error('Failed to load customers:', error);
            this.customers = this.getMockCustomers();
            this.populateCustomerSelect();
        }
    },

    // モックカルテデータ
    getMockRecords() {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        const lastWeek = new Date(today);
        lastWeek.setDate(today.getDate() - 7);

        return [
            {
                id: 1,
                customerId: 1,
                customerName: '田中 花子',
                treatmentDate: today.toISOString().split('T')[0],
                services: [
                    { name: 'カット&カラー', price: 8000 },
                    { name: 'トリートメント', price: 3000 }
                ],
                hairCondition: '乾燥',
                usedProducts: 'オーガニックカラー剤, モイスチャートリートメント',
                treatmentNotes: '根元のリタッチカラーとカット。髪質が乾燥気味なのでトリートメントも実施。お客様から「しっとり感が欲しい」とのご要望。',
                nextRecommendation: '次回は6週間後、カラーメンテナンス予定',
                totalAmount: 11000,
                stylist: '佐藤スタイリスト',
                createdAt: new Date().toISOString()
            },
            {
                id: 2,
                customerId: 2,
                customerName: '佐藤 美香',
                treatmentDate: yesterday.toISOString().split('T')[0],
                services: [
                    { name: 'パーマ', price: 12000 }
                ],
                hairCondition: '健康',
                usedProducts: 'デジタルパーマ液（ソフトタイプ）',
                treatmentNotes: '初回パーマ。ゆるふわなウェーブをご希望。髪質は健康で反応も良好。仕上がりに満足していただけました。',
                nextRecommendation: '3ヶ月後にパーマ落ち具合を確認',
                totalAmount: 12000,
                stylist: '田中スタイリスト',
                createdAt: new Date().toISOString()
            },
            {
                id: 3,
                customerId: 3,
                customerName: '山田 良子',
                treatmentDate: lastWeek.toISOString().split('T')[0],
                services: [
                    { name: 'カット', price: 4000 },
                    { name: 'ヘッドスパ', price: 4500 }
                ],
                hairCondition: '敏感',
                usedProducts: '敏感肌用シャンプー, オーガニックトリートメント',
                treatmentNotes: '敏感肌のため、使用する製品を慎重に選択。頭皮マッサージを丁寧に行い、リラックスしていただけました。',
                nextRecommendation: '月1回のヘッドスパを継続',
                totalAmount: 8500,
                stylist: '佐藤スタイリスト',
                createdAt: new Date().toISOString()
            }
        ];
    },

    // モック顧客データ
    getMockCustomers() {
        return [
            { id: 1, name: '田中 花子', phone: '090-1234-5678' },
            { id: 2, name: '佐藤 美香', phone: '090-2345-6789' },
            { id: 3, name: '山田 良子', phone: '090-3456-7890' },
            { id: 4, name: '高橋 恵子', phone: '090-4567-8901' }
        ];
    },

    // カルテ表示
    displayRecords(recordsToShow = null) {
        const records = recordsToShow || this.records;
        const grid = document.getElementById('recordsGrid');
        
        if (!grid) return;

        if (records.length === 0) {
            grid.innerHTML = `
                <div class="no-records">
                    <div style="text-align: center; padding: 60px 20px; color: var(--text-medium);">
                        <div style="font-size: 3rem; margin-bottom: 1rem;">📋</div>
                        <h3 style="margin: 0 0 0.5rem; color: var(--text-dark);">カルテがありません</h3>
                        <p style="margin: 0;">新しいカルテを追加してください</p>
                    </div>
                </div>
            `;
            return;
        }

        const recordsHTML = records.map(record => this.createRecordCard(record)).join('');
        grid.innerHTML = recordsHTML;

        // アニメーション効果
        this.animateCards();
    },

    // カルテカードの作成
    createRecordCard(record) {
        return `
            <div class="record-card" 
                 data-record-id="${record.id}" 
                 data-customer-name="${record.customerName.toLowerCase()}" 
                 data-date="${record.treatmentDate}"
                 style="opacity: 0; transform: translateY(20px);">
                <div class="record-header">
                    <div class="customer-info">
                        <h3 style="margin: 0; color: var(--votan-dark); font-size: 1.3rem; font-weight: 700;">
                            ${record.customerName}
                        </h3>
                        <p style="margin: 5px 0; color: var(--text-medium); font-size: 0.95rem;">
                            💼 ${record.stylist || 'スタイリスト'}
                        </p>
                    </div>
                    <div class="record-date-badge">
                        <span class="record-date">${this.formatDate(record.treatmentDate)}</span>
                    </div>
                </div>
                
                <div class="service-list">
                    <h4 style="margin: 0 0 12px; color: var(--votan-dark); font-weight: 600;">💄 施術内容</h4>
                    <div class="services-container">
                        ${record.services.map(service => `
                            <div class="service-item">
                                <span class="service-name">${service.name}</span>
                                <span class="service-price">¥${service.price.toLocaleString()}</span>
                            </div>
                        `).join('')}
                        <div class="service-item total-item">
                            <span class="service-name">合計</span>
                            <span class="service-price total-price">¥${record.totalAmount.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                ${record.hairCondition ? `
                <div class="condition-section">
                    <div class="condition-item">
                        <span class="condition-icon">🧴</span>
                        <div>
                            <strong>髪の状態:</strong> 
                            <span class="condition-value">${record.hairCondition}</span>
                        </div>
                    </div>
                </div>
                ` : ''}

                ${record.usedProducts ? `
                <div class="products-section">
                    <div class="products-item">
                        <span class="products-icon">✨</span>
                        <div>
                            <strong>使用製品:</strong>
                            <p style="margin: 4px 0 0; color: var(--text-medium); font-size: 14px;">
                                ${record.usedProducts}
                            </p>
                        </div>
                    </div>
                </div>
                ` : ''}

                ${record.treatmentNotes ? `
                <div class="record-notes">
                    <div class="notes-header">
                        <span class="notes-icon">📝</span>
                        <strong>施術ノート</strong>
                    </div>
                    <div class="notes-content">
                        ${record.treatmentNotes}
                    </div>
                </div>
                ` : ''}

                ${record.nextRecommendation ? `
                <div class="recommendation-section">
                    <div class="recommendation-header">
                        <span class="recommendation-icon">💡</span>
                        <strong style="color: var(--info);">次回提案</strong>
                    </div>
                    <div class="recommendation-content">
                        ${record.nextRecommendation}
                    </div>
                </div>
                ` : ''}
                
                <div class="record-actions">
                    <button class="btn btn-sm btn-primary" onclick="RecordManager.editRecord(${record.id})">
                        編集
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="RecordManager.printRecord(${record.id})">
                        印刷
                    </button>
                    <button class="btn btn-sm btn-accent" onclick="RecordManager.copyRecord(${record.id})">
                        複製
                    </button>
                </div>
            </div>
        `;
    },

    // カードのアニメーション
    animateCards() {
        const cards = document.querySelectorAll('.record-card');
        cards.forEach((card, index) => {
            setTimeout(() => {
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
                card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            }, index * 100);
        });
    },

    // 顧客セレクトの設定
    populateCustomerSelect() {
        const select = document.getElementById('customerSelect');
        if (!select || this.customers.length === 0) return;

        // 既存のオプションをクリア（デフォルトオプション以外）
        const defaultOption = select.querySelector('option[value=""]');
        select.innerHTML = '';
        if (defaultOption) {
            select.appendChild(defaultOption);
        } else {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = '顧客を選択してください';
            select.appendChild(option);
        }

        // 顧客オプションを追加
        this.customers.forEach(customer => {
            const option = document.createElement('option');
            option.value = customer.id;
            option.textContent = customer.name;
            select.appendChild(option);
        });
    },

    // 検索機能
    searchRecords(query) {
        this.searchQuery = query;
        this.applyFilters();
    },

    // フィルターの適用
    applyFilters() {
        let filtered = [...this.records];

        // テキスト検索
        if (this.searchQuery.trim()) {
            const query = this.searchQuery.toLowerCase();
            filtered = filtered.filter(record => {
                return record.customerName.toLowerCase().includes(query) ||
                       record.treatmentNotes?.toLowerCase().includes(query) ||
                       record.usedProducts?.toLowerCase().includes(query) ||
                       record.stylist?.toLowerCase().includes(query) ||
                       record.services.some(service => service.name.toLowerCase().includes(query));
            });
        }

        // 日付範囲フィルター
        const startDate = document.getElementById('startDate')?.value;
        const endDate = document.getElementById('endDate')?.value;

        if (startDate) {
            filtered = filtered.filter(record => record.treatmentDate >= startDate);
        }

        if (endDate) {
            filtered = filtered.filter(record => record.treatmentDate <= endDate);
        }

        this.displayRecords(filtered);
    },

    // デフォルト日付の設定
    setDefaultDates() {
        const today = new Date();
        const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
        
        const endDateInput = document.getElementById('endDate');
        const startDateInput = document.getElementById('startDate');
        
        if (endDateInput) {
            endDateInput.value = today.toISOString().split('T')[0];
        }
        
        if (startDateInput) {
            startDateInput.value = thirtyDaysAgo.toISOString().split('T')[0];
        }
    },

    // 新規カルテモーダルを開く
    openNewRecordModal() {
        const modal = document.getElementById('newRecordModal');
        if (modal) {
            modal.style.display = 'block';
            modal.classList.add('show');
            
            // デフォルト値の設定
            const treatmentDate = document.getElementById('treatmentDate');
            if (treatmentDate && !treatmentDate.value) {
                treatmentDate.value = new Date().toISOString().split('T')[0];
            }

            // フォーカスを最初の入力フィールドに
            const firstSelect = modal.querySelector('select');
            if (firstSelect) {
                setTimeout(() => firstSelect.focus(), 100);
            }
        }
    },

    // モーダルを閉じる
    closeModal(modal) {
        if (typeof modal === 'string') {
            modal = document.getElementById(modal);
        }
        
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300);

            // フォームをリセット
            const form = modal.querySelector('form');
            if (form) {
                form.reset();
                this.resetServiceRows();
            }
        }
    },

    // サービス行のリセット
    resetServiceRows() {
        const container = document.getElementById('servicesContainer');
        if (container) {
            container.innerHTML = `
                <div class="service-row">
                    <select name="service[]" required>
                        <option value="">サービスを選択</option>
                        <option value="カット">カット</option>
                        <option value="カラー">カラー</option>
                        <option value="パーマ">パーマ</option>
                        <option value="トリートメント">トリートメント</option>
                        <option value="ヘッドスパ">ヘッドスパ</option>
                        <option value="セット">セット</option>
                    </select>
                    <input type="number" name="price[]" placeholder="価格" min="0" required>
                    <button type="button" onclick="RecordManager.addServiceRow()">+</button>
                </div>
            `;
        }
    },

    // サービス行の追加
    addServiceRow() {
        const container = document.getElementById('servicesContainer');
        if (!container) return;

        const newRow = document.createElement('div');
        newRow.className = 'service-row';
        newRow.innerHTML = `
            <select name="service[]" required>
                <option value="">サービスを選択</option>
                <option value="カット">カット</option>
                <option value="カラー">カラー</option>
                <option value="パーマ">パーマ</option>
                <option value="トリートメント">トリートメント</option>
                <option value="ヘッドスパ">ヘッドスパ</option>
                <option value="セット">セット</option>
            </select>
            <input type="number" name="price[]" placeholder="価格" min="0" required>
            <button type="button" onclick="RecordManager.removeServiceRow(this)">-</button>
        `;
        container.appendChild(newRow);
    },

    // サービス行の削除
    removeServiceRow(button) {
        const row = button.parentElement;
        if (row.parentElement.children.length > 1) {
            row.remove();
        }
    },

    // 新規カルテフォーム送信
    async handleNewRecordSubmit(form) {
        try {
            const formData = new FormData(form);
            
            // サービスデータの収集
            const services = [];
            const serviceNames = formData.getAll('service[]');
            const servicePrices = formData.getAll('price[]');
            
            for (let i = 0; i < serviceNames.length; i++) {
                if (serviceNames[i] && servicePrices[i]) {
                    services.push({
                        name: serviceNames[i],
                        price: parseInt(servicePrices[i])
                    });
                }
            }

            if (services.length === 0) {
                this.showError('最低1つのサービスを追加してください');
                return;
            }

            const recordData = {
                customerId: parseInt(formData.get('customerId')),
                treatmentDate: formData.get('treatmentDate'),
                services: services,
                totalAmount: services.reduce((sum, service) => sum + service.price, 0),
                hairCondition: formData.get('hairCondition') || '',
                usedProducts: formData.get('usedProducts') || '',
                treatmentNotes: formData.get('treatmentNotes') || '',
                nextRecommendation: formData.get('nextRecommendation') || '',
                stylist: 'システム管理者', // TODO: ログイン中のスタッフを取得
                createdAt: new Date().toISOString()
            };

            // 顧客名を取得
            const customer = this.customers.find(c => c.id === recordData.customerId);
            if (customer) {
                recordData.customerName = customer.name;
            } else {
                this.showError('顧客を選択してください');
                return;
            }

            // バリデーション
            if (!this.validateRecordData(recordData)) {
                return;
            }

            // サーバーに送信
            const response = await fetch('/api/records', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(recordData)
            });

            if (response.ok) {
                const result = await response.json();
                recordData.id = result.id || Date.now();
                
                // ローカルデータを更新
                this.records.unshift(recordData);
                this.displayRecords();
                
                this.showSuccess('カルテが作成されました');
                this.closeModal('newRecordModal');
            } else {
                this.showError('カルテの作成に失敗しました');
            }
        } catch (error) {
            console.error('Failed to create record:', error);
            this.showError('カルテの作成中にエラーが発生しました');
        }
    },

    // カルテデータのバリデーション
    validateRecordData(data) {
        if (!data.customerId) {
            this.showError('顧客を選択してください');
            return false;
        }

        if (!data.treatmentDate) {
            this.showError('施術日を入力してください');
            return false;
        }

        if (!data.services || data.services.length === 0) {
            this.showError('最低1つのサービスを追加してください');
            return false;
        }

        return true;
    },

    // カルテの編集
    editRecord(id) {
        const record = this.records.find(r => r.id === id);
        if (record) {
            this.showInfo(`カルテ編集機能 (ID: ${id}) - 実装予定`);
        }
    },

    // カルテの印刷
    printRecord(id) {
        const record = this.records.find(r => r.id === id);
        if (record) {
            this.showInfo(`カルテ印刷機能 (ID: ${id}) - 実装予定`);
        }
    },

    // カルテの複製
    copyRecord(id) {
        const record = this.records.find(r => r.id === id);
        if (record) {
            this.showInfo(`カルテ複製機能 (ID: ${id}) - 実装予定`);
        }
    },

    // ユーティリティ関数
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'short'
        });
    },

    // 通知表示
    showSuccess(message) {
        this.showNotification(message, 'success');
    },

    showError(message) {
        this.showNotification(message, 'error');
    },

    showInfo(message) {
        this.showNotification(message, 'info');
    },

    showNotification(message, type = 'info') {
        // 既存の通知を削除
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        // 新しい通知を作成
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">
                    ${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}
                </span>
                <span class="notification-message">${message}</span>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;

        // スタイルを設定
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            padding: 16px 20px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
            border-left: 4px solid ${type === 'success' ? 'var(--success)' : type === 'error' ? 'var(--error)' : 'var(--info)'};
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
            max-width: 400px;
        `;

        document.body.appendChild(notification);

        // アニメーション
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
        }, 100);

        // 自動削除
        setTimeout(() => {
            if (notification.parentElement) {
                notification.style.opacity = '0';
                notification.style.transform = 'translateX(100%)';
                setTimeout(() => {
                    if (notification.parentElement) {
                        notification.remove();
                    }
                }, 300);
            }
        }, 5000);
    }
};

// グローバル関数（HTMLから呼び出し用）
function openNewRecordModal() {
    RecordManager.openNewRecordModal();
}

function closeNewRecordModal() {
    RecordManager.closeModal('newRecordModal');
}

function searchRecords() {
    RecordManager.applyFilters();
}

function addServiceRow() {
    RecordManager.addServiceRow();
}

function removeServiceRow(button) {
    RecordManager.removeServiceRow(button);
}

// ページ読み込み時の初期化
document.addEventListener('DOMContentLoaded', function() {
    RecordManager.init();
    RecordManager.setDefaultDates();
});

// エクスポート
window.RecordManager = RecordManager;