# マルチチャンネルメッセージング・電子カルテシステム実装ガイド

## システム概要

VOTAN美容室管理システムに統合されたマルチチャンネルメッセージング機能と電子カルテシステムの包括的な実装です。

### 🏗️ アーキテクチャ

```
app/backend/server-clean.js (既存サーバー)
├── src/api/
│   ├── multichannel-messaging.js     # マルチチャンネルメッセージング
│   ├── electronic-medical-records.js # 電子カルテシステム
│   ├── automated-messaging.js        # 自動化システム
│   └── main-server.js               # 統合サーバー
├── src/middleware/
│   ├── role-based-access.js         # 権限管理
│   └── security.js                  # セキュリティ強化
└── src/utils/
    └── database-schema.js           # データベース設計
```

## 📱 1. マルチチャンネルメッセージングAPI

### 主要機能
- **LINE・Instagram・SMS統合**: Webhook受信とメッセージ送信
- **リアルタイムメッセージング**: Socket.io対応
- **自動返信システム**: キーワードベース応答
- **メディア判定**: 画像・動画対応

### APIエンドポイント

#### チャンネル設定管理
```http
GET /api/messaging/channels
PUT /api/messaging/channels/:channelId
```

#### メッセージ送信
```http
POST /api/messaging/send
POST /api/messaging/bulk-send
```

#### Webhook処理
```http
POST /api/messaging/webhooks/line
POST /api/messaging/webhooks/instagram
GET  /api/messaging/webhooks/instagram (検証用)
```

### 実装例

```javascript
// マルチチャンネルメッセージ送信
const messageData = {
  recipients: [{ customerId: 123 }],
  message: "ご予約の確認をお願いします。",
  channels: ['line', 'sms'],
  attachments: [], // 画像ファイル
  scheduleTime: "2025-09-15T10:00:00Z"
};

const response = await fetch('/api/messaging/send', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer <token>',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(messageData)
});
```

## 🏥 2. 電子カルテシステム (EMR)

### 主要機能
- **顧客別医療記録**: 血液型・アレルギー・既往歴管理
- **施術記録管理**: Before/After写真・使用薬剤記録
- **アレルギープロファイル**: 重篤度別管理
- **同意書管理**: デジタル署名対応

### APIエンドポイント

#### 医療記録管理
```http
GET  /api/emr/customers/:customerId/records
POST /api/emr/customers/:customerId/records
```

#### 施術記録
```http
GET  /api/emr/customers/:customerId/treatments
POST /api/emr/customers/:customerId/treatments
PUT  /api/emr/treatments/:treatmentId
```

#### 医療写真管理
```http
GET    /api/emr/photos/:photoId?token=<secure_token>
DELETE /api/emr/photos/:photoId
```

### セキュリティ機能
- **時間制限付きURL**: 医療写真への安全なアクセス
- **暗号化保存**: AES-256-GCM暗号化
- **アクセスログ**: 完全な監査証跡

### 実装例

```javascript
// 施術記録の追加
const formData = new FormData();
formData.append('treatmentType', 'カラーリング');
formData.append('staffId', '1');
formData.append('services', JSON.stringify([{id: 1, name: 'ヘアカラー'}]));
formData.append('treatmentDate', '2025-09-15');
formData.append('beforeCondition', '根元が伸びた状態');
formData.append('afterCondition', '希望通りの色に仕上がり');
formData.append('photos', photoFile); // 最大10ファイル

const response = await fetch('/api/emr/customers/123/treatments', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer <token>' },
  body: formData
});
```

## 🤖 3. 自動化システム

### 主要機能
- **スケジュール型メッセージ**: cron式対応
- **イベント駆動型**: 予約・誕生日・フォローアップ
- **一斉送信・個別除外**: セグメント管理
- **効果測定**: 開封率・クリック率追跡

### 自動化ルール作成

```javascript
const automationRule = {
  name: "誕生日おめでとうメッセージ",
  type: "birthday_greeting",
  trigger: {
    type: "date-based",
    conditions: [{
      field: "birthday",
      operator: "equals_today",
      value: null
    }]
  },
  schedule: {
    type: "daily",
    hour: 9,
    minute: 0
  },
  messageTemplate: {
    content: "{customerName}さん、お誕生日おめでとうございます！🎂",
    variables: ["customerName"]
  },
  channels: ["line", "email"],
  targetAudience: {
    filters: [{
      field: "communicationPrefs.optOut.marketing",
      operator: "equals",
      value: false
    }]
  }
};
```

### キャンペーン管理

```javascript
// 新規キャンペーン作成
const campaign = {
  name: "秋の特別プロモーション",
  message: "秋限定！カラー＋トリートメントで20%OFF✨",
  targetAudience: {
    lastVisitDays: 60, // 60日以内に来店した顧客
    excludeCustomers: [] // 除外顧客リスト
  },
  channels: ["line", "email"],
  scheduleTime: "2025-09-20T10:00:00Z",
  attachments: [promotionImage]
};
```

## 🔐 4. 権限管理システム

### ロール定義
- **SUPER_ADMIN**: 全権限
- **ADMIN**: 管理業務全般
- **MANAGER**: 部門管理
- **STAFF**: 担当顧客のみ
- **RECEPTIONIST**: 受付業務のみ
- **READ_ONLY**: 閲覧のみ

### データアクセス制御

```javascript
// 顧客データへのアクセス例
app.get('/api/customers/:customerId', 
  authenticate,
  checkCustomerAccess,
  authorize('customers:read'),
  (req, res) => {
    const customer = getCustomerData(req.params.customerId);
    const filteredData = maskSensitiveData(customer, req.user.role);
    res.json({ success: true, customer: filteredData });
  }
);
```

### 医療データ保護

```javascript
// 医療記録への特別な保護
app.get('/api/emr/customers/:customerId/records',
  authenticate,
  medicalRecordsAccess, // 医療データ専用チェック
  protectMedicalData,   // HIPAA準拠ヘッダー
  auditLog('medical_record_access'),
  (req, res) => {
    // 医療記録取得処理
  }
);
```

## 🛡️ 5. セキュリティ強化

### 実装セキュリティ機能

#### レート制限
```javascript
// エンドポイント別制限
app.use('/api/', apiLimiter);           // 100回/15分
app.use('/api/auth/', authLimiter);     // 5回/15分
app.use('/api/messaging/', messagingLimiter); // 50回/1時間
```

#### データ暗号化
```javascript
// 機密データの暗号化
const encryptedData = encryptSensitiveData({
  medicalHistory: "アレルギー: ペニシリン",
  socialSecurityNumber: "123-45-6789"
});
```

#### CSRF保護
```javascript
// 状態変更操作にCSRF必須
app.post('/api/customers', 
  validateCSRFToken,
  (req, res) => {
    // 顧客作成処理
  }
);
```

#### 監査ログ
- **すべての医療データアクセス**を記録
- **IPアドレス・ユーザーエージェント**追跡
- **不審なアクティビティ**自動検出

## 📊 6. データベース設計

### Firebase Firestore構造

```javascript
// 顧客コレクション (強化版)
customers: {
  personalInfo: { name, email, phone, birthday, address },
  salonInfo: { memberSince, lastVisit, totalVisits, notes },
  communicationPrefs: { channels, language, optOut },
  privacy: { consents, dates }
}

// 医療記録コレクション
medical_records: {
  basicInfo: { bloodType, skinType, hairType },
  medicalHistory: { conditions, medications, surgeries },
  contraindications: { allergies, interactions }
}

// メッセージコレクション
messages: {
  threadId, customerId, channel, direction,
  messageData: { text, attachments, metadata },
  status: { current, deliveryAttempts },
  engagement: { delivered, opened, clicked }
}
```

### インデックス最適化
```javascript
// 性能向上のための複合インデックス
customers: [
  { fields: ['personalInfo.email'], unique: true },
  { fields: ['salonInfo.lastVisit'] },
  { fields: ['createdAt'] }
]

messages: [
  { fields: ['customerId', 'createdAt'] },
  { fields: ['channel', 'status.current'] }
]
```

## 🚀 7. デプロイメント・設定

### 環境変数設定

```env
# データベース
FIREBASE_PROJECT_ID=salon-system-138
GOOGLE_CLOUD_KEYFILE=path/to/service-account.json

# チャンネル認証
LINE_CHANNEL_ACCESS_TOKEN=your_line_token
INSTAGRAM_ACCESS_TOKEN=your_instagram_token
TWILIO_ACCOUNT_SID=your_twilio_sid
SENDGRID_API_KEY=your_sendgrid_key

# セキュリティ
JWT_SECRET=super_secure_secret
DATA_ENCRYPTION_KEY=encryption_key_32_chars
PHOTO_SECRET=medical_photos_secret
```

### サーバー起動

```bash
# 開発環境
npm run dev

# 本番環境
npm start

# Vercelデプロイ
npm run deploy
```

## 📈 8. 監視・メトリクス

### 主要KPI
- **メッセージ配信成功率**: 95%以上目標
- **自動化ルール実行成功率**: 98%以上
- **API応答時間**: 200ms以下
- **セキュリティインシデント**: 0件

### 監査要件
- **医療データアクセス**: 全記録保持
- **メッセージ配信ログ**: 法的要件準拠
- **システム変更ログ**: 管理者活動追跡

## 🔧 9. トラブルシューティング

### よくある問題と解決方法

#### Webhook認証エラー
```javascript
// LINE署名検証失敗
if (!verifyLineSignature(body, signature)) {
  // チャンネルシークレット確認
  // タイムスタンプ同期確認
}
```

#### 医療写真アクセス拒否
```javascript
// セキュアトークン期限切れ
const token = generateSecurePhotoUrl(photoId);
// 新しいトークンで再試行
```

#### 自動化ルール実行失敗
```javascript
// cron式確認
const isValid = cron.validate('0 9 * * *');
// スケジュール再設定
```

## 📞 10. サポート・メンテナンス

### 定期メンテナンス項目
1. **セキュリティログ確認** (日次)
2. **自動化ルールパフォーマンス** (週次)  
3. **データベース最適化** (月次)
4. **セキュリティ更新** (随時)

### 緊急対応手順
1. **システム停止**: サーバー再起動・ログ確認
2. **データ漏洩疑い**: アクセス遮断・監査開始
3. **メッセージ配信障害**: チャンネル状態確認・手動送信

---

## 🏁 実装完了チェックリスト

- ✅ マルチチャンネルメッセージングAPI実装
- ✅ 電子カルテシステム構築  
- ✅ 自動化・スケジューリング機能
- ✅ ロールベースアクセス制御
- ✅ セキュリティ強化措置
- ✅ データベース設計・最適化
- ✅ 包括的API仕様文書
- ✅ デプロイメント準備完了

**システムの本格運用準備が整いました！** 🎉