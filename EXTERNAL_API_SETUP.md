# 🔌 外部API連携設定ガイド

## 📱 LINE Messaging API 設定

### 1. LINE Developersアカウント作成
1. [LINE Developers](https://developers.line.biz/) にアクセス
2. LINEビジネスIDでログイン（なければ作成）
3. 新規プロバイダーを作成

### 2. Messaging APIチャネル作成
```
1. 「Create a new channel」→「Messaging API」を選択
2. 必要情報を入力:
   - Channel name: あなたのサロン名
   - Channel description: サロン予約・お知らせ配信
   - Category: 美容・健康
   - Subcategory: 美容院・理容室
```

### 3. 必要な情報を取得
```bash
# .envファイルに追加
VITE_LINE_CHANNEL_ACCESS_TOKEN=（Channel access token）
VITE_LINE_CHANNEL_SECRET=（Channel secret）
```

### 4. Webhook設定
```
Webhook URL: https://your-domain.com/api/webhooks/line
Use webhook: ON
Webhook redelivery: ON
```

### 5. 応答設定
```
Auto-reply messages: OFF
Greeting messages: ON（任意）
```

---

## 📸 Instagram Business API 設定

### 1. 前提条件
- Instagramビジネスアカウント
- Facebookページとの連携
- Facebook Developer アカウント

### 2. Facebook App作成
1. [Facebook Developers](https://developers.facebook.com/) にアクセス
2. 「マイアプリ」→「アプリを作成」
3. ビジネスタイプを選択
4. アプリ名とメールアドレスを入力

### 3. Instagram Basic Display API追加
```
1. ダッシュボード → プロダクト追加
2. Instagram Basic Display → 設定
3. アプリの設定:
   - Valid OAuth Redirect URIs: https://your-domain.com/auth/instagram/callback
   - Deauthorize Callback URL: https://your-domain.com/auth/instagram/deauth
   - Data Deletion Request URL: https://your-domain.com/auth/instagram/delete
```

### 4. アクセストークン取得
```bash
# 長期アクセストークンを取得
# 詳細はFacebook開発者ドキュメント参照
VITE_INSTAGRAM_ACCESS_TOKEN=（取得したトークン）
VITE_INSTAGRAM_BUSINESS_ACCOUNT_ID=（ビジネスアカウントID）
```

---

## ✉️ Email API 設定

### Option 1: Gmail SMTP

#### 1. Googleアカウント設定
1. [Googleアカウント設定](https://myaccount.google.com/security) にアクセス
2. 2段階認証を有効化
3. アプリパスワードを生成

#### 2. SMTP設定
```bash
VITE_EMAIL_SMTP_HOST=smtp.gmail.com
VITE_EMAIL_SMTP_PORT=587
VITE_EMAIL_SMTP_USER=your-email@gmail.com
VITE_EMAIL_SMTP_PASS=（生成したアプリパスワード）
```

### Option 2: SendGrid

#### 1. SendGridアカウント作成
1. [SendGrid](https://sendgrid.com/) でアカウント作成
2. Email API → Integration Guide
3. Web API → Node.js を選択

#### 2. APIキー作成
```
Settings → API Keys → Create API Key
Key Name: salon-light-plan
API Key Permissions: Full Access
```

#### 3. 設定
```bash
VITE_SENDGRID_API_KEY=（生成したAPIキー）
VITE_SENDGRID_FROM_EMAIL=noreply@your-salon.com
```

---

## 🔐 Webhook セキュリティ設定

### 署名検証用シークレット生成
```bash
# ランダムな文字列を生成
openssl rand -hex 32
```

### 環境変数に設定
```bash
VITE_WEBHOOK_SECRET=（生成した文字列）
```

---

## 🧪 動作確認

### LINE API テスト
```javascript
// ブラウザコンソールで実行
fetch('/api/test/line', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    to: 'USER_ID',
    message: 'テストメッセージ'
  })
});
```

### Email送信テスト
```javascript
// 設定画面のテスト送信機能を使用
// または以下をコンソールで実行
fetch('/api/test/email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    to: 'test@example.com',
    subject: 'テストメール',
    body: 'これはテストメールです'
  })
});
```

---

## ⚠️ 本番環境での注意事項

### レート制限
- LINE: 500通/分、友だち数×200通/日
- Instagram: アプリレベルで200通/時
- SendGrid: Free tier 100通/日

### コスト管理
- LINE: 月1,000通まで無料
- Instagram: API使用は基本無料
- SendGrid: 月100通まで無料

### セキュリティ
- APIキーは絶対に公開しない
- Webhook URLはHTTPS必須
- 署名検証を必ず実装
- CORS設定を適切に行う

---

## 📞 サポート

### 各サービスのドキュメント
- [LINE Messaging API Docs](https://developers.line.biz/ja/docs/messaging-api/)
- [Instagram Basic Display API](https://developers.facebook.com/docs/instagram-basic-display-api)
- [SendGrid Docs](https://docs.sendgrid.com/)

### トラブルシューティング
1. エラーログを確認（ブラウザコンソール）
2. APIレスポンスコードを確認
3. 各サービスの管理画面でステータス確認
4. 環境変数が正しく設定されているか確認

設定に問題がある場合は、各サービスのサポートにお問い合わせください。