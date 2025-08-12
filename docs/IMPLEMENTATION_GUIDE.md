# SMS システム実装ガイド - ステップバイステップ

## 🎯 このガイドの目的

このガイドは、SMSシステムを新しいプロジェクトでゼロから構築するための完全な実装手順を提供します。各ステップには具体的なコマンドとコードが含まれています。

---

## 📋 実装チェックリスト

### Phase 1: プロジェクト初期化（30分）
- [ ] プロジェクトディレクトリの作成
- [ ] package.jsonの初期化
- [ ] 基本的なディレクトリ構造の作成
- [ ] 依存関係のインストール

### Phase 2: バックエンド実装（2時間）
- [ ] Express.jsサーバーのセットアップ
- [ ] 認証システムの実装
- [ ] APIエンドポイントの作成
- [ ] モックデータの準備

### Phase 3: フロントエンド実装（3時間）
- [ ] HTMLテンプレートの作成
- [ ] SPAルーターの実装
- [ ] API通信の実装
- [ ] UIコンポーネントの作成

### Phase 4: 統合とテスト（1時間）
- [ ] フロントエンドとバックエンドの接続
- [ ] 認証フローのテスト
- [ ] CRUD操作のテスト

### Phase 5: デプロイメント（30分）
- [ ] Vercel設定
- [ ] 環境変数の設定
- [ ] デプロイ実行

---

## 🚀 Phase 1: プロジェクト初期化

### Step 1: プロジェクト作成

```bash
# プロジェクトディレクトリの作成
mkdir sms-salon-system
cd sms-salon-system

# Gitリポジトリの初期化
git init
echo "node_modules/\n.env\n.env.local\n.DS_Store" > .gitignore
```

### Step 2: ディレクトリ構造の作成

```bash
# ディレクトリ構造を一括作成
mkdir -p api src/frontend src/backend public docs scripts

# 必要なファイルをタッチ
touch api/index.js api/package.json
touch src/frontend/index.html src/frontend/app.js src/frontend/auth.html
touch src/backend/server.js src/backend/package.json
touch index.html vercel.json package.json
```

### Step 3: メインpackage.jsonの作成

```json
{
  "name": "sms-salon-management",
  "version": "1.0.0",
  "description": "Salon Management System",
  "main": "api/index.js",
  "scripts": {
    "dev": "cd src/backend && node server.js",
    "dev:frontend": "cd src/frontend && node server.cjs",
    "build": "npm run build:frontend",
    "build:frontend": "mkdir -p public && cp index.html public/ && cp src/frontend/app.prod.js public/app.js",
    "vercel-build": "npm run build",
    "start": "node api/index.js",
    "test": "echo \"No tests configured\""
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "jsonwebtoken": "^9.0.2",
    "bcryptjs": "^2.4.3"
  },
  "devDependencies": {
    "nodemon": "^3.0.0"
  },
  "engines": {
    "node": ">=14.0.0"
  }
}
```

### Step 4: 依存関係のインストール

```bash
# メインプロジェクトの依存関係
npm install

# API用の依存関係
cd api
echo '{
  "name": "sms-api",
  "version": "1.0.0",
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "jsonwebtoken": "^9.0.2",
    "bcryptjs": "^2.4.3"
  }
}' > package.json
npm install

# バックエンド開発用の依存関係
cd ../src/backend
echo '{
  "name": "sms-backend-dev",
  "version": "1.0.0",
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "jsonwebtoken": "^9.0.2",
    "bcryptjs": "^2.4.3"
  }
}' > package.json
npm install

cd ../..
```

---

## 💻 Phase 2: バックエンド実装

### Step 1: メインAPIサーバー (api/index.js)

```javascript
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();

// CORS設定
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://sms-new.vercel.app']
    : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));

app.use(express.json());

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// モックデータベース
const db = {
  users: [
    {
      id: 1,
      email: 'admin@salon.com',
      password: '$2a$10$kFVBZMghl0Y4dGz1ktSjXOmGawrEj3SJZQqcXKxOvvGzFBKu1Qjmq', // admin123
      name: '管理者',
      role: 'admin'
    }
  ],
  customers: [],
  appointments: [],
  staff: []
};

// データ生成関数
function generateMockCustomers(count) {
  const customers = [];
  const statuses = ['VIP', '常連', '新規', '休眠'];
  const names = ['山田太郎', '鈴木花子', '田中一郎', '佐藤美咲', '伊藤健太'];
  
  for (let i = 1; i <= count; i++) {
    customers.push({
      id: i,
      name: names[Math.floor(Math.random() * names.length)] + i,
      phone: `090-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`,
      email: `customer${i}@example.com`,
      lastVisit: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      visitCount: Math.floor(Math.random() * 50) + 1,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      notes: 'お客様のメモ情報',
      createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString()
    });
  }
  return customers;
}

function generateMockAppointments(count) {
  const appointments = [];
  const services = ['カット', 'カラー', 'パーマ', 'トリートメント', 'カット・カラー'];
  const times = ['10:00', '11:00', '14:00', '15:00', '16:00'];
  
  for (let i = 1; i <= count; i++) {
    appointments.push({
      id: i,
      customerId: Math.floor(Math.random() * 45) + 1,
      customerName: `顧客${Math.floor(Math.random() * 45) + 1}`,
      date: new Date().toISOString().split('T')[0],
      time: times[Math.floor(Math.random() * times.length)],
      service: services[Math.floor(Math.random() * services.length)],
      staffId: Math.floor(Math.random() * 6) + 1,
      staffName: `スタッフ${Math.floor(Math.random() * 6) + 1}`,
      status: Math.random() > 0.2 ? '確定' : '未確定',
      createdAt: new Date().toISOString()
    });
  }
  return appointments;
}

function generateMockStaff(count) {
  const staff = [];
  const roles = ['スタイリスト', 'アシスタント', 'マネージャー'];
  const statuses = ['勤務中', '待機中', '休憩中', '退勤'];
  
  for (let i = 1; i <= count; i++) {
    staff.push({
      id: i,
      name: `スタッフ${i}`,
      role: roles[Math.floor(Math.random() * roles.length)],
      status: statuses[Math.floor(Math.random() * statuses.length)],
      skills: ['カット', 'カラー', 'パーマ'].slice(0, Math.floor(Math.random() * 3) + 1),
      rating: (Math.random() * 2 + 3).toFixed(1)
    });
  }
  return staff;
}

// モックデータの初期化
db.customers = generateMockCustomers(45);
db.appointments = generateMockAppointments(8);
db.staff = generateMockStaff(6);

// 認証ミドルウェア
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// ============ API エンドポイント ============

// ヘルスチェック
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// ログイン
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = db.users.find(u => u.email === email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    const userResponse = { ...user };
    delete userResponse.password;
    
    res.json({ token, user: userResponse });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ダッシュボード統計
app.get('/api/dashboard/stats', authenticateToken, (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const todayAppointments = db.appointments.filter(a => a.date === today);
    const activeStaff = db.staff.filter(s => s.status === '勤務中');
    
    res.json({
      totalCustomers: db.customers.length,
      todayAppointments: todayAppointments.length,
      monthlyRevenue: 285000,
      activeStaff: activeStaff.length,
      todaySchedule: todayAppointments.slice(0, 5),
      staffStatus: db.staff.slice(0, 5)
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 顧客一覧
app.get('/api/customers', authenticateToken, (req, res) => {
  try {
    const { search, status, page = 1, limit = 10 } = req.query;
    
    let filteredCustomers = [...db.customers];
    
    if (search) {
      filteredCustomers = filteredCustomers.filter(c => 
        c.name.includes(search) || c.phone.includes(search)
      );
    }
    
    if (status) {
      filteredCustomers = filteredCustomers.filter(c => c.status === status);
    }
    
    const total = filteredCustomers.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const customers = filteredCustomers.slice(offset, offset + limit);
    
    res.json({
      customers,
      total,
      page: parseInt(page),
      totalPages
    });
  } catch (error) {
    console.error('Customers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 顧客詳細
app.get('/api/customers/:id', authenticateToken, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const customer = db.customers.find(c => c.id === id);
    
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    res.json(customer);
  } catch (error) {
    console.error('Customer detail error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 顧客作成
app.post('/api/customers', authenticateToken, (req, res) => {
  try {
    const newCustomer = {
      id: db.customers.length + 1,
      ...req.body,
      visitCount: 0,
      status: '新規',
      createdAt: new Date().toISOString()
    };
    
    db.customers.push(newCustomer);
    res.status(201).json(newCustomer);
  } catch (error) {
    console.error('Create customer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 顧客更新
app.put('/api/customers/:id', authenticateToken, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const index = db.customers.findIndex(c => c.id === id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    db.customers[index] = { ...db.customers[index], ...req.body };
    res.json(db.customers[index]);
  } catch (error) {
    console.error('Update customer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 顧客削除
app.delete('/api/customers/:id', authenticateToken, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const index = db.customers.findIndex(c => c.id === id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    db.customers.splice(index, 1);
    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 予約一覧
app.get('/api/appointments', authenticateToken, (req, res) => {
  try {
    const { date, staffId, status } = req.query;
    let filteredAppointments = [...db.appointments];
    
    if (date) {
      filteredAppointments = filteredAppointments.filter(a => a.date === date);
    }
    
    if (staffId) {
      filteredAppointments = filteredAppointments.filter(a => a.staffId === parseInt(staffId));
    }
    
    if (status) {
      filteredAppointments = filteredAppointments.filter(a => a.status === status);
    }
    
    res.json({
      appointments: filteredAppointments,
      total: filteredAppointments.length
    });
  } catch (error) {
    console.error('Appointments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// スタッフ一覧
app.get('/api/staff', authenticateToken, (req, res) => {
  try {
    res.json({
      staff: db.staff,
      total: db.staff.length
    });
  } catch (error) {
    console.error('Staff error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ルートハンドラー
app.get('/api', (req, res) => {
  res.json({
    message: 'SMS API Server',
    version: '1.0.0',
    endpoints: [
      'POST /api/auth/login',
      'GET /api/dashboard/stats',
      'GET /api/customers',
      'GET /api/appointments',
      'GET /api/staff'
    ]
  });
});

// エラーハンドラー
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Vercel用のエクスポート
module.exports = app;

// ローカル開発用
if (require.main === module) {
  const PORT = process.env.PORT || 5001;
  app.listen(PORT, () => {
    console.log(`API Server running on port ${PORT}`);
  });
}
```

### Step 2: 開発用サーバー (src/backend/server.js)

```javascript
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 5001;

// CORS設定（開発用）
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));

app.use(express.json());

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';

// 以下、api/index.jsと同じコードを使用
// （重複を避けるため、実際の実装では共通化することを推奨）

// ... 同じAPIエンドポイントコード ...

app.listen(PORT, () => {
  console.log(`Development API Server running on http://localhost:${PORT}`);
  console.log('Available endpoints:');
  console.log('- POST /api/auth/login');
  console.log('- GET /api/dashboard/stats');
  console.log('- GET /api/customers');
  console.log('- GET /api/appointments');
  console.log('- GET /api/staff');
});
```

---

## 🎨 Phase 3: フロントエンド実装

### Step 1: メインHTML (index.html)

```html
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <title>SMS - サロン管理システム</title>
    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
</head>
<body class="bg-gray-50">
    <!-- ナビゲーション -->
    <nav class="bg-white shadow-lg" id="nav">
        <div class="max-w-7xl mx-auto px-4">
            <div class="flex justify-between h-16">
                <div class="flex items-center">
                    <span class="text-xl font-semibold">SMS - サロン管理システム</span>
                </div>
                <div class="flex items-center space-x-4" id="navMenu">
                    <!-- 動的に生成 -->
                </div>
            </div>
        </div>
    </nav>

    <!-- メインコンテンツ -->
    <div id="app" class="container mx-auto px-4 py-8">
        <!-- SPAコンテンツ -->
    </div>

    <script src="app.js"></script>
</body>
</html>
```

### Step 2: JavaScriptアプリケーション (src/frontend/app.js)

```javascript
// SMS Frontend Application
class SMSApp {
    constructor() {
        // API設定
        this.apiUrl = window.location.hostname === 'localhost' 
            ? 'http://localhost:5001/api' 
            : '/api';
        
        this.currentUser = null;
        this.token = localStorage.getItem('sms_token');
        this.init();
    }

    init() {
        this.setupRouter();
        this.setupNavigation();
        this.checkAuth();
        
        // ブラウザの戻る/進むボタン対応
        window.addEventListener('popstate', () => this.setupRouter());
    }

    setupNavigation() {
        const navMenu = document.getElementById('navMenu');
        if (!navMenu) return;

        if (this.token) {
            navMenu.innerHTML = `
                <a href="/" class="text-gray-700 hover:text-gray-900">ダッシュボード</a>
                <a href="/customers" class="text-gray-700 hover:text-gray-900">顧客管理</a>
                <a href="/appointments" class="text-gray-700 hover:text-gray-900">予約管理</a>
                <a href="/staff" class="text-gray-700 hover:text-gray-900">スタッフ管理</a>
                <button onclick="app.logout()" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
                    ログアウト
                </button>
            `;
        } else {
            navMenu.innerHTML = '';
        }
    }

    setupRouter() {
        const path = window.location.pathname;
        const app = document.getElementById('app');

        // 認証が必要なページかチェック
        const publicPaths = ['/login', '/auth'];
        if (!this.token && !publicPaths.includes(path)) {
            window.location.href = '/login';
            return;
        }

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
        if (!this.token) return;

        try {
            const response = await fetch(`${this.apiUrl}/dashboard/stats`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            if (!response.ok) {
                this.logout();
            }
        } catch (error) {
            console.error('Auth check failed:', error);
        }
    }

    async apiCall(endpoint, options = {}) {
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.token}`
            }
        };

        try {
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
                    this.logout();
                }
                throw new Error(`API call failed: ${response.statusText}`);
            }

            return response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // ============ レンダリング関数 ============

    async renderDashboard() {
        const app = document.getElementById('app');
        app.innerHTML = this.renderLoading();

        try {
            const stats = await this.apiCall('/dashboard/stats');
            
            app.innerHTML = `
            <div class="space-y-6">
                <h1 class="text-2xl font-semibold">ダッシュボード</h1>
                
                <!-- 統計カード -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    ${this.renderStatCard('総顧客数', stats.totalCustomers, 'users', 'blue')}
                    ${this.renderStatCard('今日の予約', stats.todayAppointments, 'calendar-check', 'green')}
                    ${this.renderStatCard('今月の売上', `¥${stats.monthlyRevenue.toLocaleString()}`, 'yen-sign', 'yellow')}
                    ${this.renderStatCard('アクティブスタッフ', stats.activeStaff, 'user-tie', 'purple')}
                </div>

                <!-- 今日の予定とスタッフ状況 -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    ${this.renderTodaySchedule(stats.todaySchedule)}
                    ${this.renderStaffStatus(stats.staffStatus)}
                </div>
            </div>
            `;
        } catch (error) {
            app.innerHTML = this.renderError('ダッシュボードの読み込みに失敗しました。');
        }
    }

    async renderCustomers() {
        const app = document.getElementById('app');
        app.innerHTML = this.renderLoading();

        try {
            const params = new URLSearchParams(window.location.search);
            const page = params.get('page') || 1;
            
            const data = await this.apiCall(`/customers?page=${page}`);
            
            app.innerHTML = `
            <div class="space-y-6">
                <div class="bg-white rounded-lg shadow">
                    <div class="p-6 border-b">
                        <div class="flex justify-between items-center">
                            <h1 class="text-2xl font-semibold">顧客管理</h1>
                            <button onclick="app.showAddCustomerModal()" 
                                    class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
                                <i class="fas fa-plus mr-2"></i>新規顧客登録
                            </button>
                        </div>
                    </div>
                    
                    <div class="p-6">
                        <!-- 検索・フィルター -->
                        <div class="flex gap-4 mb-6">
                            <input type="text" 
                                   id="customerSearch"
                                   placeholder="顧客名または電話番号で検索..." 
                                   class="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
                                   onkeyup="app.searchCustomers(event)">
                            <select id="statusFilter" 
                                    onchange="app.filterCustomers()"
                                    class="px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500">
                                <option value="">全ての顧客</option>
                                <option value="VIP">VIP顧客</option>
                                <option value="常連">常連顧客</option>
                                <option value="新規">新規顧客</option>
                                <option value="休眠">休眠顧客</option>
                            </select>
                        </div>

                        <!-- 顧客テーブル -->
                        ${this.renderCustomersTable(data.customers)}

                        <!-- ページネーション -->
                        ${this.renderPagination(data)}
                    </div>
                </div>
            </div>
            `;
        } catch (error) {
            app.innerHTML = this.renderError('顧客データの読み込みに失敗しました。');
        }
    }

    renderAppointments() {
        const app = document.getElementById('app');
        app.innerHTML = `
            <div class="bg-white rounded-lg shadow p-6">
                <h1 class="text-2xl font-semibold mb-6">予約管理</h1>
                <div class="text-center py-12">
                    <i class="fas fa-calendar-alt text-6xl text-gray-300 mb-4"></i>
                    <p class="text-gray-600">予約管理機能は現在開発中です。</p>
                </div>
            </div>
        `;
    }

    renderStaff() {
        const app = document.getElementById('app');
        app.innerHTML = `
            <div class="bg-white rounded-lg shadow p-6">
                <h1 class="text-2xl font-semibold mb-6">スタッフ管理</h1>
                <div class="text-center py-12">
                    <i class="fas fa-users text-6xl text-gray-300 mb-4"></i>
                    <p class="text-gray-600">スタッフ管理機能は現在開発中です。</p>
                </div>
            </div>
        `;
    }

    renderLogin() {
        const app = document.getElementById('app');
        const nav = document.getElementById('nav');
        if (nav) nav.style.display = 'none';

        app.innerHTML = `
            <div class="min-h-screen flex items-center justify-center -mt-16">
                <div class="bg-white p-8 rounded-lg shadow-lg w-96">
                    <h2 class="text-2xl font-semibold text-center mb-6">SMS ログイン</h2>
                    
                    <!-- デモ情報 -->
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
                        
                        <button type="submit" 
                                class="w-full bg-blue-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-600 transition duration-200">
                            ログイン
                        </button>
                    </form>

                    <div class="mt-6 text-center text-sm text-gray-600">
                        <p>※ これはデモシステムです</p>
                    </div>
                </div>
            </div>
        `;
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

    // ============ コンポーネント ============

    renderLoading() {
        return `
            <div class="flex justify-center items-center py-12">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        `;
    }

    renderError(message) {
        return `
            <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                <i class="fas fa-exclamation-circle mr-2"></i>${message}
            </div>
        `;
    }

    renderStatCard(title, value, icon, color) {
        const colors = {
            blue: 'bg-blue-100 text-blue-500',
            green: 'bg-green-100 text-green-500',
            yellow: 'bg-yellow-100 text-yellow-500',
            purple: 'bg-purple-100 text-purple-500'
        };

        return `
            <div class="bg-white rounded-lg shadow p-6">
                <div class="flex items-center">
                    <div class="p-3 ${colors[color]} rounded-full">
                        <i class="fas fa-${icon} text-2xl"></i>
                    </div>
                    <div class="ml-4">
                        <p class="text-gray-500 text-sm">${title}</p>
                        <p class="text-2xl font-semibold">${value}</p>
                    </div>
                </div>
            </div>
        `;
    }

    renderTodaySchedule(schedule) {
        return `
            <div class="bg-white rounded-lg shadow p-6">
                <h2 class="text-lg font-semibold mb-4">本日の予約</h2>
                <div class="space-y-3">
                    ${schedule.length > 0 ? schedule.map(apt => `
                    <div class="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <div>
                            <p class="font-medium">${apt.customerName}</p>
                            <p class="text-sm text-gray-500">${apt.time} - ${apt.service}</p>
                        </div>
                        <span class="text-sm ${apt.status === '確定' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-yellow-100 text-yellow-700'} px-2 py-1 rounded">
                            ${apt.status}
                        </span>
                    </div>
                    `).join('') : '<p class="text-gray-500">本日の予約はありません</p>'}
                </div>
            </div>
        `;
    }

    renderStaffStatus(staffStatus) {
        return `
            <div class="bg-white rounded-lg shadow p-6">
                <h2 class="text-lg font-semibold mb-4">スタッフ稼働状況</h2>
                <div class="space-y-3">
                    ${staffStatus.map(staff => `
                    <div class="flex items-center justify-between">
                        <div class="flex items-center">
                            <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(staff.name)}" 
                                 class="w-10 h-10 rounded-full mr-3">
                            <div>
                                <p class="font-medium">${staff.name}</p>
                                <p class="text-sm text-gray-500">${staff.role}</p>
                            </div>
                        </div>
                        <span class="text-sm ${staff.status === '勤務中' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-gray-100 text-gray-700'} px-2 py-1 rounded">
                            ${staff.status}
                        </span>
                    </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    renderCustomersTable(customers) {
        return `
            <div class="overflow-x-auto">
                <table class="min-w-full">
                    <thead>
                        <tr class="border-b bg-gray-50">
                            <th class="text-left py-3 px-4 font-semibold">顧客名</th>
                            <th class="text-left py-3 px-4 font-semibold">電話番号</th>
                            <th class="text-left py-3 px-4 font-semibold">最終来店日</th>
                            <th class="text-left py-3 px-4 font-semibold">来店回数</th>
                            <th class="text-left py-3 px-4 font-semibold">ステータス</th>
                            <th class="text-left py-3 px-4 font-semibold">アクション</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${customers.map(customer => `
                        <tr class="border-b hover:bg-gray-50 transition duration-150">
                            <td class="py-3 px-4">
                                <div class="flex items-center">
                                    <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(customer.name)}" 
                                         class="w-8 h-8 rounded-full mr-3">
                                    <span>${customer.name}</span>
                                </div>
                            </td>
                            <td class="py-3 px-4">${customer.phone}</td>
                            <td class="py-3 px-4">${customer.lastVisit}</td>
                            <td class="py-3 px-4">${customer.visitCount}回</td>
                            <td class="py-3 px-4">
                                <span class="text-sm ${this.getStatusColor(customer.status)} px-2 py-1 rounded">
                                    ${customer.status}
                                </span>
                            </td>
                            <td class="py-3 px-4">
                                <button onclick="app.editCustomer(${customer.id})" 
                                        class="text-blue-500 hover:text-blue-700 mr-2">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button onclick="app.deleteCustomer(${customer.id})" 
                                        class="text-red-500 hover:text-red-700">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    renderPagination(data) {
        if (data.totalPages <= 1) return '';

        const pages = [];
        const currentPage = data.page;
        const totalPages = data.totalPages;

        // ページ番号の生成ロジック
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            if (currentPage <= 3) {
                pages.push(1, 2, 3, 4, '...', totalPages);
            } else if (currentPage >= totalPages - 2) {
                pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
            } else {
                pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
            }
        }

        return `
            <div class="flex justify-between items-center mt-6">
                <p class="text-gray-600">
                    全${data.total}件中 ${((currentPage - 1) * 10) + 1}-${Math.min(currentPage * 10, data.total)}件を表示
                </p>
                <div class="flex gap-2">
                    ${currentPage > 1 ? `
                        <button onclick="app.changePage(${currentPage - 1})" 
                                class="px-3 py-1 border rounded hover:bg-gray-100">
                            前へ
                        </button>
                    ` : ''}
                    
                    ${pages.map(page => {
                        if (page === '...') {
                            return '<span class="px-3 py-1">...</span>';
                        }
                        return `
                            <button onclick="app.changePage(${page})" 
                                    class="px-3 py-1 ${page === currentPage 
                                        ? 'bg-blue-500 text-white' 
                                        : 'border hover:bg-gray-100'} rounded">
                                ${page}
                            </button>
                        `;
                    }).join('')}
                    
                    ${currentPage < totalPages ? `
                        <button onclick="app.changePage(${currentPage + 1})" 
                                class="px-3 py-1 border rounded hover:bg-gray-100">
                            次へ
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
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

    // ============ イベントハンドラー ============

    async handleLogin(event) {
        event.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const errorDiv = document.getElementById('loginError');
        
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
            
            localStorage.setItem('sms_token', data.token);
            localStorage.setItem('sms_user', JSON.stringify(data.user));
            this.token = data.token;
            this.currentUser = data.user;
            
            // ナビゲーションを表示
            const nav = document.getElementById('nav');
            if (nav) nav.style.display = 'block';
            
            window.location.href = '/';
        } catch (error) {
            errorDiv.textContent = error.message;
            errorDiv.classList.remove('hidden');
        }
    }

    logout() {
        localStorage.removeItem('sms_token');
        localStorage.removeItem('sms_user');
        this.token = null;
        this.currentUser = null;
        window.location.href = '/login';
    }

    changePage(page) {
        const url = new URL(window.location);
        url.searchParams.set('page', page);
        window.history.pushState({}, '', url);
        this.renderCustomers();
    }

    async searchCustomers(event) {
        if (event.key === 'Enter') {
            const search = event.target.value;
            const url = new URL(window.location);
            url.searchParams.set('search', search);
            url.searchParams.set('page', 1);
            window.history.pushState({}, '', url);
            this.renderCustomers();
        }
    }

    async filterCustomers() {
        const status = document.getElementById('statusFilter').value;
        const url = new URL(window.location);
        if (status) {
            url.searchParams.set('status', status);
        } else {
            url.searchParams.delete('status');
        }
        url.searchParams.set('page', 1);
        window.history.pushState({}, '', url);
        this.renderCustomers();
    }

    async editCustomer(id) {
        alert(`顧客編集機能は開発中です (ID: ${id})`);
    }

    async deleteCustomer(id) {
        if (!confirm('この顧客を削除してもよろしいですか？')) return;

        try {
            await this.apiCall(`/customers/${id}`, { method: 'DELETE' });
            this.renderCustomers();
        } catch (error) {
            alert('削除に失敗しました');
        }
    }

    showAddCustomerModal() {
        alert('新規顧客登録機能は開発中です');
    }
}

// アプリケーションの初期化
const app = new SMSApp();

// グローバルスコープに公開（イベントハンドラー用）
window.app = app;
```

### Step 3: 静的サーバー (src/frontend/server.cjs)

```javascript
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3001;

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);

  let filePath = '.' + req.url;
  if (filePath === './') {
    filePath = './index.html';
  }

  // SPAルーティング - すべてのルートでindex.htmlを返す
  const extname = String(path.extname(filePath)).toLowerCase();
  if (!extname && !filePath.includes('.')) {
    filePath = './index.html';
  }

  const contentType = mimeTypes[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        // ファイルが見つからない場合もindex.htmlを返す（SPA対応）
        fs.readFile('./index.html', (error, content) => {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(content, 'utf-8');
        });
      } else {
        res.writeHead(500);
        res.end('Server Error: ' + error.code);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`Frontend server running at http://localhost:${PORT}/`);
});
```

---

## 🔗 Phase 4: 統合とテスト

### Step 1: 本番用フロントエンドコード作成

```bash
# src/frontend/app.prod.js を app.js からコピー
cp src/frontend/app.js src/frontend/app.prod.js

# app.prod.jsを編集してAPIのURLを本番用に変更
# this.apiUrl = '/api'; に変更
```

### Step 2: Vercel設定 (vercel.json)

```json
{
  "version": 2,
  "buildCommand": "npm run vercel-build",
  "outputDirectory": "public",
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "/api"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "functions": {
    "api/index.js": {
      "maxDuration": 10
    }
  }
}
```

### Step 3: 環境変数ファイル作成

```bash
# .env.local
echo "JWT_SECRET=your-development-secret-key" > .env.local
```

### Step 4: 動作テスト

```bash
# ターミナル1: バックエンドサーバー起動
cd src/backend
node server.js

# ターミナル2: フロントエンドサーバー起動
cd src/frontend
node server.cjs

# ブラウザでアクセス
open http://localhost:3001
```

### テストシナリオ

1. **ログインテスト**
   - Email: admin@salon.com
   - Password: admin123

2. **ダッシュボード確認**
   - 統計情報が表示されるか
   - 本日の予約が表示されるか
   - スタッフ状況が表示されるか

3. **顧客管理テスト**
   - 顧客一覧が表示されるか
   - ページネーションが動作するか
   - 検索機能が動作するか
   - 削除機能が動作するか

4. **ログアウトテスト**
   - ログアウト後、ログインページにリダイレクトされるか

---

## 🚀 Phase 5: デプロイメント

### Step 1: Vercel CLIインストール

```bash
npm install -g vercel
```

### Step 2: デプロイ準備

```bash
# publicディレクトリの作成とファイルコピー
npm run build

# Gitにコミット
git add .
git commit -m "Initial SMS system implementation"
```

### Step 3: Vercelデプロイ

```bash
# Vercelにログイン
vercel login

# デプロイ実行
vercel

# 以下の質問に答える：
# - Set up and deploy? Yes
# - Which scope? (your account)
# - Link to existing project? No
# - Project name? sms-salon-system
# - Directory? ./
# - Override settings? No
```

### Step 4: 環境変数設定

```bash
# Vercel環境変数の設定
vercel env add JWT_SECRET production

# プロンプトで本番用のシークレットキーを入力
# 例: your-production-secret-key-here-change-this
```

### Step 5: 本番デプロイ

```bash
# 本番環境へデプロイ
vercel --prod

# デプロイ完了後、URLが表示される
# https://sms-salon-system.vercel.app
```

---

## 🔧 トラブルシューティング

### よくある問題と解決方法

1. **CORSエラー**
   - バックエンドのCORS設定を確認
   - フロントエンドのAPIURLが正しいか確認

2. **404エラー**
   - vercel.jsonのrewrite設定を確認
   - SPAルーティングが正しく設定されているか確認

3. **認証エラー**
   - JWT_SECRET環境変数が設定されているか確認
   - トークンの有効期限を確認

4. **ビルドエラー**
   - package.jsonのスクリプトを確認
   - publicディレクトリが作成されているか確認

---

## 📝 カスタマイズポイント

### デザインの変更
- Tailwind CSSのクラスを変更
- カラーパレットの調整
- フォントの変更

### 機能の追加
- 新しいAPIエンドポイントの追加
- 新しいページの追加
- データベースの実装（PostgreSQL等）

### セキュリティの強化
- レート制限の実装
- 入力検証の強化
- HTTPSヘッダーの追加

---

このガイドに従って実装することで、完全に動作するSMSシステムを構築できます。各ステップは独立しているため、必要に応じてカスタマイズしながら進めることができます。