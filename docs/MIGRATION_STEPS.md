# Supabase データベースマイグレーション手順

## 1. Supabase SQL Editor での実行順序

### Step 1: 基本スキーマの作成
```sql
-- 1. UUID拡張機能を有効化
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. 001_initial_schema.sql を実行
-- /salon-light-plan/supabase/migrations/001_initial_schema.sql の内容をコピー＆ペースト
```

### Step 2: Row Level Security (RLS) ポリシーの設定
```sql
-- 3. 002_row_level_security.sql を実行
-- /salon-light-plan/supabase/migrations/002_row_level_security.sql の内容をコピー＆ペースト
```

### Step 3: セキュリティ修正
```sql
-- 4. 013_security_fixes_v2.sql を実行
-- /salon-light-plan/supabase/migrations/013_security_fixes_v2.sql の内容をコピー＆ペースト

-- 5. 014_fix_all_function_search_paths.sql を実行
-- /salon-light-plan/supabase/migrations/014_fix_all_function_search_paths.sql の内容をコピー＆ペースト
```

### Step 4: 機能拡張（スタンダードプラン）
```sql
-- 6. 004_standard_plan_features.sql を実行
-- /salon-light-plan/supabase/migrations/004_standard_plan_features.sql の内容をコピー＆ペースト
```

### Step 5: 検証
```sql
-- 7. verify_security_fixes.sql を実行して検証
-- /salon-light-plan/supabase/migrations/verify_security_fixes.sql の内容をコピー＆ペースト
```

## 2. 実行後の確認事項

### テーブルの確認
Supabase Dashboard の Table Editor で以下のテーブルが作成されていることを確認：
- tenants
- users
- customers
- staff
- reservations
- treatments
- treatment_menus
- messages
- message_templates
- campaigns

### RLSポリシーの確認
各テーブルで RLS が有効になっていることを確認：
1. Table Editor → 各テーブルを選択
2. RLS enabled のトグルがONになっていることを確認

## 3. 初期データの投入

必要に応じて、テストデータを投入：
```sql
-- テストテナントの作成
INSERT INTO tenants (name, email, plan_type)
VALUES ('Salon Lumière Test', 'test@salon-lumiere.com', 'light');

-- テストユーザーの作成は、Supabase Auth経由で行う必要があります
```

## 4. トラブルシューティング

### エラーが発生した場合
1. エラーメッセージを確認
2. 該当するマイグレーションファイルを再度確認
3. 必要に応じて、個別のSQLステートメントを実行

### ロールバック
マイグレーションを取り消す必要がある場合は、各テーブルを手動で削除：
```sql
-- 注意: データが削除されます
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS reservations CASCADE;
-- ... 他のテーブルも同様に
```