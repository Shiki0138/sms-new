# クイックセットアップガイド

## 前提条件
- Supabaseアカウント
- Vercelアカウント
- GitHubアカウント

## 1. Supabaseセットアップ（5分）

### 1.1 プロジェクト作成
1. https://supabase.com にアクセス
2. 新規プロジェクト作成
   - Region: Tokyo
   - Database Password: 強力なパスワード

### 1.2 データベーススキーマ実行
1. SQL Editor を開く
2. 以下のファイルの内容を順番に実行：
   ```
   supabase/migrations/001_initial_schema.sql
   supabase/migrations/002_rls_policies.sql
   supabase/migrations/003_initial_data.sql
   ```

### 1.3 認証設定
1. Authentication → Providers → Email を有効化
2. Authentication → URL Configuration:
   - Site URL: `https://your-app.vercel.app`
   - Redirect URLs: 
     - `https://your-app.vercel.app/*`
     - `http://localhost:5173/*`

### 1.4 APIキー取得
Settings → API から以下をコピー：
- Project URL
- anon public key

## 2. Vercelデプロイ（3分）

### 2.1 環境変数設定
```env
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_APP_NAME=美容サロン管理システム
VITE_APP_VERSION=1.0.0
```

### 2.2 デプロイ
```bash
# Vercel CLIがない場合
npm i -g vercel

# デプロイ
vercel --prod
```

## 3. 初期ユーザー作成（2分）

### 3.1 Supabaseで認証ユーザー作成
1. Authentication → Users → Invite user
2. メールアドレスを入力

### 3.2 usersテーブルにレコード追加
SQL Editorで実行：
```sql
INSERT INTO users (id, tenant_id, email, full_name, role)
VALUES (
  '招待したユーザーのUID',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'your-email@example.com',
  'オーナー',
  'owner'
);
```

## 4. 動作確認

1. デプロイされたURLにアクセス
2. 作成したユーザーでログイン
3. ダッシュボードが表示されればOK

## トラブルシューティング

### ログインできない
- Supabase URLとAnon Keyが正しいか確認
- usersテーブルにレコードが存在するか確認

### データが表示されない
- RLSポリシーが正しく設定されているか確認
- テナントIDが一致しているか確認

### エラーが発生する
- ブラウザのコンソールでエラー内容を確認
- Supabaseのログを確認

## サポート
問題が解決しない場合は、以下を確認：
- [Supabase Docs](https://supabase.com/docs)
- [Vercel Docs](https://vercel.com/docs)