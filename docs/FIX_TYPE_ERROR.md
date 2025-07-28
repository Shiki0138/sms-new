# UUID型エラーの修正手順

## エラー内容
```
ERROR: 42804: foreign key constraint "users_tenant_id_fkey" cannot be implemented
DETAIL: Key columns "tenant_id" and "id" are of incompatible types: uuid and text.
```

## 原因
テーブルのID列の型が統一されていない（UUIDとTEXTが混在）

## 修正手順

### 1. Supabase SQL Editorで実行

**重要**: この操作により既存のデータが削除されます。必要に応じてバックアップを取ってください。

```sql
-- supabase/migrations/000_fix_types.sql の内容を実行
```

このSQLは以下を行います：
1. 既存テーブルの削除
2. すべてのIDをUUID型で統一して再作成
3. 適切な外部キー制約の設定
4. RLSポリシーの再設定

### 2. Edge Functionを更新（使用する場合）

```bash
supabase functions deploy signup
```

### 3. 動作確認

1. `/auth/signup` で新規登録
2. ログインして各機能を確認

## テーブル構造の変更点

### 変更前
```sql
-- users テーブル
id UUID PRIMARY KEY -- auth.users.id を直接使用
```

### 変更後
```sql
-- users テーブル
id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- 独自のID
auth_id UUID REFERENCES auth.users(id), -- auth.users.id への参照
```

この変更により：
- テーブル間の参照整合性が保たれる
- RLSポリシーがより柔軟に設定できる
- 将来的な拡張が容易になる

## トラブルシューティング

### 既存データがある場合
1. データをエクスポート
2. テーブルを再作成
3. データをインポート

### RLSエラーが発生する場合
```sql
-- 一時的にRLSを無効化
ALTER TABLE tenants DISABLE ROW LEVEL SECURITY;
-- データ操作
-- RLSを再度有効化
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
```

## 確認用SQL

```sql
-- テーブル構造の確認
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('tenants', 'users', 'customers', 'staff', 'plan_usage')
  AND column_name LIKE '%id'
ORDER BY table_name, column_name;
```