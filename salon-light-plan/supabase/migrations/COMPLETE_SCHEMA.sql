-- =====================================
-- 完全なデータベーススキーマ
-- 全てのテーブルを正しい順序で作成
-- =====================================

-- 既存のテーブルを削除（順序が重要）
DROP TABLE IF EXISTS reminder_logs CASCADE;
DROP TABLE IF EXISTS reminder_configs CASCADE;
DROP TABLE IF EXISTS bulk_messages CASCADE;
DROP TABLE IF EXISTS holiday_settings CASCADE;
DROP TABLE IF EXISTS business_hours CASCADE;
DROP TABLE IF EXISTS customer_channels CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS reservations CASCADE;
DROP TABLE IF EXISTS services CASCADE;
DROP TABLE IF EXISTS staff CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS plan_usage CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS tenants CASCADE;

-- 関数も削除
DROP FUNCTION IF EXISTS get_user_tenant_id() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at() CASCADE;

-- UUID拡張を有効化
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================
-- 1. TENANTS（基本）
-- =====================================
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

-- =====================================
-- 2. USERS（認証連携）
-- =====================================
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

-- =====================================
-- 3. CUSTOMERS（顧客）
-- =====================================
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
  tags TEXT[],
  visit_count INTEGER DEFAULT 0,
  last_visit_date DATE,
  total_spent DECIMAL(10, 2) DEFAULT 0,
  preferred_contact_method VARCHAR(20),
  line_user_id VARCHAR(255),
  instagram_id VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================
-- 4. STAFF（スタッフ）
-- =====================================
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

-- =====================================
-- 5. SERVICES（サービスメニュー）
-- =====================================
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  duration INTEGER NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================
-- 6. RESERVATIONS（予約）
-- =====================================
CREATE TABLE reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) DEFAULT 'confirmed',
  menu_content TEXT,
  price DECIMAL(10, 2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================
-- 7. MESSAGES（メッセージ）
-- =====================================
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  channel_type VARCHAR(20) NOT NULL,
  direction VARCHAR(10) NOT NULL CHECK (direction IN ('sent', 'received')),
  message_type VARCHAR(20) DEFAULT 'text',
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================
-- 8. BUSINESS_HOURS（営業時間）
-- =====================================
CREATE TABLE business_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  is_open BOOLEAN DEFAULT true,
  open_time TIME,
  close_time TIME,
  break_start_time TIME,
  break_end_time TIME,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, day_of_week)
);

-- =====================================
-- 9. HOLIDAY_SETTINGS（休日設定）
-- =====================================
CREATE TABLE holiday_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  holiday_type VARCHAR(20) NOT NULL CHECK (holiday_type IN ('regular', 'temporary')),
  date DATE,
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),
  name VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================
-- 10. PLAN_USAGE（プラン使用状況）
-- =====================================
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

-- =====================================
-- インデックス作成
-- =====================================
CREATE INDEX idx_users_auth_id ON users(auth_id);
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_customers_tenant_id ON customers(tenant_id);
CREATE INDEX idx_staff_tenant_id ON staff(tenant_id);
CREATE INDEX idx_services_tenant_id ON services(tenant_id);
CREATE INDEX idx_reservations_tenant_id ON reservations(tenant_id);
CREATE INDEX idx_reservations_start_time ON reservations(start_time);
CREATE INDEX idx_messages_tenant_id ON messages(tenant_id);
CREATE INDEX idx_business_hours_tenant_id ON business_hours(tenant_id);
CREATE INDEX idx_holiday_settings_tenant_id ON holiday_settings(tenant_id);
CREATE INDEX idx_plan_usage_tenant_id ON plan_usage(tenant_id);

-- =====================================
-- 更新時刻の自動更新
-- =====================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガー作成
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_staff_updated_at BEFORE UPDATE ON staff
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_reservations_updated_at BEFORE UPDATE ON reservations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_business_hours_updated_at BEFORE UPDATE ON business_hours
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_holiday_settings_updated_at BEFORE UPDATE ON holiday_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_plan_usage_updated_at BEFORE UPDATE ON plan_usage
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================
-- RLSを有効化
-- =====================================
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE holiday_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_usage ENABLE ROW LEVEL SECURITY;

-- =====================================
-- ヘルパー関数
-- =====================================
CREATE OR REPLACE FUNCTION get_user_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM users WHERE auth_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- =====================================
-- RLSポリシー
-- =====================================

-- TENANTS
CREATE POLICY "Users can view own tenant" ON tenants
  FOR SELECT USING (id = get_user_tenant_id());
CREATE POLICY "Authenticated users can create tenant" ON tenants
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- USERS
CREATE POLICY "Users can create own record" ON users
  FOR INSERT WITH CHECK (auth_id = auth.uid());
CREATE POLICY "Users can view same tenant users" ON users
  FOR SELECT USING (tenant_id = get_user_tenant_id());
CREATE POLICY "Users can update own record" ON users
  FOR UPDATE USING (auth_id = auth.uid());

-- CUSTOMERS
CREATE POLICY "Users can manage same tenant customers" ON customers
  FOR ALL USING (tenant_id = get_user_tenant_id());

-- STAFF
CREATE POLICY "Users can manage same tenant staff" ON staff
  FOR ALL USING (tenant_id = get_user_tenant_id());

-- SERVICES
CREATE POLICY "Users can manage same tenant services" ON services
  FOR ALL USING (tenant_id = get_user_tenant_id());

-- RESERVATIONS
CREATE POLICY "Users can manage same tenant reservations" ON reservations
  FOR ALL USING (tenant_id = get_user_tenant_id());

-- MESSAGES
CREATE POLICY "Users can manage same tenant messages" ON messages
  FOR ALL USING (tenant_id = get_user_tenant_id());

-- BUSINESS_HOURS
CREATE POLICY "Users can manage same tenant business hours" ON business_hours
  FOR ALL USING (tenant_id = get_user_tenant_id());

-- HOLIDAY_SETTINGS
CREATE POLICY "Users can manage same tenant holidays" ON holiday_settings
  FOR ALL USING (tenant_id = get_user_tenant_id());

-- PLAN_USAGE
CREATE POLICY "Users can view same tenant usage" ON plan_usage
  FOR SELECT USING (tenant_id = get_user_tenant_id());
CREATE POLICY "System can manage plan usage" ON plan_usage
  FOR ALL USING (true);

-- =====================================
-- 初期データ（デモテナント）
-- =====================================
INSERT INTO tenants (id, name, plan_type, email, settings)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,
  'デモ美容サロン',
  'light',
  'demo@salon.com',
  '{"business_name": "デモ美容サロン", "business_type": "beauty_salon", "timezone": "Asia/Tokyo"}'::jsonb
);