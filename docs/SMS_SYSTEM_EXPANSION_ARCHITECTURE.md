# SMS美容室管理システム 新機能拡張アーキテクチャ設計

## 1. 現在のシステム分析

### 1.1 既存アーキテクチャ概要
- **フロントエンド**: Vanilla JavaScript, HTML/CSS
- **バックエンド**: Express.js (Node.js)
- **データベース**: Firebase Firestore
- **認証**: JWT + bcryptjs
- **メッセージング**: Twilio SMS, LINE Bot SDK
- **デプロイメント**: Vercel
- **リアルタイム通信**: Socket.io

### 1.2 既存機能分析
- 予約管理（基本カレンダー）
- 顧客管理（CRUD操作）
- メッセージング（Twilio/LINE）
- 認証・権限管理（基本）
- ダッシュボード（基本統計）

## 2. 新機能アーキテクチャ設計

### 2.1 マルチチャンネルメッセージングシステム

#### アーキテクチャ構成
```
┌─────────────────────────────────────────────────────────────┐
│                 メッセージング統合レイヤー                    │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │ LINE Bot    │  │ Instagram   │  │ SMS/Twilio  │  │
│  │ Webhook     │  │ Graph API   │  │ Webhook     │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  │
├─────────────────────────────────────────────────────────────┤
│         メッセージルーティング・プライオリティ管理             │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │ 統一受信    │  │ 優先度判定   │  │ 自動配信    │  │
│  │ キューイング │  │ エンジン     │  │ システム    │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

#### 技術実装詳細
- **統合メッセージAPI**: `/api/messages/unified`
- **チャンネル管理**: Firebase Collection `channels`
- **優先度判定**: 顧客設定 + 履歴分析
- **自動ルーティング**: Redis Queue + Bull.js

#### データモデル
```javascript
// channels Collection
{
  customerId: string,
  channels: {
    line: { userId: string, active: boolean, priority: number },
    instagram: { userId: string, active: boolean, priority: number },
    sms: { phoneNumber: string, active: boolean, priority: number }
  },
  preferences: {
    primaryChannel: 'line' | 'instagram' | 'sms',
    autoSelect: boolean,
    businessHours: boolean
  }
}
```

### 2.2 電子カルテシステム

#### システム構成
```
┌─────────────────────────────────────────────────────────────┐
│                    電子カルテレイヤー                        │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │ カルテ作成   │  │ 履歴管理     │  │ 画像管理    │  │
│  │ エディタ     │  │ タイムライン │  │ システム    │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │ 施術テンプレート│  │ 注意事項     │  │ 自動表示    │  │
│  │ 管理         │  │ アラート     │  │ エンジン    │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

#### データモデル
```javascript
// medical_records Collection
{
  customerId: string,
  records: [{
    recordId: string,
    date: timestamp,
    staffId: string,
    treatments: [{
      menuId: string,
      notes: string,
      beforePhotos: string[],
      afterPhotos: string[],
      duration: number,
      price: number
    }],
    observations: string,
    allergies: string[],
    warnings: string[],
    nextRecommendation: string,
    followUpDate: timestamp
  }]
}
```

### 2.3 高度売上分析システム

#### 分析エンジン構成
```
┌─────────────────────────────────────────────────────────────┐
│                   分析エンジンレイヤー                       │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │ リアルタイム │  │ バッチ処理   │  │ レポート    │  │
│  │ 集計         │  │ 分析         │  │ ジェネレータ │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │ スタッフ別   │  │ メニュー別   │  │ 時間帯別    │  │
│  │ パフォーマンス│  │ 収益分析     │  │ 稼働率分析   │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

#### 分析指標
- **スタッフ分析**: 売上/時間、客数、リピート率、技術評価
- **メニュー分析**: 人気度、収益性、所要時間、季節性
- **時間分析**: 稼働率、客単価推移、予約充填率
- **マーケティング分析**: 顧客獲得コスト、LTV、チャーン率

### 2.4 予約カレンダー機能強化

#### カレンダーアーキテクチャ
```
┌─────────────────────────────────────────────────────────────┐
│                  カレンダーコントローラー                    │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │ ビュー管理   │  │ 営業時間     │  │ 予約枠      │  │
│  │ (日/週/月)   │  │ コントロール │  │ 最適化      │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │ 空き時間     │  │ ダブルブッキング│ │ 自動調整    │  │
│  │ 自動検索     │  │ 防止システム  │  │ システム    │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 2.5 休日・営業時間管理システム

#### 営業時間管理構成
```javascript
// business_hours Collection
{
  salonId: string,
  regularHours: {
    monday: { start: '09:00', end: '19:00', closed: false },
    tuesday: { start: '09:00', end: '19:00', closed: false },
    // ... 他の曜日
  },
  specialDays: [{
    date: '2024-12-31',
    type: 'holiday' | 'special_hours' | 'closed',
    hours: { start: '10:00', end: '15:00' }
  }],
  seasonalSchedules: [{
    name: '夏期営業',
    startDate: '2024-07-01',
    endDate: '2024-08-31',
    schedule: { /* 特別営業時間 */ }
  }]
}
```

### 2.6 自動リマインダーシステム

#### リマインダーエンジン
```
┌─────────────────────────────────────────────────────────────┐
│                 リマインダーエンジン                        │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │ スケジューラー│  │ テンプレート │  │ 配信管理    │  │
│  │ (node-cron)  │  │ エンジン     │  │ システム    │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │ 優先度判定   │  │ 配信履歴     │  │ 失敗時      │  │
│  │ ロジック     │  │ 管理         │  │ リトライ    │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 2.7 権限管理システム

#### RBAC (Role-Based Access Control) 実装
```javascript
// roles Collection
{
  roleId: string,
  name: 'owner' | 'manager' | 'staff' | 'receptionist',
  permissions: {
    customers: { read: true, write: true, delete: false },
    appointments: { read: true, write: true, delete: true },
    medicalRecords: { read: true, write: true, delete: false },
    analytics: { read: true, write: false, delete: false },
    settings: { read: false, write: false, delete: false }
  }
}
```

## 3. 技術スタック拡張

### 3.1 新規依存関係
```json
{
  "dependencies": {
    "bull": "^4.12.0",
    "ioredis": "^5.3.2",
    "sharp": "^0.34.3",
    "node-cron": "^3.0.3",
    "instagram-basic-display-api": "^1.0.0",
    "chart.js": "^4.4.0",
    "date-fns": "^3.0.0",
    "multer": "^1.4.5",
    "compression": "^1.7.4"
  }
}
```

### 3.2 インフラ要件
- **Redis**: メッセージキュー、セッション管理
- **Firebase Storage**: 画像・ファイル管理
- **Webhook エンドポイント**: 各SNS API連携
- **Cron Jobs**: 定期タスク実行

## 4. セキュリティ・プライバシー設計

### 4.1 データ保護
- **暗号化**: 医療情報の AES-256 暗号化
- **アクセスログ**: すべての操作記録
- **データ匿名化**: 分析用データの個人情報除去
- **GDPR対応**: データ削除・エクスポート機能

### 4.2 API セキュリティ
- **Rate Limiting**: エンドポイント別制限
- **Input Validation**: すべての入力値検証
- **CORS設定**: 厳格なオリジン制限
- **Webhook検証**: 署名検証必須

## 5. パフォーマンス最適化

### 5.1 データベース最適化
- **インデックス戦略**: 検索・集計クエリ最適化
- **データ分割**: 大容量コレクションの分割
- **キャッシュ戦略**: Redis活用
- **クエリ最適化**: N+1問題回避

### 5.2 フロントエンド最適化
- **レイジーローディング**: 大容量データの段階読み込み
- **Virtual Scrolling**: 大量リスト表示最適化
- **Image Optimization**: WebP対応、遅延読み込み
- **Bundle Splitting**: 機能別分割

## 6. モバイル対応

### 6.1 レスポンシブデザイン
- **Flexbox/Grid**: 柔軟なレイアウト
- **Touch Friendly**: タッチ操作最適化
- **Performance**: モバイル回線対応
- **PWA対応**: オフライン機能

## 7. 実装ファイル構成

```
app/
├── backend/
│   ├── controllers/
│   │   ├── messaging/
│   │   ├── medical-records/
│   │   ├── analytics/
│   │   └── scheduling/
│   ├── services/
│   │   ├── MessageRouter.js
│   │   ├── AnalyticsEngine.js
│   │   ├── ReminderScheduler.js
│   │   └── PermissionManager.js
│   ├── middleware/
│   │   ├── rbac.js
│   │   └── rate-limiting.js
│   └── models/
├── frontend/
│   ├── js/
│   │   ├── messaging/
│   │   ├── medical-records/
│   │   ├── analytics/
│   │   └── calendar/
│   └── css/
│       ├── components/
│       └── modules/
└── config/
    ├── redis.js
    ├── webhooks.js
    └── permissions.js
```

## 8. API エンドポイント設計

### 8.1 メッセージング API
```
POST   /api/messages/unified          # 統合メッセージ送信
GET    /api/messages/conversations    # 会話履歴取得
POST   /api/messages/channels         # チャンネル設定
PUT    /api/messages/preferences      # 優先度設定
```

### 8.2 電子カルテ API
```
POST   /api/medical-records          # カルテ作成
GET    /api/medical-records/:id      # カルテ取得
PUT    /api/medical-records/:id      # カルテ更新
GET    /api/medical-records/history  # 履歴取得
POST   /api/medical-records/photos   # 写真アップロード
```

### 8.3 分析 API
```
GET    /api/analytics/staff          # スタッフ別分析
GET    /api/analytics/revenue        # 売上分析
GET    /api/analytics/performance    # パフォーマンス分析
GET    /api/analytics/reports        # レポート生成
```

## 9. テスト戦略

### 9.1 単体テスト
- **Jest**: バックエンドロジックテスト
- **Supertest**: API エンドポイントテスト
- **Firebase Emulator**: データベーステスト

### 9.2 統合テスト
- **Webhook テスト**: 外部API連携テスト
- **E2E テスト**: Playwright活用
- **パフォーマンステスト**: 負荷テスト

## 10. 監視・ロギング

### 10.1 アプリケーション監視
- **Winston**: 構造化ログ出力
- **Morgan**: HTTP アクセスログ
- **Firebase Analytics**: ユーザー行動分析

### 10.2 エラー監視
- **Try-Catch**: 包括的エラーハンドリング
- **Dead Letter Queue**: 失敗メッセージ管理
- **Health Check**: システム稼働監視

この設計により、現在のシステムを段階的に拡張し、高度な美容室管理システムを構築できます。