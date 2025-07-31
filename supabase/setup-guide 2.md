# Supabase セットアップガイド

## 1. Supabaseプロジェクトの作成

1. [Supabase](https://app.supabase.com/)にアクセスしてアカウントを作成
2. 新しいプロジェクトを作成
3. プロジェクト名: `salon-light-plan`
4. データベースパスワードを設定（安全な場所に保存）
5. リージョンを選択（日本のユーザー向けなら `Northeast Asia (Tokyo)` を推奨）

## 2. データベースの設定

### SQLエディタでマイグレーションを実行

1. Supabaseダッシュボードの「SQL Editor」を開く
2. 以下の順番でSQLファイルを実行：
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_row_level_security.sql`
   - `supabase/migrations/003_plan_limit_functions.sql`

## 3. 認証設定

1. Authentication > Providers から Email を有効化
2. Authentication > Email Templates でメールテンプレートを日本語化（オプション）

## 4. 環境変数の取得

1. Settings > API から以下を取得：
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon public` → `VITE_SUPABASE_ANON_KEY`

2. プロジェクトルートの `.env` ファイルに設定：
```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 5. テストデータの投入（オプション）

```sql
-- テストユーザーの作成は Supabase Auth を通じて行う必要があります
-- アプリケーションのサインアップ機能を使用してください

-- テストテナントとデータは、ユーザー作成後にアプリケーションから作成します
```

## トラブルシューティング

### RLSエラーが発生する場合
- テーブルのRLSが有効になっているか確認
- ユーザーが適切にログインしているか確認
- user_tenant_mappingに適切なレコードが存在するか確認

### プラン制限エラーが発生する場合
- tenantsテーブルのplanカラムが正しく設定されているか確認
- plan_usageテーブルの使用状況を確認