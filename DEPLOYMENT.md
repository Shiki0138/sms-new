# 🚀 本番環境デプロイガイド

## 📋 前提条件

### 必要なアカウント
1. **Vercel アカウント** - フロントエンドホスティング
2. **Supabase プロジェクト** - データベース・認証
3. **LINE Developers アカウント** - LINE Messaging API
4. **Meta for Developers** - Instagram Basic Display API
5. **SendGrid/AWS SES** - メール送信
6. **Google Cloud** - Gemini AI API

## 🔧 環境変数設定

### Vercel環境変数
```bash
# Supabase (必須)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# LINE Messaging API
LINE_CHANNEL_ACCESS_TOKEN=your_line_channel_access_token
LINE_CHANNEL_SECRET=your_line_channel_secret
LINE_WEBHOOK_URL=https://your-domain.vercel.app/api/webhooks/line

# Instagram API
INSTAGRAM_APP_ID=your_instagram_app_id
INSTAGRAM_APP_SECRET=your_instagram_app_secret
INSTAGRAM_WEBHOOK_VERIFY_TOKEN=your_verify_token

# Email API
EMAIL_API_KEY=your_sendgrid_api_key
EMAIL_FROM_ADDRESS=noreply@your-salon.com

# Google Gemini API
GOOGLE_GEMINI_API_KEY=your_gemini_api_key

# アプリ設定
VITE_APP_NAME=美容サロン管理システム
VITE_APP_VERSION=1.0.0
```

## 📦 デプロイ手順

### 1. Vercelデプロイ
```bash
# Vercel CLIをインストール
npm i -g vercel

# プロジェクトをデプロイ
vercel

# 環境変数を設定
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
# ... 他の環境変数も同様に設定

# 本番デプロイ
vercel --prod
```

### 2. Supabaseセットアップ
```sql
-- database-schema.sqlを実行
-- または cleanup-and-setup.sqlを実行
```

### 3. Webhook設定

#### LINE Webhook
- LINE Developers Console > Messaging API > Webhook URL
- `https://your-domain.vercel.app/api/webhooks/line`

#### Instagram Webhook
- Meta for Developers > App > Products > Webhooks
- `https://your-domain.vercel.app/api/webhooks/instagram`

## 🔐 セキュリティ設定

### Supabase RLS (Row Level Security)
```sql
-- 既にdatabase-schema.sqlで設定済み
-- テナント別データ分離
-- 認証ユーザーのみアクセス可能
```

### CORS設定
```javascript
// Supabase Dashboard > Settings > API
// Allowed origins:
// https://your-domain.vercel.app
```

## 📊 ライトプラン制限の確認

### プラン制限が正常に動作することを確認
- ✅ 顧客登録: 100名まで
- ✅ 月間予約: 50件まで
- ✅ スタッフアカウント: 1名まで
- ✅ AI返信: 月200回まで

## 🚨 デプロイ後確認事項

### 1. 基本機能テスト
- [ ] ログイン・認証
- [ ] 顧客登録（100名制限）
- [ ] 予約登録（月50件制限）
- [ ] 休日設定の反映

### 2. API連携テスト
- [ ] LINE Webhook動作
- [ ] Instagram Webhook動作
- [ ] メール送信機能
- [ ] AI返信生成

### 3. メッセージ機能テスト
- [ ] メッセージ送受信
- [ ] 一斉送信機能
- [ ] リマインダー送信
- [ ] セグメント機能

## 🛠️ ローカル開発環境の問題対処

### 開発サーバーが起動しない場合

1. **別のポートで試す**:
```bash
npm run dev -- --port 8080
```

2. **ビルドしてプレビュー**:
```bash
npm run build
npm run preview
```

3. **ngrokを使用**:
```bash
# 別ターミナルで
npm run dev
# 新しいターミナルで
ngrok http 5173
```

## 📞 サポート

デプロイに関する問題は以下で対応：
- Vercel: https://vercel.com/docs
- Supabase: https://supabase.com/docs
- LINE API: https://developers.line.biz/ja/docs/
