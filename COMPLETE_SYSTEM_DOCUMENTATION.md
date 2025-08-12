# SMS (サロン管理システム) - 完全システムドキュメント

## 📋 エグゼクティブサマリー

SMSは、美容室・サロン向けの総合管理システムです。このドキュメントは、別のプロジェクトでシステムを再構築するために必要な全ての情報を含んでいます。

### システムの特徴
- **フルスタックJavaScriptアプリケーション**
- **JWT認証によるセキュアなAPI**
- **レスポンシブデザイン（モバイル対応）**
- **Vercelへのデプロイ対応**
- **リアルタイムデータ表示**

---

## 🏗️ 完全なシステムアーキテクチャ

### 技術スタック詳細

```
フロントエンド層:
├── Vanilla JavaScript (ES6+)
├── Tailwind CSS 2.2.19 (CDN)
├── Font Awesome 6.0 (CDN)
├── Single Page Application (SPA)
└── LocalStorage (セッション管理)

バックエンド層:
├── Node.js Runtime
├── Express.js 4.18.2
├── JWT認証 (jsonwebtoken 9.0.2)
├── bcryptjs 2.4.3 (パスワード暗号化)
├── CORS 2.8.5
└── In-Memory Database

デプロイメント:
├── Vercel (Serverless Functions)
├── 自動HTTPS化
└── 環境変数管理
```

### ディレクトリ構造（完全版）

```
017_SMS/
├── api/                          # Vercel API Routes
│   ├── index.js                 # メインAPIサーバー (全エンドポイント)
│   └── package.json             # API依存関係
├── src/
│   ├── frontend/                # フロントエンドソース
│   │   ├── index.html          # SPAメインHTML
│   │   ├── app.js              # 開発用JavaScript
│   │   ├── app.prod.js         # 本番用JavaScript (最適化済み)
│   │   ├── auth.html           # スタンドアロン認証ページ
│   │   └── server.cjs          # 開発用静的サーバー
│   └── backend/                 # バックエンド開発環境
│       ├── server.js           # ローカル開発用APIサーバー
│       └── package.json        # 開発用依存関係
├── public/                      # Vercel公開ディレクトリ
│   ├── index.html              # 本番用HTML
│   └── app.js                  # 本番用JavaScript
├── docs/                        # プロジェクトドキュメント
├── scripts/                     # ビルド・デプロイスクリプト
├── index.html                  # ルートHTML (本番用)
├── login.html                  # ログインリダイレクトページ
├── vercel.json                 # Vercel設定ファイル
├── package.json                # プロジェクト設定
└── PROJECT_DOCUMENTATION.md    # プロジェクト概要ドキュメント
```

---

## 📊 完全なデータモデル仕様

### 1. Users (ユーザー)
```javascript
{
  id: number,                    // 一意のID
  email: string,                 // ログイン用メールアドレス
  password: string,              // bcryptハッシュ化パスワード
  name: string,                  // 表示名
  role: 'admin'|'staff'|'receptionist',  // 権限レベル
  createdAt: string,            // 作成日時
  updatedAt: string             // 更新日時
}

// デモデータ
{
  id: 1,
  email: 'admin@salon.com',
  password: '$2a$10$kFVBZMghl0Y4dGz1ktSjXOmGawrEj3SJZQqcXKxOvvGzFBKu1Qjmq', // admin123
  name: '管理者',
  role: 'admin'
}
```

### 2. Customers (顧客)
```javascript
{
  id: number,                    // 一意のID
  name: string,                  // 顧客名
  phone: string,                 // 電話番号
  email: string,                 // メールアドレス
  lastVisit: string,            // 最終来店日 (YYYY-MM-DD)
  visitCount: number,           // 来店回数
  status: 'VIP'|'常連'|'新規'|'休眠',  // 顧客ステータス
  notes: string,                // メモ
  createdAt: string,            // 登録日
  totalSpent: number,           // 累計利用金額
  preferredStaff: number,       // 指名スタッフID
  birthDate: string             // 誕生日
}
```

### 3. Appointments (予約)
```javascript
{
  id: number,                    // 一意のID
  customerId: number,           // 顧客ID
  customerName: string,         // 顧客名（表示用）
  date: string,                 // 予約日 (YYYY-MM-DD)
  time: string,                 // 予約時間 (HH:MM)
  endTime: string,              // 終了予定時間
  service: string,              // サービス内容
  staffId: number,              // 担当スタッフID
  staffName: string,            // スタッフ名（表示用）
  status: '確定'|'未確定'|'キャンセル'|'完了',  // 予約ステータス
  notes: string,                // 備考
  price: number,                // 料金
  createdAt: string,            // 作成日時
  updatedAt: string             // 更新日時
}
```

### 4. Staff (スタッフ)
```javascript
{
  id: number,                    // 一意のID
  name: string,                  // スタッフ名
  role: 'スタイリスト'|'アシスタント'|'マネージャー',  // 役職
  status: '勤務中'|'待機中'|'休憩中'|'退勤',  // 勤務状況
  skills: string[],             // スキルリスト
  rating: number,               // 評価 (0-5)
  workDays: string[],           // 勤務曜日
  workHours: {                  // 勤務時間
    start: string,
    end: string
  },
  monthlyTarget: number,        // 月間売上目標
  currentMonthSales: number     // 当月売上実績
}
```

---

## 🔌 完全なAPI仕様

### Base URL
- Development: `http://localhost:5001/api`
- Production: `https://your-domain.vercel.app/api`

### 認証ヘッダー
```
Authorization: Bearer <JWT_TOKEN>
```

### エンドポイント詳細

#### 1. 認証 API

**POST /api/auth/login**
```javascript
// Request
{
  "email": "admin@salon.com",
  "password": "admin123"
}

// Response (200 OK)
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "email": "admin@salon.com",
    "name": "管理者",
    "role": "admin"
  }
}

// Error Response (401)
{
  "error": "Invalid credentials"
}
```

#### 2. ダッシュボード API

**GET /api/dashboard/stats**
```javascript
// Headers
{
  "Authorization": "Bearer <token>"
}

// Response (200 OK)
{
  "totalCustomers": 45,
  "todayAppointments": 8,
  "monthlyRevenue": 285000,
  "activeStaff": 4,
  "todaySchedule": [
    {
      "id": 1,
      "time": "10:00",
      "customerName": "山田太郎",
      "service": "カット・カラー",
      "staffName": "鈴木花子",
      "status": "確定"
    }
  ],
  "staffStatus": [
    {
      "id": 1,
      "name": "鈴木花子",
      "role": "スタイリスト",
      "status": "勤務中"
    }
  ]
}
```

#### 3. 顧客管理 API

**GET /api/customers**
```javascript
// Query Parameters
{
  "search": "山田",      // 検索キーワード（オプション）
  "status": "VIP",      // ステータスフィルター（オプション）
  "page": 1,            // ページ番号（デフォルト: 1）
  "limit": 10           // 1ページあたりの件数（デフォルト: 10）
}

// Response (200 OK)
{
  "customers": [
    {
      "id": 1,
      "name": "山田太郎",
      "phone": "090-1234-5678",
      "email": "yamada@example.com",
      "lastVisit": "2024-01-20",
      "visitCount": 15,
      "status": "VIP",
      "notes": "カラーは明るめが好み"
    }
  ],
  "total": 45,
  "page": 1,
  "totalPages": 5
}
```

**GET /api/customers/:id**
```javascript
// Response (200 OK)
{
  "id": 1,
  "name": "山田太郎",
  "phone": "090-1234-5678",
  "email": "yamada@example.com",
  "lastVisit": "2024-01-20",
  "visitCount": 15,
  "status": "VIP",
  "notes": "カラーは明るめが好み",
  "history": [
    {
      "date": "2024-01-20",
      "service": "カット・カラー",
      "staff": "鈴木花子",
      "price": 12000
    }
  ]
}
```

**POST /api/customers**
```javascript
// Request
{
  "name": "新規顧客",
  "phone": "090-9999-9999",
  "email": "new@example.com",
  "notes": "初回来店"
}

// Response (201 Created)
{
  "id": 46,
  "name": "新規顧客",
  "phone": "090-9999-9999",
  "email": "new@example.com",
  "lastVisit": null,
  "visitCount": 0,
  "status": "新規",
  "notes": "初回来店",
  "createdAt": "2024-01-25T10:00:00Z"
}
```

**PUT /api/customers/:id**
```javascript
// Request
{
  "name": "山田太郎",
  "status": "VIP",
  "notes": "次回は縮毛矯正希望"
}

// Response (200 OK)
{
  "id": 1,
  "name": "山田太郎",
  "status": "VIP",
  "notes": "次回は縮毛矯正希望",
  "updatedAt": "2024-01-25T10:00:00Z"
}
```

**DELETE /api/customers/:id**
```javascript
// Response (200 OK)
{
  "message": "Customer deleted successfully"
}
```

#### 4. 予約管理 API

**GET /api/appointments**
```javascript
// Query Parameters
{
  "date": "2024-01-25",    // 日付フィルター
  "staffId": 1,            // スタッフフィルター
  "status": "確定"         // ステータスフィルター
}

// Response (200 OK)
{
  "appointments": [
    {
      "id": 1,
      "customerId": 1,
      "customerName": "山田太郎",
      "date": "2024-01-25",
      "time": "10:00",
      "service": "カット・カラー",
      "staffId": 1,
      "staffName": "鈴木花子",
      "status": "確定",
      "price": 12000
    }
  ],
  "total": 8
}
```

**POST /api/appointments**
```javascript
// Request
{
  "customerId": 1,
  "date": "2024-01-26",
  "time": "14:00",
  "service": "カット",
  "staffId": 1,
  "notes": "前髪は眉上で"
}

// Response (201 Created)
{
  "id": 9,
  "customerId": 1,
  "customerName": "山田太郎",
  "date": "2024-01-26",
  "time": "14:00",
  "service": "カット",
  "staffId": 1,
  "staffName": "鈴木花子",
  "status": "未確定",
  "createdAt": "2024-01-25T10:00:00Z"
}
```

#### 5. スタッフ管理 API

**GET /api/staff**
```javascript
// Response (200 OK)
{
  "staff": [
    {
      "id": 1,
      "name": "鈴木花子",
      "role": "スタイリスト",
      "status": "勤務中",
      "skills": ["カット", "カラー", "パーマ"],
      "rating": 4.8,
      "todayAppointments": 5,
      "monthlyTarget": 500000,
      "currentMonthSales": 380000
    }
  ],
  "total": 6
}
```

#### 6. ヘルスチェック

**GET /api/health**
```javascript
// Response (200 OK)
{
  "status": "ok",
  "timestamp": "2024-01-25T10:00:00Z",
  "version": "1.0.0"
}
```

---

## 💻 フロントエンド実装詳細

### 1. SPAルーター実装

```javascript
// app.js - ルーター部分
setupRouter() {
    // Supabaseトークンの処理
    if (window.location.hash && window.location.hash.includes('access_token')) {
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
```

### 2. API通信ユーティリティ

```javascript
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
            localStorage.removeItem('sms_token');
            window.location.href = '/login';
        }
        throw new Error(`API call failed: ${response.statusText}`);
    }

    return response.json();
}
```

### 3. 認証フロー

```javascript
async handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('loginError');
    
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
        window.location.href = '/';
    } catch (error) {
        errorDiv.textContent = error.message;
        errorDiv.classList.remove('hidden');
    }
}
```

### 4. コンポーネントレンダリング例

```javascript
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
                <!-- 検索・フィルター -->
                <div class="flex gap-4 mb-6">
                    <input type="text" placeholder="顧客名で検索..." 
                        class="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500">
                    <select class="px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500">
                        <option>全ての顧客</option>
                        <option>VIP顧客</option>
                        <option>新規顧客</option>
                    </select>
                </div>

                <!-- テーブル -->
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
                            ${data.customers.map(customer => this.renderCustomerRow(customer)).join('')}
                        </tbody>
                    </table>
                </div>

                <!-- ページネーション -->
                ${this.renderPagination(data)}
            </div>
        </div>
        `;
    } catch (error) {
        app.innerHTML = this.renderError('顧客データの読み込みに失敗しました。');
    }
}

renderCustomerRow(customer) {
    return `
    <tr class="border-b hover:bg-gray-50">
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
    `;
}
```

---

## 🔧 バックエンド実装詳細

### 1. Express.js サーバー設定

```javascript
// api/index.js - メインサーバー設定
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();

// CORS設定
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://sms-new.vercel.app', 'https://yourdomain.com']
    : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));

app.use(express.json());

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// In-Memory Database
const db = {
  users: [
    {
      id: 1,
      email: 'admin@salon.com',
      password: '$2a$10$kFVBZMghl0Y4dGz1ktSjXOmGawrEj3SJZQqcXKxOvvGzFBKu1Qjmq',
      name: '管理者',
      role: 'admin'
    }
  ],
  customers: generateMockCustomers(45),
  appointments: generateMockAppointments(20),
  staff: generateMockStaff(6)
};
```

### 2. 認証ミドルウェア

```javascript
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
```

### 3. エンドポイント実装例

```javascript
// ログインエンドポイント
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

// 顧客一覧エンドポイント
app.get('/api/customers', authenticateToken, (req, res) => {
  try {
    const { search, status, page = 1, limit = 10 } = req.query;
    
    let filteredCustomers = [...db.customers];
    
    // 検索フィルター
    if (search) {
      filteredCustomers = filteredCustomers.filter(c => 
        c.name.includes(search) || c.phone.includes(search)
      );
    }
    
    // ステータスフィルター
    if (status) {
      filteredCustomers = filteredCustomers.filter(c => c.status === status);
    }
    
    // ページネーション
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

// 顧客削除エンドポイント
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
```

### 4. モックデータ生成関数

```javascript
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
      lastVisit: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000)
        .toISOString().split('T')[0],
      visitCount: Math.floor(Math.random() * 50) + 1,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      notes: 'お客様のメモ情報',
      createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000)
        .toISOString()
    });
  }
  
  return customers;
}
```

---

## 🚀 デプロイメント完全ガイド

### 1. Vercel設定ファイル

```json
// vercel.json
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

### 2. package.json スクリプト

```json
{
  "name": "sms-salon-management",
  "version": "1.0.0",
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
  }
}
```

### 3. 環境変数設定

```bash
# Vercel環境変数
JWT_SECRET=your-production-secret-key-here
NODE_ENV=production
```

### 4. デプロイ手順

```bash
# 1. Vercel CLIのインストール
npm i -g vercel

# 2. プロジェクトディレクトリで初期化
vercel

# 3. 環境変数の設定
vercel env add JWT_SECRET

# 4. 本番デプロイ
vercel --prod
```

---

## 🎨 UIコンポーネントライブラリ

### 1. ボタンコンポーネント

```html
<!-- プライマリボタン -->
<button class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition duration-200">
  <i class="fas fa-plus mr-2"></i>新規作成
</button>

<!-- セカンダリボタン -->
<button class="border border-gray-300 px-4 py-2 rounded hover:bg-gray-100 transition duration-200">
  キャンセル
</button>

<!-- 危険ボタン -->
<button class="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition duration-200">
  <i class="fas fa-trash mr-2"></i>削除
</button>
```

### 2. カードコンポーネント

```html
<!-- 統計カード -->
<div class="bg-white rounded-lg shadow p-6">
  <div class="flex items-center">
    <div class="p-3 bg-blue-100 rounded-full">
      <i class="fas fa-users text-blue-500 text-2xl"></i>
    </div>
    <div class="ml-4">
      <p class="text-gray-500 text-sm">総顧客数</p>
      <p class="text-2xl font-semibold">45</p>
    </div>
  </div>
</div>

<!-- 情報カード -->
<div class="bg-white rounded-lg shadow p-6">
  <h2 class="text-lg font-semibold mb-4">カードタイトル</h2>
  <div class="space-y-3">
    <!-- コンテンツ -->
  </div>
</div>
```

### 3. フォーム要素

```html
<!-- テキスト入力 -->
<div class="mb-4">
  <label class="block text-gray-700 text-sm font-bold mb-2">
    ラベル
  </label>
  <input type="text" 
         class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500" 
         placeholder="プレースホルダー">
</div>

<!-- セレクトボックス -->
<select class="px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500">
  <option>選択してください</option>
  <option>オプション1</option>
  <option>オプション2</option>
</select>

<!-- チェックボックス -->
<label class="flex items-center">
  <input type="checkbox" class="mr-2">
  <span>チェックボックスラベル</span>
</label>
```

### 4. テーブルコンポーネント

```html
<div class="overflow-x-auto">
  <table class="min-w-full">
    <thead>
      <tr class="border-b bg-gray-50">
        <th class="text-left py-3 px-4 font-semibold">列1</th>
        <th class="text-left py-3 px-4 font-semibold">列2</th>
      </tr>
    </thead>
    <tbody>
      <tr class="border-b hover:bg-gray-50 transition duration-150">
        <td class="py-3 px-4">データ1</td>
        <td class="py-3 px-4">データ2</td>
      </tr>
    </tbody>
  </table>
</div>
```

### 5. ステータスバッジ

```javascript
// ステータスカラー関数
getStatusColor(status) {
  const colors = {
    'VIP': 'bg-purple-100 text-purple-700',
    '常連': 'bg-blue-100 text-blue-700',
    '新規': 'bg-green-100 text-green-700',
    '休眠': 'bg-gray-100 text-gray-700',
    '確定': 'bg-green-100 text-green-700',
    '未確定': 'bg-yellow-100 text-yellow-700',
    'キャンセル': 'bg-red-100 text-red-700'
  };
  return colors[status] || 'bg-gray-100 text-gray-700';
}

// 使用例
<span class="text-sm ${this.getStatusColor(status)} px-2 py-1 rounded">
  ${status}
</span>
```

---

## 🔒 セキュリティ実装詳細

### 1. パスワードハッシュ化

```javascript
// パスワードのハッシュ化
const bcrypt = require('bcryptjs');

async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
}

// パスワードの検証
async function verifyPassword(password, hash) {
  return await bcrypt.compare(password, hash);
}
```

### 2. JWT実装

```javascript
// トークン生成
function generateToken(user) {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      role: user.role 
    },
    JWT_SECRET,
    { 
      expiresIn: '7d',
      issuer: 'sms-system',
      audience: 'sms-users'
    }
  );
}

// トークン検証
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: 'sms-system',
      audience: 'sms-users'
    });
  } catch (error) {
    throw new Error('Invalid token');
  }
}
```

### 3. 入力検証

```javascript
// Email検証
function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

// 電話番号検証
function validatePhone(phone) {
  const re = /^0\d{1,4}-\d{1,4}-\d{4}$/;
  return re.test(phone);
}

// APIリクエスト検証ミドルウェア
function validateRequest(schema) {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: error.details[0].message 
      });
    }
    next();
  };
}
```

### 4. CORS設定

```javascript
// 本番環境のCORS設定
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'https://sms-new.vercel.app',
      'https://yourdomain.com'
    ];
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400 // 24時間
};

app.use(cors(corsOptions));
```

---

## 🔧 開発環境セットアップ完全ガイド

### 1. 必要な環境

- Node.js 14.0以上
- npm 6.0以上
- Git

### 2. セットアップ手順

```bash
# 1. リポジトリのクローン
git clone <repository-url>
cd 017_SMS

# 2. 依存関係のインストール
# ルートディレクトリ
npm install

# バックエンド
cd src/backend
npm install

# APIディレクトリ
cd ../../api
npm install

# 3. 環境変数の設定
cd ..
echo "JWT_SECRET=dev-secret-key" > .env.local

# 4. 開発サーバーの起動
# ターミナル1: バックエンド
cd src/backend
node server.js

# ターミナル2: フロントエンド
cd src/frontend
node server.cjs

# アクセス
# Frontend: http://localhost:3001
# Backend API: http://localhost:5001
```

### 3. VS Code推奨設定

```json
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "emmet.includeLanguages": {
    "javascript": "javascriptreact"
  },
  "files.exclude": {
    "node_modules": true,
    ".git": true
  }
}

// .vscode/extensions.json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "formulahendry.auto-rename-tag"
  ]
}
```

---

## 📈 パフォーマンス最適化

### 1. フロントエンド最適化

```javascript
// デバウンス関数
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// 検索の最適化
const optimizedSearch = debounce(async (searchTerm) => {
  const results = await this.apiCall(`/customers?search=${searchTerm}`);
  this.renderSearchResults(results);
}, 300);

// 遅延読み込み
function lazyLoad(imageSrc) {
  const img = new Image();
  img.src = imageSrc;
  img.onload = () => {
    document.getElementById('target').src = imageSrc;
  };
}
```

### 2. バックエンド最適化

```javascript
// キャッシュ実装
const cache = new Map();

function cacheMiddleware(duration = 60) {
  return (req, res, next) => {
    const key = req.originalUrl;
    const cached = cache.get(key);
    
    if (cached && cached.timestamp + duration * 1000 > Date.now()) {
      return res.json(cached.data);
    }
    
    const originalJson = res.json;
    res.json = function(data) {
      cache.set(key, { data, timestamp: Date.now() });
      originalJson.call(this, data);
    };
    
    next();
  };
}

// 使用例
app.get('/api/dashboard/stats', 
  authenticateToken, 
  cacheMiddleware(300), // 5分キャッシュ
  dashboardController
);
```

---

## 🧪 テスト戦略

### 1. ユニットテスト例

```javascript
// test/auth.test.js
const { hashPassword, verifyPassword } = require('../utils/auth');

describe('Authentication', () => {
  test('should hash password correctly', async () => {
    const password = 'testpass123';
    const hash = await hashPassword(password);
    expect(hash).not.toBe(password);
    expect(hash.length).toBeGreaterThan(50);
  });
  
  test('should verify password correctly', async () => {
    const password = 'testpass123';
    const hash = await hashPassword(password);
    const isValid = await verifyPassword(password, hash);
    expect(isValid).toBe(true);
  });
});
```

### 2. API統合テスト

```javascript
// test/api.test.js
const request = require('supertest');
const app = require('../api/index');

describe('API Endpoints', () => {
  let token;
  
  beforeAll(async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@salon.com',
        password: 'admin123'
      });
    token = response.body.token;
  });
  
  test('GET /api/customers requires authentication', async () => {
    const response = await request(app)
      .get('/api/customers');
    expect(response.status).toBe(401);
  });
  
  test('GET /api/customers returns customer list', async () => {
    const response = await request(app)
      .get('/api/customers')
      .set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(response.body.customers).toBeDefined();
    expect(Array.isArray(response.body.customers)).toBe(true);
  });
});
```

---

## 🚀 本番環境チェックリスト

### デプロイ前の確認事項

- [ ] 環境変数の設定（JWT_SECRET）
- [ ] CORS設定の確認
- [ ] HTTPSの有効化
- [ ] エラーハンドリングの実装
- [ ] ログ出力の設定
- [ ] レート制限の実装
- [ ] 入力検証の徹底
- [ ] XSS対策の確認
- [ ] SQLインジェクション対策（将来のDB実装時）
- [ ] セキュリティヘッダーの設定

### パフォーマンスチェック

- [ ] 画像の最適化
- [ ] JavaScriptの最小化
- [ ] CSSの最小化
- [ ] Gzip圧縮の有効化
- [ ] キャッシュヘッダーの設定
- [ ] CDNの利用

### モニタリング

- [ ] エラー監視の設定
- [ ] パフォーマンス監視
- [ ] アップタイム監視
- [ ] ログ収集の設定

---

## 📚 関連リソース

### 公式ドキュメント
- [Express.js](https://expressjs.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [JWT](https://jwt.io/)
- [Vercel](https://vercel.com/docs)

### 推奨ライブラリ
- [Joi](https://joi.dev/) - スキーマ検証
- [Winston](https://github.com/winstonjs/winston) - ログ管理
- [Rate-limiter-flexible](https://github.com/animir/node-rate-limiter-flexible) - レート制限
- [Helmet](https://helmetjs.github.io/) - セキュリティヘッダー

---

このドキュメントは、SMSシステムを別のプロジェクトで完全に再現するために必要な全ての技術情報を含んでいます。各セクションのコード例は実際の実装から抜粋したものであり、そのまま使用することができます。

開発を進める際は、このドキュメントを参考にしながら、プロジェクトの要件に応じてカスタマイズしてください。