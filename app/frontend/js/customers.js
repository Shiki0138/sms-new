/**
 * 顧客管理システム - SMS サロン管理システム
 * 顧客のCRUD操作と美しいUIインタラクションを提供
 */

class CustomerManager {
    constructor() {
        this.customers = [];
        this.currentCustomer = null;
        this.searchTimeout = null;
        this.currentPage = 1;
        this.itemsPerPage = 20;
        this.totalCustomers = 0;
        this.filters = {
            search: '',
            isActive: undefined,
            sortBy: 'createdAt',
            sortOrder: 'desc'
        };
        this.init();
    }

    /**
     * 初期化
     */
    init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupEventListeners());
        } else {
            this.setupEventListeners();
        }
        this.loadCustomers();
    }

    /**
     * イベントリスナーの設定
     */
    setupEventListeners() {
        // 新規顧客登録ボタン
        const newCustomerBtn = document.getElementById('newCustomerBtn');
        if (newCustomerBtn) {
            newCustomerBtn.addEventListener('click', () => this.showCreateModal());
        }

        // 検索ボタン
        const searchBtn = document.getElementById('searchCustomers');
        if (searchBtn) {
            searchBtn.addEventListener('click', () => this.handleSearch());
        }

        // リアルタイム検索
        const searchInput = document.getElementById('customerSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleSearchInput(e.target.value));
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleSearch();
                }
            });
        }

        // ソート変更
        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('customer-sort')) {
                this.handleSortChange(e.target);
            }
        });

        // モーダル関連
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-backdrop')) {
                this.closeModal();
            }
            
            // 顧客アクション
            if (e.target.classList.contains('view-customer-btn')) {
                const customerId = e.target.dataset.customerId;
                this.viewCustomer(customerId);
            }
            
            if (e.target.classList.contains('edit-customer-btn')) {
                const customerId = e.target.dataset.customerId;
                this.showEditModal(customerId);
            }
            
            if (e.target.classList.contains('delete-customer-btn')) {
                const customerId = e.target.dataset.customerId;
                this.confirmDelete(customerId);
            }
        });

        // フォーム送信
        document.addEventListener('submit', (e) => {
            if (e.target.id === 'customerForm') {
                e.preventDefault();
                this.handleFormSubmit();
            }
        });
    }

    /**
     * 顧客データの読み込み
     */
    async loadCustomers() {
        try {
            window.showLoading(true);
            
            const params = {
                page: this.currentPage,
                limit: this.itemsPerPage,
                ...this.filters
            };

            // 空文字のフィルターを除去
            Object.keys(params).forEach(key => {
                if (params[key] === '' || params[key] === undefined || params[key] === null) {
                    delete params[key];
                }
            });

            const response = await api.getCustomers(params);
            this.customers = response.customers || [];
            this.totalCustomers = response.customers?.length || 0;
            
            this.renderCustomersList();
            this.updatePagination(response.pagination);
            
        } catch (error) {
            console.error('顧客データの読み込みエラー:', error);
            window.showToast('顧客データの読み込みに失敗しました', 'error');
            this.showErrorState();
        } finally {
            window.showLoading(false);
        }
    }

    /**
     * 顧客リストのレンダリング
     */
    renderCustomersList() {
        const container = document.getElementById('customersList');
        if (!container) return;

        if (!this.customers || this.customers.length === 0) {
            container.innerHTML = `
                <div class="text-center py-12">
                    <div class="animate-fade-in">
                        <i class="fas fa-users text-gray-300 text-6xl mb-4"></i>
                        <h3 class="text-xl font-semibold text-gray-500 mb-2">顧客が見つかりません</h3>
                        <p class="text-gray-400 mb-6">検索条件を変更するか、新しい顧客を登録してください</p>
                        <button onclick="window.customerManager.showCreateModal()" 
                                class="btn-primary">
                            <i class="fas fa-plus mr-2"></i>
                            新規顧客登録
                        </button>
                    </div>
                </div>
            `;
            return;
        }

        // 顧客リストヘッダー
        const headerHtml = `
            <div class="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <div class="grid grid-cols-12 gap-4 text-sm font-semibold text-gray-700">
                    <div class="col-span-3">顧客情報</div>
                    <div class="col-span-2">連絡先</div>
                    <div class="col-span-2">来店状況</div>
                    <div class="col-span-2">売上</div>
                    <div class="col-span-2">登録日</div>
                    <div class="col-span-1">アクション</div>
                </div>
            </div>
        `;

        // 顧客リスト
        const customersHtml = this.customers.map((customer, index) => `
            <div class="px-6 py-4 hover:bg-gray-50 transition-colors animate-slide-up" 
                 style="animation-delay: ${index * 0.05}s">
                <div class="grid grid-cols-12 gap-4 items-center">
                    <!-- 顧客情報 -->
                    <div class="col-span-3">
                        <div class="flex items-center">
                            <div class="w-12 h-12 salon-gradient rounded-full flex items-center justify-center mr-4 text-white font-semibold">
                                ${customer.firstName.charAt(0)}${customer.lastName.charAt(0)}
                            </div>
                            <div>
                                <p class="font-semibold text-gray-900 japanese-text">
                                    ${customer.firstName} ${customer.lastName}
                                </p>
                                <div class="flex items-center mt-1">
                                    <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                        customer.isActive 
                                            ? 'bg-green-100 text-green-800' 
                                            : 'bg-gray-100 text-gray-800'
                                    }">
                                        <i class="fas fa-circle text-xs mr-1 ${
                                            customer.isActive ? 'text-green-400' : 'text-gray-400'
                                        }"></i>
                                        ${customer.isActive ? 'アクティブ' : '非アクティブ'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 連絡先 -->
                    <div class="col-span-2">
                        <div class="text-sm text-gray-900">
                            <div class="flex items-center mb-1">
                                <i class="fas fa-envelope text-gray-400 mr-2"></i>
                                <span class="truncate">${customer.email}</span>
                            </div>
                            <div class="flex items-center">
                                <i class="fas fa-phone text-gray-400 mr-2"></i>
                                <span>${customer.phone || '未登録'}</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 来店状況 -->
                    <div class="col-span-2">
                        <div class="text-sm">
                            <div class="font-semibold text-gray-900 mb-1">
                                来店回数: <span class="text-primary-600">${customer.totalVisits || 0}回</span>
                            </div>
                            <div class="text-gray-600">
                                最終来店: ${customer.lastVisit 
                                    ? window.formatDate(customer.lastVisit, { dateStyle: 'short' })
                                    : '未来店'
                                }
                            </div>
                        </div>
                    </div>
                    
                    <!-- 売上 -->
                    <div class="col-span-2">
                        <div class="text-sm">
                            <div class="font-bold text-lg text-green-600">
                                ${window.formatCurrency(customer.totalSpent || 0)}
                            </div>
                            <div class="text-gray-600">
                                平均: ${customer.totalVisits > 0 
                                    ? window.formatCurrency((customer.totalSpent || 0) / customer.totalVisits)
                                    : '¥0'
                                }
                            </div>
                        </div>
                    </div>
                    
                    <!-- 登録日 -->
                    <div class="col-span-2">
                        <div class="text-sm text-gray-600">
                            ${window.formatDate(customer.createdAt, { 
                                year: 'numeric',
                                month: 'short', 
                                day: 'numeric' 
                            })}
                        </div>
                    </div>
                    
                    <!-- アクション -->
                    <div class="col-span-1">
                        <div class="flex space-x-2">
                            <button class="view-customer-btn text-blue-600 hover:text-blue-800 p-2 rounded-lg hover:bg-blue-50 transition-colors" 
                                    data-customer-id="${customer.id}" 
                                    title="詳細表示">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="edit-customer-btn text-green-600 hover:text-green-800 p-2 rounded-lg hover:bg-green-50 transition-colors" 
                                    data-customer-id="${customer.id}" 
                                    title="編集">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="delete-customer-btn text-red-600 hover:text-red-800 p-2 rounded-lg hover:bg-red-50 transition-colors" 
                                    data-customer-id="${customer.id}" 
                                    title="削除">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

        container.innerHTML = headerHtml + customersHtml;
    }

    /**
     * エラー状態の表示
     */
    showErrorState() {
        const container = document.getElementById('customersList');
        if (!container) return;

        container.innerHTML = `
            <div class="text-center py-12">
                <i class="fas fa-exclamation-triangle text-red-300 text-6xl mb-4"></i>
                <h3 class="text-xl font-semibold text-red-600 mb-2">データの読み込みエラー</h3>
                <p class="text-gray-500 mb-6">顧客データの読み込みに失敗しました</p>
                <button onclick="window.customerManager.loadCustomers()" 
                        class="btn-primary">
                    <i class="fas fa-sync-alt mr-2"></i>
                    再試行
                </button>
            </div>
        `;
    }

    /**
     * 検索入力のハンドル
     */
    handleSearchInput(value) {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            this.filters.search = value.trim();
            this.currentPage = 1;
            this.loadCustomers();
        }, 500);
    }

    /**
     * 検索のハンドル
     */
    handleSearch() {
        const searchInput = document.getElementById('customerSearch');
        if (searchInput) {
            this.filters.search = searchInput.value.trim();
            this.currentPage = 1;
            this.loadCustomers();
        }
    }

    /**
     * ソート変更のハンドル
     */
    handleSortChange(element) {
        const { name, value } = element;
        this.filters[name] = value;
        this.currentPage = 1;
        this.loadCustomers();
    }

    /**
     * 新規作成モーダル表示
     */
    showCreateModal() {
        this.currentCustomer = null;
        this.showModal('新規顧客登録');
    }

    /**
     * 編集モーダル表示
     */
    async showEditModal(customerId) {
        try {
            window.showLoading(true);
            const response = await api.getCustomer(customerId);
            this.currentCustomer = response.customer;
            this.showModal('顧客情報編集');
        } catch (error) {
            console.error('顧客データの読み込みエラー:', error);
            window.showToast('顧客データの読み込みに失敗しました', 'error');
        } finally {
            window.showLoading(false);
        }
    }

    /**
     * モーダル表示
     */
    showModal(title) {
        const isEdit = !!this.currentCustomer;
        
        const modalHtml = `
            <div id="customerModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 modal-backdrop">
                <div class="bg-white rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-screen overflow-y-auto animate-fade-in">
                    <!-- ヘッダー -->
                    <div class="bg-gradient-to-r from-primary-500 to-secondary-500 text-white px-8 py-6 rounded-t-2xl">
                        <div class="flex justify-between items-center">
                            <h2 class="text-2xl font-bold font-display">${title}</h2>
                            <button onclick="window.customerManager.closeModal()" 
                                    class="text-white hover:text-gray-200 text-2xl font-bold p-2 rounded-lg hover:bg-white hover:bg-opacity-20 transition-colors">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>

                    <!-- フォーム -->
                    <div class="p-8">
                        <form id="customerForm" class="space-y-6">
                            <!-- 基本情報 -->
                            <div class="bg-gray-50 rounded-xl p-6">
                                <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                    <i class="fas fa-user mr-2 text-primary-500"></i>
                                    基本情報
                                </h3>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label class="block text-sm font-semibold text-gray-700 mb-2">姓 *</label>
                                        <input type="text" name="lastName" required 
                                               class="form-input w-full" 
                                               placeholder="田中"
                                               value="${isEdit ? this.currentCustomer.lastName : ''}">
                                    </div>
                                    <div>
                                        <label class="block text-sm font-semibold text-gray-700 mb-2">名 *</label>
                                        <input type="text" name="firstName" required 
                                               class="form-input w-full" 
                                               placeholder="花子"
                                               value="${isEdit ? this.currentCustomer.firstName : ''}">
                                    </div>
                                    <div>
                                        <label class="block text-sm font-semibold text-gray-700 mb-2">メールアドレス *</label>
                                        <input type="email" name="email" required 
                                               class="form-input w-full" 
                                               placeholder="hanako@example.com"
                                               value="${isEdit ? this.currentCustomer.email : ''}">
                                    </div>
                                    <div>
                                        <label class="block text-sm font-semibold text-gray-700 mb-2">電話番号 *</label>
                                        <input type="tel" name="phone" required 
                                               class="form-input w-full" 
                                               placeholder="090-1234-5678"
                                               value="${isEdit ? this.currentCustomer.phone : ''}">
                                    </div>
                                    <div>
                                        <label class="block text-sm font-semibold text-gray-700 mb-2">生年月日</label>
                                        <input type="date" name="dateOfBirth" 
                                               class="form-input w-full"
                                               value="${isEdit && this.currentCustomer.dateOfBirth ? this.currentCustomer.dateOfBirth.split('T')[0] : ''}">
                                    </div>
                                    <div>
                                        <label class="block text-sm font-semibold text-gray-700 mb-2">コミュニケーション方法</label>
                                        <select name="communicationMethod" class="form-input w-full">
                                            <option value="email" ${isEdit && this.currentCustomer.preferences?.communicationMethod === 'email' ? 'selected' : ''}>メール</option>
                                            <option value="sms" ${isEdit && this.currentCustomer.preferences?.communicationMethod === 'sms' ? 'selected' : ''}>SMS</option>
                                            <option value="phone" ${isEdit && this.currentCustomer.preferences?.communicationMethod === 'phone' ? 'selected' : ''}>電話</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <!-- 住所情報 -->
                            <div class="bg-blue-50 rounded-xl p-6">
                                <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                    <i class="fas fa-map-marker-alt mr-2 text-blue-500"></i>
                                    住所情報
                                </h3>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div class="md:col-span-2">
                                        <label class="block text-sm font-semibold text-gray-700 mb-2">住所</label>
                                        <input type="text" name="address.street" 
                                               class="form-input w-full" 
                                               placeholder="東京都渋谷区○○1-2-3"
                                               value="${isEdit ? (this.currentCustomer.address?.street || '') : ''}">
                                    </div>
                                    <div>
                                        <label class="block text-sm font-semibold text-gray-700 mb-2">市区町村</label>
                                        <input type="text" name="address.city" 
                                               class="form-input w-full" 
                                               placeholder="渋谷区"
                                               value="${isEdit ? (this.currentCustomer.address?.city || '') : ''}">
                                    </div>
                                    <div>
                                        <label class="block text-sm font-semibold text-gray-700 mb-2">都道府県</label>
                                        <input type="text" name="address.state" 
                                               class="form-input w-full" 
                                               placeholder="東京都"
                                               value="${isEdit ? (this.currentCustomer.address?.state || '') : ''}">
                                    </div>
                                    <div>
                                        <label class="block text-sm font-semibold text-gray-700 mb-2">郵便番号</label>
                                        <input type="text" name="address.zipCode" 
                                               class="form-input w-full" 
                                               placeholder="150-0001"
                                               value="${isEdit ? (this.currentCustomer.address?.zipCode || '') : ''}">
                                    </div>
                                </div>
                            </div>

                            <!-- 設定・メモ -->
                            <div class="bg-purple-50 rounded-xl p-6">
                                <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                    <i class="fas fa-cog mr-2 text-purple-500"></i>
                                    設定・メモ
                                </h3>
                                <div class="space-y-4">
                                    <div>
                                        <label class="block text-sm font-semibold text-gray-700 mb-2">アレルギー情報</label>
                                        <input type="text" name="allergies" 
                                               class="form-input w-full" 
                                               placeholder="例：ナッツ、化学薬品（カンマ区切り）"
                                               value="${isEdit ? (this.currentCustomer.preferences?.allergies?.join(', ') || '') : ''}">
                                    </div>
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label class="block text-sm font-semibold text-gray-700 mb-2">肌タイプ</label>
                                            <select name="skinType" class="form-input w-full">
                                                <option value="">選択してください</option>
                                                <option value="normal" ${isEdit && this.currentCustomer.preferences?.skinType === 'normal' ? 'selected' : ''}>普通肌</option>
                                                <option value="dry" ${isEdit && this.currentCustomer.preferences?.skinType === 'dry' ? 'selected' : ''}>乾燥肌</option>
                                                <option value="oily" ${isEdit && this.currentCustomer.preferences?.skinType === 'oily' ? 'selected' : ''}>脂性肌</option>
                                                <option value="combination" ${isEdit && this.currentCustomer.preferences?.skinType === 'combination' ? 'selected' : ''}>混合肌</option>
                                                <option value="sensitive" ${isEdit && this.currentCustomer.preferences?.skinType === 'sensitive' ? 'selected' : ''}>敏感肌</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label class="block text-sm font-semibold text-gray-700 mb-2">髪質</label>
                                            <select name="hairType" class="form-input w-full">
                                                <option value="">選択してください</option>
                                                <option value="straight" ${isEdit && this.currentCustomer.preferences?.hairType === 'straight' ? 'selected' : ''}>ストレート</option>
                                                <option value="wavy" ${isEdit && this.currentCustomer.preferences?.hairType === 'wavy' ? 'selected' : ''}>ウェーブ</option>
                                                <option value="curly" ${isEdit && this.currentCustomer.preferences?.hairType === 'curly' ? 'selected' : ''}>カーリー</option>
                                                <option value="coily" ${isEdit && this.currentCustomer.preferences?.hairType === 'coily' ? 'selected' : ''}>コイル</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label class="block text-sm font-semibold text-gray-700 mb-2">メモ・特記事項</label>
                                        <textarea name="notes" rows="4" 
                                                  class="form-input w-full" 
                                                  placeholder="顧客に関するメモや特記事項を記入してください">${isEdit ? (this.currentCustomer.notes || '') : ''}</textarea>
                                    </div>
                                </div>
                            </div>

                            <!-- ボタン -->
                            <div class="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                                <button type="button" 
                                        onclick="window.customerManager.closeModal()" 
                                        class="btn-secondary">
                                    <i class="fas fa-times mr-2"></i>
                                    キャンセル
                                </button>
                                <button type="submit" 
                                        class="btn-primary">
                                    <i class="fas fa-save mr-2"></i>
                                    ${isEdit ? '更新' : '登録'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    /**
     * モーダルクローズ
     */
    closeModal() {
        const modal = document.getElementById('customerModal');
        if (modal) {
            modal.remove();
        }
        this.currentCustomer = null;
    }

    /**
     * フォーム送信のハンドル
     */
    async handleFormSubmit() {
        const form = document.getElementById('customerForm');
        const formData = new FormData(form);
        
        const customerData = {
            firstName: formData.get('firstName').trim(),
            lastName: formData.get('lastName').trim(),
            email: formData.get('email').trim(),
            phone: formData.get('phone').trim(),
            dateOfBirth: formData.get('dateOfBirth') || null,
            address: {
                street: formData.get('address.street')?.trim() || '',
                city: formData.get('address.city')?.trim() || '',
                state: formData.get('address.state')?.trim() || '',
                zipCode: formData.get('address.zipCode')?.trim() || ''
            },
            preferences: {
                communicationMethod: formData.get('communicationMethod') || 'email',
                allergies: formData.get('allergies')?.split(',').map(a => a.trim()).filter(a => a) || [],
                skinType: formData.get('skinType') || '',
                hairType: formData.get('hairType') || ''
            },
            notes: formData.get('notes')?.trim() || ''
        };

        try {
            window.showLoading(true);
            
            if (this.currentCustomer) {
                // 更新
                await api.updateCustomer(this.currentCustomer.id, customerData);
                window.showToast('顧客情報を更新しました', 'success');
            } else {
                // 新規作成
                await api.createCustomer(customerData);
                window.showToast('新しい顧客を登録しました', 'success');
            }
            
            this.closeModal();
            this.loadCustomers();
            
        } catch (error) {
            console.error('顧客データの保存エラー:', error);
            
            let errorMessage = '顧客データの保存に失敗しました';
            if (error.message.includes('already exists')) {
                errorMessage = 'このメールアドレスまたは電話番号は既に登録されています';
            } else if (error.validationErrors) {
                errorMessage = error.validationErrors.map(e => e.msg).join(', ');
            }
            
            window.showToast(errorMessage, 'error');
        } finally {
            window.showLoading(false);
        }
    }

    /**
     * 顧客詳細表示
     */
    async viewCustomer(customerId) {
        try {
            window.showLoading(true);
            const response = await api.getCustomer(customerId);
            const customer = response.customer;
            
            this.showCustomerDetailModal(customer);
        } catch (error) {
            console.error('顧客データの読み込みエラー:', error);
            window.showToast('顧客データの読み込みに失敗しました', 'error');
        } finally {
            window.showLoading(false);
        }
    }

    /**
     * 顧客詳細モーダル表示
     */
    showCustomerDetailModal(customer) {
        const modalHtml = `
            <div id="customerDetailModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 modal-backdrop">
                <div class="bg-white rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-screen overflow-y-auto animate-fade-in">
                    <!-- ヘッダー -->
                    <div class="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-8 py-6 rounded-t-2xl">
                        <div class="flex justify-between items-center">
                            <div class="flex items-center">
                                <div class="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mr-4 text-2xl font-bold">
                                    ${customer.firstName.charAt(0)}${customer.lastName.charAt(0)}
                                </div>
                                <div>
                                    <h2 class="text-2xl font-bold font-display">${customer.firstName} ${customer.lastName}</h2>
                                    <p class="text-blue-100">顧客詳細情報</p>
                                </div>
                            </div>
                            <button onclick="document.getElementById('customerDetailModal').remove()" 
                                    class="text-white hover:text-gray-200 text-2xl font-bold p-2 rounded-lg hover:bg-white hover:bg-opacity-20 transition-colors">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>

                    <div class="p-8">
                        <!-- 基本統計 -->
                        <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                            <div class="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 text-center">
                                <div class="text-3xl font-bold text-green-600">${customer.totalVisits || 0}</div>
                                <div class="text-sm text-green-700 font-medium">総来店回数</div>
                            </div>
                            <div class="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 text-center">
                                <div class="text-3xl font-bold text-blue-600">${window.formatCurrency(customer.totalSpent || 0)}</div>
                                <div class="text-sm text-blue-700 font-medium">総利用額</div>
                            </div>
                            <div class="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 text-center">
                                <div class="text-2xl font-bold text-purple-600">
                                    ${customer.totalVisits > 0 
                                        ? window.formatCurrency((customer.totalSpent || 0) / customer.totalVisits)
                                        : '¥0'
                                    }
                                </div>
                                <div class="text-sm text-purple-700 font-medium">平均利用額</div>
                            </div>
                            <div class="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 text-center">
                                <div class="text-sm font-bold text-orange-600">
                                    ${customer.lastVisit 
                                        ? window.formatDate(customer.lastVisit, { dateStyle: 'short' })
                                        : '未来店'
                                    }
                                </div>
                                <div class="text-sm text-orange-700 font-medium">最終来店日</div>
                            </div>
                        </div>

                        <!-- 詳細情報 -->
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <!-- 基本情報 -->
                            <div class="space-y-6">
                                <div class="bg-gray-50 rounded-xl p-6">
                                    <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                        <i class="fas fa-user mr-2 text-primary-500"></i>
                                        基本情報
                                    </h3>
                                    <div class="space-y-3">
                                        <div class="flex justify-between">
                                            <span class="text-gray-600">メールアドレス:</span>
                                            <span class="font-medium">${customer.email}</span>
                                        </div>
                                        <div class="flex justify-between">
                                            <span class="text-gray-600">電話番号:</span>
                                            <span class="font-medium">${customer.phone || '未登録'}</span>
                                        </div>
                                        <div class="flex justify-between">
                                            <span class="text-gray-600">生年月日:</span>
                                            <span class="font-medium">
                                                ${customer.dateOfBirth 
                                                    ? window.formatDate(customer.dateOfBirth, { dateStyle: 'long' })
                                                    : '未登録'
                                                }
                                            </span>
                                        </div>
                                        <div class="flex justify-between">
                                            <span class="text-gray-600">登録日:</span>
                                            <span class="font-medium">
                                                ${window.formatDate(customer.createdAt, { dateStyle: 'long' })}
                                            </span>
                                        </div>
                                        <div class="flex justify-between">
                                            <span class="text-gray-600">ステータス:</span>
                                            <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                                customer.isActive 
                                                    ? 'bg-green-100 text-green-800' 
                                                    : 'bg-gray-100 text-gray-800'
                                            }">
                                                ${customer.isActive ? 'アクティブ' : '非アクティブ'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <!-- 住所情報 -->
                                <div class="bg-blue-50 rounded-xl p-6">
                                    <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                        <i class="fas fa-map-marker-alt mr-2 text-blue-500"></i>
                                        住所情報
                                    </h3>
                                    <div class="space-y-2">
                                        <div class="text-gray-700">
                                            ${customer.address?.zipCode ? `〒${customer.address.zipCode}` : ''}
                                        </div>
                                        <div class="text-gray-900 font-medium">
                                            ${customer.address?.state || ''} ${customer.address?.city || ''}
                                        </div>
                                        <div class="text-gray-700">
                                            ${customer.address?.street || '住所が登録されていません'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- 設定・メモ -->
                            <div class="space-y-6">
                                <div class="bg-purple-50 rounded-xl p-6">
                                    <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                        <i class="fas fa-cog mr-2 text-purple-500"></i>
                                        設定・特徴
                                    </h3>
                                    <div class="space-y-3">
                                        <div class="flex justify-between">
                                            <span class="text-gray-600">連絡方法:</span>
                                            <span class="font-medium">
                                                ${customer.preferences?.communicationMethod === 'email' ? 'メール' :
                                                  customer.preferences?.communicationMethod === 'sms' ? 'SMS' :
                                                  customer.preferences?.communicationMethod === 'phone' ? '電話' : 'メール'}
                                            </span>
                                        </div>
                                        <div class="flex justify-between">
                                            <span class="text-gray-600">肌タイプ:</span>
                                            <span class="font-medium">
                                                ${customer.preferences?.skinType === 'normal' ? '普通肌' :
                                                  customer.preferences?.skinType === 'dry' ? '乾燥肌' :
                                                  customer.preferences?.skinType === 'oily' ? '脂性肌' :
                                                  customer.preferences?.skinType === 'combination' ? '混合肌' :
                                                  customer.preferences?.skinType === 'sensitive' ? '敏感肌' : '未設定'}
                                            </span>
                                        </div>
                                        <div class="flex justify-between">
                                            <span class="text-gray-600">髪質:</span>
                                            <span class="font-medium">
                                                ${customer.preferences?.hairType === 'straight' ? 'ストレート' :
                                                  customer.preferences?.hairType === 'wavy' ? 'ウェーブ' :
                                                  customer.preferences?.hairType === 'curly' ? 'カーリー' :
                                                  customer.preferences?.hairType === 'coily' ? 'コイル' : '未設定'}
                                            </span>
                                        </div>
                                        ${customer.preferences?.allergies?.length > 0 ? `
                                        <div>
                                            <span class="text-gray-600">アレルギー:</span>
                                            <div class="mt-1 flex flex-wrap gap-2">
                                                ${customer.preferences.allergies.map(allergy => `
                                                    <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                        <i class="fas fa-exclamation-triangle mr-1"></i>
                                                        ${allergy}
                                                    </span>
                                                `).join('')}
                                            </div>
                                        </div>
                                        ` : ''}
                                    </div>
                                </div>

                                ${customer.notes ? `
                                <div class="bg-yellow-50 rounded-xl p-6">
                                    <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                        <i class="fas fa-sticky-note mr-2 text-yellow-500"></i>
                                        メモ・特記事項
                                    </h3>
                                    <p class="text-gray-700 leading-relaxed japanese-text">
                                        ${customer.notes}
                                    </p>
                                </div>
                                ` : ''}
                            </div>
                        </div>

                        <!-- アクションボタン -->
                        <div class="flex justify-end space-x-4 mt-8 pt-6 border-t border-gray-200">
                            <button onclick="window.customerManager.showEditModal('${customer.id}')" 
                                    class="btn-primary">
                                <i class="fas fa-edit mr-2"></i>
                                編集
                            </button>
                            <button onclick="document.getElementById('customerDetailModal').remove()" 
                                    class="btn-secondary">
                                <i class="fas fa-times mr-2"></i>
                                閉じる
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    /**
     * 削除確認
     */
    confirmDelete(customerId) {
        const customer = this.customers.find(c => c.id === customerId);
        if (!customer) return;

        const confirmHtml = `
            <div id="deleteConfirmModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 modal-backdrop">
                <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 animate-fade-in">
                    <div class="p-6">
                        <div class="text-center">
                            <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <i class="fas fa-exclamation-triangle text-red-600 text-2xl"></i>
                            </div>
                            <h3 class="text-lg font-semibold text-gray-900 mb-2">顧客の削除確認</h3>
                            <p class="text-gray-600 mb-6">
                                <strong>${customer.firstName} ${customer.lastName}</strong> さんを削除しますか？<br>
                                この操作は取り消せません。
                            </p>
                            <div class="flex justify-center space-x-4">
                                <button onclick="document.getElementById('deleteConfirmModal').remove()" 
                                        class="btn-secondary">
                                    キャンセル
                                </button>
                                <button onclick="window.customerManager.deleteCustomer('${customerId}')" 
                                        class="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors">
                                    <i class="fas fa-trash mr-2"></i>
                                    削除
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', confirmHtml);
    }

    /**
     * 顧客削除
     */
    async deleteCustomer(customerId) {
        try {
            window.showLoading(true);
            await api.deleteCustomer(customerId);
            
            // 確認モーダルを閉じる
            const confirmModal = document.getElementById('deleteConfirmModal');
            if (confirmModal) {
                confirmModal.remove();
            }

            window.showToast('顧客を削除しました', 'success');
            this.loadCustomers();
            
        } catch (error) {
            console.error('顧客削除エラー:', error);
            window.showToast('顧客の削除に失敗しました', 'error');
        } finally {
            window.showLoading(false);
        }
    }

    /**
     * ページネーション更新
     */
    updatePagination(pagination) {
        // シンプルなページネーション（必要に応じて拡張）
        console.log('Pagination:', pagination);
    }
}

// グローバルインスタンス作成
window.customerManager = new CustomerManager();

// モジュール対応
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CustomerManager;
}