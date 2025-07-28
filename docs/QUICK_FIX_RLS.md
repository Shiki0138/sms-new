# RLSエラーの即座の解決方法

## エラー内容
```
テナント作成エラー: new row violates row-level security policy for table "tenants"
```

## 最速の解決方法

### 方法1: RLSポリシーを修正（推奨）

Supabase SQL Editorで実行：

```sql
-- FIX_TENANT_RLS.sql の内容を実行
```

### 方法2: 開発環境用の一時的な解決（最速）

**⚠️ 本番環境では絶対に実行しないでください**

```sql
-- RLSを一時的に無効化
ALTER TABLE tenants DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE plan_usage DISABLE ROW LEVEL SECURITY;
ALTER TABLE business_hours DISABLE ROW LEVEL SECURITY;
```

これでサインアップが可能になります。

### 方法3: 手動でアカウント作成

1. **Supabase Authでユーザーを作成**
   - Authentication → Users → Invite user
   - メールアドレスを入力

2. **SQL Editorで以下を実行**

```sql
-- デモテナントが既に存在する場合
INSERT INTO users (auth_id, tenant_id, email, full_name, role)
VALUES (
  '招待したユーザーのUID'::uuid,
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,
  'your@email.com',
  'オーナー',
  'owner'
);
```

または新しいテナントを作成：

```sql
-- 新しいテナントを作成
INSERT INTO tenants (name, plan_type, email, settings)
VALUES (
  'マイサロン',
  'light',
  'your@email.com',
  '{"business_name": "マイサロン", "business_type": "beauty_salon", "timezone": "Asia/Tokyo"}'::jsonb
) RETURNING id;

-- 上記で返されたIDを使用してユーザーレコードを作成
INSERT INTO users (auth_id, tenant_id, email, full_name, role)
VALUES (
  '招待したユーザーのUID'::uuid,
  '上で返されたテナントID'::uuid,
  'your@email.com',
  'オーナー',
  'owner'
);
```

## 本番環境での正しい設定

開発が完了したら、必ずRLSを再度有効化：

```sql
-- RLSを再度有効化
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_hours ENABLE ROW LEVEL SECURITY;

-- 正しいポリシーを設定
-- FIX_TENANT_RLS.sql の内容を実行
```

## 確認方法

```sql
-- RLSの状態を確認
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('tenants', 'users', 'plan_usage', 'business_hours');
```