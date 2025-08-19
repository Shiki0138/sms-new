# Supabase デプロイメントガイド

## 📋 デプロイ前チェックリスト

### 1. Supabaseプロジェクトの準備

#### A. プロジェクト作成
1. [Supabase Dashboard](https://app.supabase.com) にログイン
2. 「New Project」をクリック
3. プロジェクト情報を入力:
   - Project name: `salon-lumiere`
   - Database Password: 強力なパスワードを生成
   - Region: `Northeast Asia (Tokyo)` を選択
   - Pricing Plan: `Pro ($25/month)` を推奨

#### B. API認証情報の取得
1. Settings → API
2. 以下をコピー:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY`

### 2. データベースセットアップ

#### A. マイグレーション実行
SQL Editorで以下の順番で実行:

```sql
-- 1. 基本スキーマ
/salon-light-plan/supabase/migrations/001_initial_schema.sql

-- 2. セキュリティ設定
/salon-light-plan/supabase/migrations/013_security_fixes_v2.sql
/salon-light-plan/supabase/migrations/014_fix_all_function_search_paths.sql

-- 3. スタンダードプラン機能
/server/migrations/20250113_add_standard_plan_features.sql
```

#### B. RLS (Row Level Security) 確認
```sql
-- 検証スクリプト実行
/salon-light-plan/supabase/migrations/verify_security_fixes.sql
```

### 3. 認証設定

#### Supabase Dashboard → Authentication → Settings

**Email Auth**:
- [x] Enable Email Confirmations
- [x] OTP Expiry: `1800` (30分)

**Password Requirements**:
- [x] Minimum length: `8`
- [x] Require lowercase
- [x] Require uppercase
- [x] Require numbers
- [x] Require special characters
- [x] Check passwords against breach database (HIBP)

**Security**:
- [x] Enable MFA/TOTP
- [x] Enable refresh token rotation
- [x] Refresh token reuse interval: `0`

**Site URL**: 
```
https://salon-lumiere.vercel.app
```

**Redirect URLs**:
```
https://salon-lumiere.vercel.app/**
http://localhost:3000/**
```

### 4. ストレージ設定

#### バケット作成
1. Storage → New bucket
2. Name: `salon-uploads`
3. Public bucket: OFF
4. File size limit: 5MB
5. Allowed MIME types:
   ```
   image/jpeg
   image/png
   image/gif
   application/pdf
   ```

### 5. 環境変数設定

#### `.env.local` ファイル作成
```bash
cp .env.example .env.local
```

必須環境変数:
```env
# Supabase (必須)
NEXT_PUBLIC_SUPABASE_URL=https://viedqgottfmzhqvkgvpb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Security (必須)
JWT_SECRET=generate-64-character-random-string
SESSION_SECRET=generate-32-character-random-string

# Application (必須)
NODE_ENV=production
APP_URL=https://salon-lumiere.vercel.app
```

### 6. Vercelデプロイ

#### A. プロジェクト接続
```bash
# Vercel CLIインストール
npm i -g vercel

# デプロイ
vercel
```

#### B. 環境変数設定
Vercel Dashboard → Settings → Environment Variables

すべての環境変数を追加（`.env.local`から）

#### C. ビルド設定
- Framework Preset: `Next.js`
- Build Command: `npm run build`
- Output Directory: `.next`
- Install Command: `npm install`

### 7. 外部サービス設定

#### Twilio (SMS)
1. [Twilio Console](https://console.twilio.com)
2. Messaging → Services → Create
3. Webhook URLを設定:
   ```
   https://salon-lumiere.vercel.app/api/webhooks/twilio
   ```

#### SendGrid (Email)
1. [SendGrid](https://sendgrid.com)
2. Settings → API Keys → Create
3. Domain Authentication設定

#### Stripe (決済)
1. [Stripe Dashboard](https://dashboard.stripe.com)
2. Webhook endpoint追加:
   ```
   https://salon-lumiere.vercel.app/api/webhooks/stripe
   ```
3. Price IDを作成（Light/Standard/Premium）

### 8. セキュリティ最終確認

- [ ] すべての環境変数が本番用に設定されている
- [ ] RLSが全テーブルで有効
- [ ] CORS設定で本番ドメインのみ許可
- [ ] レート制限が有効
- [ ] SSL証明書が有効
- [ ] バックアップ設定完了

### 9. モニタリング設定

#### Supabase
- Database → Logs でクエリログ確認
- Reports → API でトラフィック監視

#### Vercel
- Analytics有効化
- Web Vitals監視

#### 外部ツール（推奨）
- Sentry（エラートラッキング）
- Google Analytics（ユーザー分析）

## 🚀 デプロイコマンド

```bash
# 1. 依存関係インストール
npm install

# 2. ビルドテスト
npm run build

# 3. Vercelデプロイ
vercel --prod

# 4. デプロイ確認
curl https://salon-lumiere.vercel.app/api/health
```

## 🔥 トラブルシューティング

### CORS エラー
```javascript
// vercel.json に追加
{
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Access-Control-Allow-Origin", "value": "https://salon-lumiere.vercel.app" }
      ]
    }
  ]
}
```

### データベース接続エラー
- Supabase Dashboard → Settings → Database
- Connection string を確認
- SSL mode: `require`

### 認証エラー
- Redirect URLsに本番URLが含まれているか確認
- Site URLが正しく設定されているか確認

## 📞 サポート

問題が発生した場合:
1. Supabase Status: https://status.supabase.com
2. Vercel Status: https://vercel-status.com
3. エラーログを確認（Supabase Logs / Vercel Functions）