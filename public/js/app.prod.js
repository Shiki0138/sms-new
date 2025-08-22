// SMS Frontend Application - Production Version
class SMSApp {
    constructor() {
        // 本番環境のAPIエンドポイント - 同じドメインのAPIを使用
        this.apiUrl = 'http://localhost:3000/api';
        this.currentUser = null;
        this.token = localStorage.getItem('salon_token');
        this.init();
    }

    init() {
        this.setupRouter();
        this.checkAuth();
    }

    setupRouter() {
        // Supabaseトークンの処理
        if (window.location.hash && window.location.hash.includes('access_token')) {
            // Supabaseからのリダイレクトを検出したら、ログインページへ
            window.location.href = '/login';
            return;
        }

        const path = window.location.pathname;
        const app = document.getElementById('app');

        switch(path) {
            case '/':
                this.renderDashboard();
                break;
            case '/customers':
                this.renderCustomers();
                break;
            case '/appointments':
                this.renderAppointments();
                break;
            case '/staff':
                this.renderStaff();
                break;
            case '/login':
                this.renderLogin();
                break;
            default:
                this.render404();
        }
    }

    async checkAuth() {
        if (!this.token && window.location.pathname !== '/login') {
            window.location.href = '/login';
            return;
        }

        if (this.token) {
            try {
                const response = await fetch(`${this.apiUrl}/dashboard/stats`, {
                    headers: {
                        'Authorization': `Bearer ${this.token}`
                    }
                });
                
                if (!response.ok) {
                    localStorage.removeItem('salon_token');
                    window.location.href = '/login';
                }
            } catch (error) {
                console.error('Auth check failed:', error);
            }
        }
    }

    async apiCall(endpoint, options = {}) {
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.token}`
            }
        };

        const response = await fetch(`${this.apiUrl}${endpoint}`, {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                localStorage.removeItem('salon_token');
                window.location.href = '/login';
            }
            throw new Error(`API call failed: ${response.statusText}`);
        }

        return response.json();
    }

    async renderDashboard() {
        const app = document.getElementById('app');
        app.innerHTML = '<div class="text-center py-8">読み込み中...</div>';

        try {
            const stats = await this.apiCall('/dashboard/stats');
            
            app.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div class="bg-white rounded-lg shadow p-6">
                    <div class="flex items-center">
                        <div class="p-3 bg-blue-100 rounded-full">
                            <i class="fas fa-users text-blue-500 text-2xl"></i>
                        </div>
                        <div class="ml-4">
                            <p class="text-gray-500 text-sm">総顧客数</p>
                            <p class="text-2xl font-semibold">${stats.totalCustomers}</p>
                        </div>
                    </div>
                </div>
                <div class="bg-white rounded-lg shadow p-6">
                    <div class="flex items-center">
                        <div class="p-3 bg-green-100 rounded-full">
                            <i class="fas fa-calendar-check text-green-500 text-2xl"></i>
                        </div>
                        <div class="ml-4">
                            <p class="text-gray-500 text-sm">今日の予約</p>
                            <p class="text-2xl font-semibold">${stats.todayAppointments}</p>
                        </div>
                    </div>
                </div>
                <div class="bg-white rounded-lg shadow p-6">
                    <div class="flex items-center">
                        <div class="p-3 bg-yellow-100 rounded-full">
                            <i class="fas fa-yen-sign text-yellow-500 text-2xl"></i>
                        </div>
                        <div class="ml-4">
                            <p class="text-gray-500 text-sm">今月の売上</p>
                            <p class="text-2xl font-semibold">¥${stats.monthlyRevenue.toLocaleString()}</p>
                        </div>
                    </div>
                </div>
                <div class="bg-white rounded-lg shadow p-6">
                    <div class="flex items-center">
                        <div class="p-3 bg-purple-100 rounded-full">
                            <i class="fas fa-user-tie text-purple-500 text-2xl"></i>
                        </div>
                        <div class="ml-4">
                            <p class="text-gray-500 text-sm">アクティブスタッフ</p>
                            <p class="text-2xl font-semibold">${stats.activeStaff}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div class="bg-white rounded-lg shadow p-6">
                    <h2 class="text-lg font-semibold mb-4">本日の予約</h2>
                    <div class="space-y-3">
                        ${stats.todaySchedule.length > 0 ? stats.todaySchedule.map(apt => `
                        <div class="flex items-center justify-between p-3 bg-gray-50 rounded">
                            <div>
                                <p class="font-medium">${apt.customerName}</p>
                                <p class="text-sm text-gray-500">${apt.time} - ${apt.service}</p>
                            </div>
                            <span class="text-sm ${apt.status === '確定' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'} px-2 py-1 rounded">${apt.status}</span>
                        </div>
                        `).join('') : '<p class="text-gray-500">本日の予約はありません</p>'}
                    </div>
                </div>

                <div class="bg-white rounded-lg shadow p-6">
                    <h2 class="text-lg font-semibold mb-4">スタッフ稼働状況</h2>
                    <div class="space-y-3">
                        ${stats.staffStatus.map(staff => `
                        <div class="flex items-center justify-between">
                            <div class="flex items-center">
                                <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(staff.name)}" class="w-10 h-10 rounded-full mr-3">
                                <div>
                                    <p class="font-medium">${staff.name}</p>
                                    <p class="text-sm text-gray-500">${staff.role}</p>
                                </div>
                            </div>
                            <span class="text-sm ${staff.status === '勤務中' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'} px-2 py-1 rounded">${staff.status}</span>
                        </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        } catch (error) {
            console.error('Dashboard error:', error);
            app.innerHTML = `
                <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    データの読み込みに失敗しました。再度お試しください。
                </div>
            `;
        }
    }

    async renderCustomers() {
        const app = document.getElementById('app');
        app.innerHTML = '<div class="text-center py-8">読み込み中...</div>';

        try {
            const data = await this.apiCall('/customers');
            
            app.innerHTML = `
            <div class="bg-white rounded-lg shadow">
                <div class="p-6 border-b">
                    <div class="flex justify-between items-center">
                        <h1 class="text-2xl font-semibold">顧客管理</h1>
                        <button class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
                            <i class="fas fa-plus mr-2"></i>新規顧客登録
                        </button>
                    </div>
                </div>
                
                <div class="p-6">
                    <div class="flex gap-4 mb-6">
                        <input type="text" placeholder="顧客名で検索..." 
                            class="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500">
                        <select class="px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500">
                            <option>全ての顧客</option>
                            <option>VIP顧客</option>
                            <option>新規顧客</option>
                        </select>
                    </div>

                    <div class="overflow-x-auto">
                        <table class="min-w-full">
                            <thead>
                                <tr class="border-b">
                                    <th class="text-left py-3 px-4">顧客名</th>
                                    <th class="text-left py-3 px-4">電話番号</th>
                                    <th class="text-left py-3 px-4">最終来店日</th>
                                    <th class="text-left py-3 px-4">来店回数</th>
                                    <th class="text-left py-3 px-4">ステータス</th>
                                    <th class="text-left py-3 px-4">アクション</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${data.customers.map(customer => `
                                <tr class="border-b hover:bg-gray-50">
                                    <td class="py-3 px-4">
                                        <div class="flex items-center">
                                            <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(customer.name)}" class="w-8 h-8 rounded-full mr-3">
                                            <span>${customer.name}</span>
                                        </div>
                                    </td>
                                    <td class="py-3 px-4">${customer.phone}</td>
                                    <td class="py-3 px-4">${customer.lastVisit}</td>
                                    <td class="py-3 px-4">${customer.visitCount}回</td>
                                    <td class="py-3 px-4">
                                        <span class="text-sm ${this.getStatusColor(customer.status)} px-2 py-1 rounded">${customer.status}</span>
                                    </td>
                                    <td class="py-3 px-4">
                                        <button onclick="app.editCustomer(${customer.id})" class="text-blue-500 hover:text-blue-700 mr-2">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        <button onclick="app.deleteCustomer(${customer.id})" class="text-red-500 hover:text-red-700">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </td>
                                </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>

                    <div class="flex justify-between items-center mt-6">
                        <p class="text-gray-600">全${data.total}件中 ${((data.page - 1) * 10) + 1}-${Math.min(data.page * 10, data.total)}件を表示</p>
                        <div class="flex gap-2">
                            ${data.page > 1 ? `<button onclick="app.loadCustomersPage(${data.page - 1})" class="px-3 py-1 border rounded hover:bg-gray-100">前へ</button>` : ''}
                            ${Array.from({length: Math.min(5, data.totalPages)}, (_, i) => i + 1).map(page => `
                                <button onclick="app.loadCustomersPage(${page})" class="px-3 py-1 ${page === data.page ? 'bg-blue-500 text-white' : 'border'} rounded hover:bg-gray-100">${page}</button>
                            `).join('')}
                            ${data.page < data.totalPages ? `<button onclick="app.loadCustomersPage(${data.page + 1})" class="px-3 py-1 border rounded hover:bg-gray-100">次へ</button>` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
        } catch (error) {
            console.error('Customers error:', error);
            app.innerHTML = `
                <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    顧客データの読み込みに失敗しました。
                </div>
            `;
        }
    }

    renderAppointments() {
        const app = document.getElementById('app');
        app.innerHTML = `
            <div class="bg-white rounded-lg shadow p-6">
                <h1 class="text-2xl font-semibold mb-6">予約管理</h1>
                <p class="text-gray-600">予約管理機能は現在開発中です。</p>
            </div>
        `;
    }

    renderStaff() {
        const app = document.getElementById('app');
        app.innerHTML = `
            <div class="bg-white rounded-lg shadow p-6">
                <h1 class="text-2xl font-semibold mb-6">スタッフ管理</h1>
                <p class="text-gray-600">スタッフ管理機能は現在開発中です。</p>
            </div>
        `;
    }

    renderLogin() {
        const app = document.getElementById('app');
        app.innerHTML = `
            <div class="min-h-screen flex items-center justify-center">
                <div class="bg-white p-8 rounded-lg shadow-lg w-96">
                    <h2 class="text-2xl font-semibold text-center mb-6">SMS ログイン</h2>
                    
                    <div class="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-4">
                        <p class="text-sm font-bold">デモアカウント情報：</p>
                        <p class="text-sm mt-1">Email: <span class="font-mono">admin@salon.com</span></p>
                        <p class="text-sm">Password: <span class="font-mono">admin123</span></p>
                    </div>

                    <form onsubmit="app.handleLogin(event)">
                        <div class="mb-4">
                            <label class="block text-gray-700 text-sm font-bold mb-2">
                                メールアドレス
                            </label>
                            <input type="email" id="email" required 
                                class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500" 
                                placeholder="admin@salon.com"
                                value="admin@salon.com">
                        </div>
                        <div class="mb-6">
                            <label class="block text-gray-700 text-sm font-bold mb-2">
                                パスワード
                            </label>
                            <input type="password" id="password" required 
                                class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500" 
                                placeholder="admin123"
                                value="admin123">
                        </div>
                        
                        <div id="loginError" class="hidden bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4"></div>
                        
                        <button type="submit" class="w-full bg-blue-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-600">
                            ログイン
                        </button>
                    </form>

                    <div class="mt-6 text-center text-sm text-gray-600">
                        <p>※ これはデモシステムです</p>
                        <p class="mt-2">※ 実際のシステムでは適切な認証を使用してください</p>
                    </div>
                </div>
            </div>
        `;
        
        // URLハッシュをクリア
        if (window.location.hash) {
            window.history.replaceState(null, null, window.location.pathname);
        }
    }

    render404() {
        const app = document.getElementById('app');
        app.innerHTML = `
            <div class="text-center py-20">
                <h1 class="text-6xl font-bold text-gray-300 mb-4">404</h1>
                <p class="text-xl text-gray-600 mb-8">ページが見つかりません</p>
                <a href="/" class="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600">
                    ダッシュボードに戻る
                </a>
            </div>
        `;
    }

    async handleLogin(event) {
        event.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const errorDiv = document.getElementById('loginError');
        
        // エラー表示をクリア
        errorDiv.classList.add('hidden');
        
        try {
            const response = await fetch(`${this.apiUrl}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'ログインに失敗しました');
            }
            
            localStorage.setItem('salon_token', data.accessToken);
            localStorage.setItem('salon_user', JSON.stringify(data.user));
            window.location.href = '/';
        } catch (error) {
            console.error('Login error:', error);
            errorDiv.textContent = error.message || 'ログインエラーが発生しました。デモアカウント情報を確認してください。';
            errorDiv.classList.remove('hidden');
        }
    }

    getStatusColor(status) {
        const colors = {
            'VIP': 'bg-purple-100 text-purple-700',
            '常連': 'bg-blue-100 text-blue-700',
            '新規': 'bg-green-100 text-green-700',
            '休眠': 'bg-gray-100 text-gray-700'
        };
        return colors[status] || 'bg-gray-100 text-gray-700';
    }

    async loadCustomersPage(page) {
        window.location.hash = `#customers?page=${page}`;
        this.renderCustomers();
    }

    async editCustomer(id) {
        alert(`顧客編集機能は開発中です (ID: ${id})`);
    }

    async deleteCustomer(id) {
        if (confirm('この顧客を削除してもよろしいですか？')) {
            try {
                await this.apiCall(`/customers/${id}`, { method: 'DELETE' });
                this.renderCustomers();
            } catch (error) {
                alert('削除に失敗しました');
            }
        }
    }
}

// Initialize app
const app = new SMSApp();