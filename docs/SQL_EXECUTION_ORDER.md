# SQLファイル実行順序と確認方法

## エラー: relation "users" does not exist

このエラーは、`users`テーブルが作成されていないことを示しています。

## 1. 現在のテーブル状態を確認

Supabase SQL Editorで以下を実行：

```sql
-- 作成済みテーブルの確認
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

## 2. 必要なSQLを順番に実行

### Step 1: 基本スキーマ（001_initial_schema.sql）
```sql
-- まずUUID拡張を有効化
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- tenantsテーブルを作成（usersテーブルの前に必要）
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  plan_type VARCHAR(50) NOT NULL DEFAULT 'light' CHECK (plan_type IN ('light', 'standard', 'premium')),
  email VARCHAR(255) UNIQUE NOT NULL,
  phone_number VARCHAR(20),
  address TEXT,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- usersテーブルを作成
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  role VARCHAR(50) NOT NULL DEFAULT 'staff' CHECK (role IN ('owner', 'admin', 'staff')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);
```

### Step 2: 他のテーブルを作成
001_initial_schema.sqlの残りの部分を実行

### Step 3: RLSポリシー（002_rls_policies.sql）
RLSポリシーを設定

### Step 4: サインアップ用RLS修正（004_fix_signup_rls.sql）
新規登録用のポリシーを追加

## 3. エラーが続く場合の対処法

### テーブルが既に部分的に存在する場合
```sql
-- 既存のテーブルを削除して再作成（注意：データが失われます）
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS tenants CASCADE;

-- その後、001_initial_schema.sqlを再実行
```

### 依存関係エラーの場合
```sql
-- 外部キー制約を一時的に無効化
SET session_replication_role = 'replica';

-- テーブル作成SQLを実行

-- 外部キー制約を再度有効化
SET session_replication_role = 'origin';
```

## 4. 最小限の動作確認用SQL

すぐに動作確認したい場合は、以下の最小限のSQLを実行：

```sql
-- 1. UUID拡張
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. tenants テーブル
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  plan_type VARCHAR(50) NOT NULL DEFAULT 'light',
  email VARCHAR(255) UNIQUE NOT NULL,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 3. users テーブル
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  role VARCHAR(50) NOT NULL DEFAULT 'staff',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 4. plan_usage テーブル（最小限）
CREATE TABLE IF NOT EXISTS plan_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  customers_count INTEGER DEFAULT 0,
  reservations_count INTEGER DEFAULT 0,
  messages_sent INTEGER DEFAULT 0,
  ai_replies_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(tenant_id, month)
);

-- 5. RLSを有効化
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_usage ENABLE ROW LEVEL SECURITY;

-- 6. 最小限のRLSポリシー
CREATE POLICY "Authenticated users can create tenant on signup" ON tenants
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert own record" ON users
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "Users can view own tenant" ON tenants
  FOR SELECT USING (
    id IN (SELECT tenant_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users can view same tenant users" ON users
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid())
  );
```

## 5. 動作確認

1. 上記のSQLを実行後、サインアップページで新規登録を試す
2. エラーが出た場合は、Supabaseのログを確認
3. 必要に応じて追加のテーブルを作成