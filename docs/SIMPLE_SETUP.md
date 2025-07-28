# シンプルセットアップ手順

## 1. Supabaseでテーブルを作成

Supabase SQL Editorで以下を順番に実行：

### Step 1: 基本テーブル作成
```sql
-- 000_fix_types.sql を実行
```

### Step 2: RLSポリシー追加
```sql
-- 005_fix_signup_policies.sql を実行
```

### Step 3: 不足テーブル追加（必要に応じて）
```sql
-- 006_add_missing_tables.sql を実行
```

## 2. 動作確認

1. `/auth/signup` にアクセス
2. テスト用アカウントを作成：
   - サロン名: テストサロン
   - メール: test@example.com
   - パスワード: password123

## 3. よくあるエラーと対処法

### "relation does not exist" エラー
→ Step 1のSQLが正しく実行されているか確認

### "violates row-level security policy" エラー
→ Step 2のRLSポリシーを実行

### "Failed to send a request to the Edge Function" エラー
→ 最新のコードではEdge Functionを使用しないので、このエラーは発生しないはず

## 4. 最小限の動作確認SQL

どうしても動作しない場合は、一時的にRLSを無効化：

```sql
-- RLSを一時的に無効化（開発時のみ）
ALTER TABLE tenants DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE plan_usage DISABLE ROW LEVEL SECURITY;

-- テスト後は必ず再度有効化
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_usage ENABLE ROW LEVEL SECURITY;
```

## 5. 確認用コマンド

```sql
-- テーブル一覧
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' ORDER BY table_name;

-- RLSポリシー一覧
SELECT schemaname, tablename, policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public';
```