-- =====================================
-- Row Level Security (RLS) ポリシー
-- =====================================

-- RLSを有効化
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE holiday_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulk_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_usage ENABLE ROW LEVEL SECURITY;

-- =====================================
-- ヘルパー関数
-- =====================================

-- ユーザーのテナントIDを取得する関数
CREATE OR REPLACE FUNCTION get_user_tenant_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT tenant_id 
    FROM users 
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ユーザーがオーナーまたは管理者かチェックする関数
CREATE OR REPLACE FUNCTION is_admin_or_owner()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM users 
    WHERE id = auth.uid() 
    AND role IN ('owner', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================
-- TENANTS ポリシー
-- =====================================

-- テナント情報は自分のテナントのみ閲覧可能
CREATE POLICY "Users can view own tenant" ON tenants
  FOR SELECT USING (id = get_user_tenant_id());

-- テナント情報の更新はオーナーのみ
CREATE POLICY "Only owners can update tenant" ON tenants
  FOR UPDATE USING (
    id = get_user_tenant_id() 
    AND EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'owner'
    )
  );

-- =====================================
-- USERS ポリシー
-- =====================================

-- 同じテナントのユーザー情報を閲覧可能
CREATE POLICY "Users can view same tenant users" ON users
  FOR SELECT USING (tenant_id = get_user_tenant_id());

-- 自分の情報は更新可能
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (id = auth.uid());

-- 管理者はユーザーを作成・削除可能
CREATE POLICY "Admins can manage users" ON users
  FOR ALL USING (is_admin_or_owner());

-- =====================================
-- CUSTOMERS ポリシー
-- =====================================

-- 同じテナントの顧客情報にアクセス可能
CREATE POLICY "Users can access same tenant customers" ON customers
  FOR ALL USING (tenant_id = get_user_tenant_id());

-- =====================================
-- STAFF ポリシー
-- =====================================

-- 同じテナントのスタッフ情報を閲覧可能
CREATE POLICY "Users can view same tenant staff" ON staff
  FOR SELECT USING (tenant_id = get_user_tenant_id());

-- スタッフの管理は管理者のみ
CREATE POLICY "Admins can manage staff" ON staff
  FOR ALL USING (
    tenant_id = get_user_tenant_id() 
    AND is_admin_or_owner()
  );

-- =====================================
-- SERVICES ポリシー
-- =====================================

-- 同じテナントのサービス情報にアクセス可能
CREATE POLICY "Users can access same tenant services" ON services
  FOR ALL USING (tenant_id = get_user_tenant_id());

-- =====================================
-- RESERVATIONS ポリシー
-- =====================================

-- 同じテナントの予約情報にアクセス可能
CREATE POLICY "Users can access same tenant reservations" ON reservations
  FOR ALL USING (tenant_id = get_user_tenant_id());

-- =====================================
-- MESSAGES ポリシー
-- =====================================

-- 同じテナントのメッセージにアクセス可能
CREATE POLICY "Users can access same tenant messages" ON messages
  FOR ALL USING (tenant_id = get_user_tenant_id());

-- =====================================
-- CUSTOMER_CHANNELS ポリシー
-- =====================================

-- 同じテナントの顧客チャンネル情報にアクセス可能
CREATE POLICY "Users can access same tenant customer channels" ON customer_channels
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM customers 
      WHERE customers.id = customer_channels.customer_id 
      AND customers.tenant_id = get_user_tenant_id()
    )
  );

-- =====================================
-- BUSINESS_HOURS ポリシー
-- =====================================

-- 同じテナントの営業時間を閲覧可能
CREATE POLICY "Users can view same tenant business hours" ON business_hours
  FOR SELECT USING (tenant_id = get_user_tenant_id());

-- 営業時間の管理は管理者のみ
CREATE POLICY "Admins can manage business hours" ON business_hours
  FOR ALL USING (
    tenant_id = get_user_tenant_id() 
    AND is_admin_or_owner()
  );

-- =====================================
-- HOLIDAY_SETTINGS ポリシー
-- =====================================

-- 同じテナントの休日設定を閲覧可能
CREATE POLICY "Users can view same tenant holidays" ON holiday_settings
  FOR SELECT USING (tenant_id = get_user_tenant_id());

-- 休日設定の管理は管理者のみ
CREATE POLICY "Admins can manage holidays" ON holiday_settings
  FOR ALL USING (
    tenant_id = get_user_tenant_id() 
    AND is_admin_or_owner()
  );

-- =====================================
-- REMINDER_CONFIGS ポリシー
-- =====================================

-- 同じテナントのリマインダー設定にアクセス可能
CREATE POLICY "Users can access same tenant reminder configs" ON reminder_configs
  FOR ALL USING (tenant_id = get_user_tenant_id());

-- =====================================
-- REMINDER_LOGS ポリシー
-- =====================================

-- 同じテナントのリマインダーログを閲覧可能
CREATE POLICY "Users can view same tenant reminder logs" ON reminder_logs
  FOR SELECT USING (tenant_id = get_user_tenant_id());

-- =====================================
-- BULK_MESSAGES ポリシー
-- =====================================

-- 同じテナントの一斉配信情報にアクセス可能
CREATE POLICY "Users can access same tenant bulk messages" ON bulk_messages
  FOR ALL USING (tenant_id = get_user_tenant_id());

-- =====================================
-- PLAN_USAGE ポリシー
-- =====================================

-- 同じテナントのプラン使用状況を閲覧可能
CREATE POLICY "Users can view same tenant plan usage" ON plan_usage
  FOR SELECT USING (tenant_id = get_user_tenant_id());

-- システムのみが更新可能（service roleを使用）
-- ユーザーは直接更新できない