-- =====================================
-- 型の不一致を修正するSQL
-- =====================================

-- 1. 既存のテーブルを確認
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'tenants';

-- 2. 既存のテーブルを削除（注意：データが失われます）
DROP TABLE IF EXISTS plan_usage CASCADE;
DROP TABLE IF EXISTS staff CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS tenants CASCADE;

-- 3. UUID拡張を有効化
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 4. すべてのIDをUUID型で統一してテーブルを作成

-- tenants テーブル
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  plan_type VARCHAR(50) NOT NULL DEFAULT 'light',
  email VARCHAR(255) UNIQUE NOT NULL,
  phone_number VARCHAR(20),
  address TEXT,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- users テーブル
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  role VARCHAR(50) NOT NULL DEFAULT 'staff' CHECK (role IN ('owner', 'admin', 'staff')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- customers テーブル
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  name_kana VARCHAR(255),
  phone_number VARCHAR(20),
  email VARCHAR(255),
  birth_date DATE,
  gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
  address TEXT,
  notes TEXT,
  visit_count INTEGER DEFAULT 0,
  last_visit_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- staff テーブル
CREATE TABLE staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone_number VARCHAR(20),
  role VARCHAR(50) DEFAULT 'stylist',
  color VARCHAR(7) DEFAULT '#3B82F6',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- plan_usage テーブル
CREATE TABLE plan_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  customers_count INTEGER DEFAULT 0,
  reservations_count INTEGER DEFAULT 0,
  messages_sent INTEGER DEFAULT 0,
  ai_replies_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, month)
);

-- 5. インデックスを作成
CREATE INDEX idx_users_auth_id ON users(auth_id);
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_customers_tenant_id ON customers(tenant_id);
CREATE INDEX idx_staff_tenant_id ON staff(tenant_id);
CREATE INDEX idx_plan_usage_tenant_id ON plan_usage(tenant_id);

-- 6. RLSを有効化
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_usage ENABLE ROW LEVEL SECURITY;

-- 7. RLSポリシーを作成

-- ヘルパー関数：現在のユーザーのtenant_idを取得
CREATE OR REPLACE FUNCTION get_user_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM users WHERE auth_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- tenants ポリシー
CREATE POLICY "Users can view own tenant" ON tenants
  FOR SELECT USING (id = get_user_tenant_id());

CREATE POLICY "Anyone can create tenant on signup" ON tenants
  FOR INSERT WITH CHECK (true);

-- users ポリシー
CREATE POLICY "Users can insert with matching auth id" ON users
  FOR INSERT WITH CHECK (auth_id = auth.uid());

CREATE POLICY "Users can view same tenant users" ON users
  FOR SELECT USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can update own record" ON users
  FOR UPDATE USING (auth_id = auth.uid());

-- customers ポリシー
CREATE POLICY "Users can manage same tenant customers" ON customers
  FOR ALL USING (tenant_id = get_user_tenant_id());

-- staff ポリシー
CREATE POLICY "Users can manage same tenant staff" ON staff
  FOR ALL USING (tenant_id = get_user_tenant_id());

-- plan_usage ポリシー
CREATE POLICY "Users can view same tenant usage" ON plan_usage
  FOR SELECT USING (tenant_id = get_user_tenant_id());

CREATE POLICY "System can manage plan usage" ON plan_usage
  FOR ALL USING (true);

-- 8. 更新時刻の自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_staff_updated_at BEFORE UPDATE ON staff
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_plan_usage_updated_at BEFORE UPDATE ON plan_usage
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();