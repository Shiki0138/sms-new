# Supabase本番環境セットアップガイド

## 1. Supabaseプロジェクトの作成

1. [Supabase](https://supabase.com)にアクセス
2. 「Start your project」をクリック
3. GitHubでサインイン
4. 新しいプロジェクトを作成：
   - Organization: 個人または組織を選択
   - Project name: `salon-light-plan`
   - Database Password: 強力なパスワードを生成
   - Region: Tokyo (asia-northeast1)
   - Pricing Plan: Free tier（開始時）

## 2. データベースのセットアップ

### SQLエディタでスキーマを実行

1. Supabaseダッシュボード → SQL Editor
2. 以下の順番でSQLファイルを実行：

```sql
-- 1. 初期スキーマ
-- supabase/migrations/001_initial_schema.sql の内容をコピー&ペースト

-- 2. RLSポリシー
-- supabase/migrations/002_rls_policies.sql の内容をコピー&ペースト

-- 3. 初期データ（オプション）
-- supabase/migrations/003_initial_data.sql の内容をコピー&ペースト
```

## 3. 認証の設定

### Email認証を有効化

1. Authentication → Providers
2. Email を有効化
3. 以下の設定を確認：
   - Enable Email Confirmations: ON
   - Enable Email Change Confirmations: ON

### サイトURLの設定

1. Authentication → URL Configuration
2. Site URL: `https://your-app.vercel.app`
3. Redirect URLs:
   - `https://your-app.vercel.app/*`
   - `http://localhost:5173/*` (開発用)

## 4. APIキーの取得

1. Settings → API
2. 以下をコピー：
   - Project URL → `VITE_SUPABASE_URL`
   - Project API keys → anon public → `VITE_SUPABASE_ANON_KEY`
   - Project API keys → service_role → `SUPABASE_SERVICE_ROLE_KEY`（Edge Functions用）

## 5. Edge Functionsのデプロイ

```bash
# Supabase CLIをインストール
npm install -g supabase

# ログイン
supabase login

# プロジェクトをリンク
supabase link --project-ref your-project-ref

# Edge Functionsをデプロイ
supabase functions deploy update-plan-usage
```

## 6. 環境変数の設定

### Vercelでの設定

1. Vercelダッシュボード → Settings → Environment Variables
2. 以下を追加：

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_APP_NAME=美容サロン管理システム
VITE_APP_VERSION=1.0.0
```

### ローカル開発環境

`.env.local`ファイルを作成：

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_APP_NAME=美容サロン管理システム
VITE_APP_VERSION=1.0.0
```

## 7. 初期ユーザーの作成

### 管理者ユーザーを作成

1. Supabaseダッシュボード → Authentication → Users
2. 「Invite user」をクリック
3. メールアドレスを入力して招待

### usersテーブルにレコードを作成

SQLエディタで実行：

```sql
-- 作成したユーザーのUIDを確認（Authentication → Usersで確認）
-- そのUIDを使用して以下を実行

INSERT INTO users (id, tenant_id, email, full_name, role)
VALUES (
  'ここに認証ユーザーのUIDを入力',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890', -- デモテナントID
  'admin@salon.com',
  '管理者',
  'owner'
);
```

## 8. データベースのバックアップ設定

1. Settings → Database
2. Backups: Point-in-time Recovery を有効化（Pro plan以上）

## 9. セキュリティ設定

### RLSの確認

```sql
-- RLSが有効になっているか確認
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

### APIレート制限

1. Settings → API
2. Rate limiting を確認・調整

## 10. 本番環境での動作確認

### チェックリスト

- [ ] ユーザー登録・ログインができる
- [ ] テナント情報が表示される
- [ ] 顧客の作成・編集・削除ができる
- [ ] 予約の作成・編集・削除ができる
- [ ] プラン制限が正しく動作する
- [ ] メッセージの送受信ができる（API連携後）

## トラブルシューティング

### RLSエラーが発生する場合

```sql
-- 一時的にRLSを無効化してデバッグ
ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;

-- 問題解決後、必ず再度有効化
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
```

### 認証エラーが発生する場合

1. Supabase URLとAnon Keyが正しいか確認
2. 環境変数が正しく設定されているか確認
3. usersテーブルにレコードが存在するか確認

## モニタリング

1. Supabaseダッシュボード → Database → Query Performance
2. API使用状況の確認
3. エラーログの確認

## 次のステップ

1. LINE Messaging APIの設定
2. Instagram APIの設定
3. メール送信サービスの設定
4. 決済システムの統合（将来的な課金実装用）