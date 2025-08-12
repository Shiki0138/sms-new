-- Row Level Security (RLS) ポリシー

-- 全テーブルでRLSを有効化
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tenant_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_usage ENABLE ROW LEVEL SECURITY;

-- テナントポリシー
CREATE POLICY "Users can only access their tenant" ON tenants
  FOR ALL USING (
    id IN (
      SELECT tenant_id FROM user_tenant_mapping 
      WHERE user_id = auth.uid()
    )
  );

-- user_tenant_mappingポリシー
CREATE POLICY "Users can only see their own mappings" ON user_tenant_mapping
  FOR ALL USING (user_id = auth.uid());

-- 顧客ポリシー
CREATE POLICY "Users can only access their tenant's customers" ON customers
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenant_mapping 
      WHERE user_id = auth.uid()
    )
  );

-- サービスメニューポリシー
CREATE POLICY "Users can only access their tenant's menus" ON service_menus
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenant_mapping 
      WHERE user_id = auth.uid()
    )
  );

-- 予約ポリシー
CREATE POLICY "Users can only access their tenant's reservations" ON reservations
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenant_mapping 
      WHERE user_id = auth.uid()
    )
  );

-- 営業設定ポリシー
CREATE POLICY "Users can only access their tenant's settings" ON business_settings
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenant_mapping 
      WHERE user_id = auth.uid()
    )
  );

-- プラン使用状況ポリシー
CREATE POLICY "Users can only access their tenant's usage" ON plan_usage
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenant_mapping 
      WHERE user_id = auth.uid()
    )
  );