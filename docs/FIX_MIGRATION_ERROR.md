# マイグレーションエラー解決手順

## エラー内容
`ERROR: 42P07: relation "idx_customers_tenant_id" already exists`

このエラーは、インデックスが既に存在することを示しています。

## 解決方法

### 方法1: 既存のスキーマを確認して調整（推奨）

Supabase SQL Editorで以下を実行：

```sql
-- 1. 既存のテーブルとインデックスを確認
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- 2. 既存のインデックスを確認
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY tablename, indexname;

-- 3. 既存のテーブル構造を確認
\d+ customers
\d+ tenants
\d+ users
```

### 方法2: 条件付きマイグレーション実行

各マイグレーションファイルの実行前に、既存のオブジェクトをチェック：

```sql
-- インデックスが存在しない場合のみ作成
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND indexname = 'idx_customers_tenant_id'
    ) THEN
        CREATE INDEX idx_customers_tenant_id ON customers(tenant_id);
    END IF;
END $$;
```

### 方法3: クリーンスタート（データがない場合のみ）

**警告**: この方法はすべてのデータを削除します！

```sql
-- すべての既存テーブルを削除
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- その後、マイグレーションを最初から実行
```

## 推奨される手順

1. **現在の状態を確認**
   ```sql
   -- どのテーブルが既に存在するか確認
   SELECT table_name, 
          (SELECT COUNT(*) FROM information_schema.columns 
           WHERE table_name = t.table_name) as column_count
   FROM information_schema.tables t
   WHERE table_schema = 'public'
   AND table_type = 'BASE TABLE'
   ORDER BY table_name;
   ```

2. **必要な部分だけマイグレーション**
   - 既に存在するテーブルはスキップ
   - 新しいテーブルやカラムのみ追加

3. **安全なマイグレーションスクリプト作成**
   ```sql
   -- テーブルが存在しない場合のみ作成
   CREATE TABLE IF NOT EXISTS customers (
     -- テーブル定義
   );
   
   -- カラムが存在しない場合のみ追加
   ALTER TABLE customers 
   ADD COLUMN IF NOT EXISTS new_column_name TYPE;
   ```

## 次のステップ

1. 上記の確認コマンドを実行して現在の状態を把握
2. 既存のスキーマに基づいて、必要な部分だけをマイグレーション
3. マイグレーション完了後、RLSポリシーを適用