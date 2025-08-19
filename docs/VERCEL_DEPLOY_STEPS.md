# Vercelデプロイ手順

## 1. Vercelログイン
```bash
vercel login
# → Continue with GitHub を選択
```

## 2. 初回デプロイ
```bash
vercel
```

質問に答える：
- `Set up and deploy "~/Desktop/system/017_SMS"?` → **Y**
- `Which scope do you want to deploy to?` → **個人アカウントを選択**
- `Link to existing project?` → **N**
- `What's your project's name?` → **salon-lumiere**
- `In which directory is your code located?` → **./（そのままEnter）**

## 3. 環境変数の設定

デプロイ後、Vercel Dashboard で環境変数を設定：

### 必須環境変数
```
SUPABASE_URL=https://viedqgottfmzhqvkgvpb.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpZWRxZ290dGZtemhxdmtndnBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1Mjg5NzUsImV4cCI6MjA2OTEwNDk3NX0.nTipD5-Df-ABdJy9zagxrCw5d1TlxDBLzUEF62Os-H4
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpZWRxZ290dGZtemhxdmtndnBiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzUyODk3NSwiZXhwIjoyMDY5MTA0OTc1fQ.AUAWkgCjW7IzsWfipAqQxb6cnF7jvhZrzdAWzeCrZV8
JWT_SECRET=salon-lumiere-secret-key-change-in-production-minimum-32-chars
SESSION_SECRET=salon-lumiere-session-secret-change-in-production
NODE_ENV=production
```

### オプション環境変数（後で設定可能）
```
TWILIO_ACCOUNT_SID=（空のまま）
TWILIO_AUTH_TOKEN=（空のまま）
TWILIO_PHONE_NUMBER=（空のまま）
EMAIL_USER=your_salon@gmail.com
EMAIL_PASS=your_app_password
```

## 4. 本番デプロイ
```bash
vercel --prod
```

## 5. 動作確認

デプロイ完了後のURL例: `https://salon-lumiere.vercel.app`

### 確認項目
- [ ] トップページの表示
- [ ] ログイン機能
- [ ] 顧客管理機能
- [ ] 予約管理機能
- [ ] ダッシュボード表示

## トラブルシューティング

### 環境変数エラー
- Vercel Dashboard → Settings → Environment Variables
- 設定後、再デプロイが必要

### ビルドエラー
```bash
vercel logs
```
でログを確認

### データベース接続エラー
- Supabase URLとキーを再確認
- RLSポリシーの設定確認