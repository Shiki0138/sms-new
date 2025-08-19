# 🚀 Vercel デプロイ手順書

## 📋 デプロイ前の準備

### 1. Vercelにログイン
```bash
vercel login
# GitHubアカウントでログインを選択
```

### 2. 環境変数ファイルの確認
`.env.local`に以下が設定されていることを確認:
```env
NEXT_PUBLIC_SUPABASE_URL=https://viedqgottfmzhqvkgvpb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
JWT_SECRET=salon-lumiere-secret-key-change-in-production-minimum-32-chars
NODE_ENV=production
APP_URL=https://your-vercel-url.vercel.app
```

## 🚀 デプロイ実行

### 1. 初回デプロイ
```bash
# プロジェクトルートで実行
vercel

# 質問に答える:
# ? Set up and deploy "~/Desktop/system/017_SMS"? [Y/n] y
# ? Which scope do you want to deploy to? [自分のアカウント]
# ? Link to existing project? [N/y] n
# ? What's your project's name? salon-lumiere
# ? In which directory is your code located? ./
```

### 2. 環境変数の設定
Vercel Dashboard (https://vercel.com/dashboard) で:

1. プロジェクトを選択
2. Settings → Environment Variables
3. 以下を追加:

**Production 環境変数:**
```
NEXT_PUBLIC_SUPABASE_URL = https://viedqgottfmzhqvkgvpb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpZWRxZ290dGZtemhxdmtndnBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1Mjg5NzUsImV4cCI6MjA2OTEwNDk3NX0.nTipD5-Df-ABdJy9zagxrCw5d1TlxDBLzUEF62Os-H4
SUPABASE_SERVICE_ROLE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpZWRxZ290dGZtemhxdmtndnBiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzUyODk3NSwiZXhwIjoyMDY5MTA0OTc1fQ.AUAWkgCjW7IzsWfipAqQxb6cnF7jvhZrzdAWzeCrZV8
JWT_SECRET = salon-lumiere-secret-key-change-in-production-minimum-32-chars
SESSION_SECRET = your-session-secret-key-change-in-production
NODE_ENV = production
APP_NAME = Salon Lumière
```

### 3. 本番デプロイ
```bash
vercel --prod
```

## ✅ デプロイ後の確認

### 1. ヘルスチェック
```bash
curl https://your-app.vercel.app/api/health
```

### 2. Supabase接続確認
```bash
curl -X POST https://your-app.vercel.app/api/health/test-connection
```

### 3. 管理画面アクセス
1. https://your-app.vercel.app にアクセス
2. ログイン機能をテスト
3. 基本機能の動作確認

## 🔧 トラブルシューティング

### ビルドエラーの場合
```bash
# ローカルでビルドテスト
npm run build

# 依存関係の確認
npm install
```

### API エラーの場合
1. Vercel Dashboard → Functions → Logs を確認
2. 環境変数が正しく設定されているか確認
3. Supabase接続情報を再確認

### CORS エラーの場合
1. vercel.json の設定を確認
2. Supabase Dashboard → Settings → API で許可ドメインを確認

## 📱 カスタムドメイン設定

### 1. ドメインの追加
Vercel Dashboard → Domains で:
1. Add Domain
2. ドメイン名を入力
3. DNS設定指示に従って設定

### 2. SSL証明書
Vercelが自動でLet's Encryptの証明書を発行します。

## 🎯 デプロイ完了チェックリスト

- [ ] Vercelログイン完了
- [ ] 環境変数設定完了
- [ ] デプロイ成功
- [ ] ヘルスチェック成功
- [ ] Supabase接続確認
- [ ] 管理画面アクセス確認
- [ ] 予約機能テスト
- [ ] 顧客管理機能テスト

---

## 🆘 サポート

問題が発生した場合:
1. Vercel Status: https://vercel-status.com
2. Supabase Status: https://status.supabase.com
3. エラーログの確認（Vercel Dashboard）