-- =====================================
-- 本番環境の同期問題を修正
-- =====================================

-- 1. business_hoursテーブルのデフォルトデータを挿入
INSERT INTO business_hours (tenant_id, day_of_week, is_open, open_time, close_time, break_start_time, break_end_time)
SELECT 
  t.id as tenant_id,
  d.day_of_week,
  CASE 
    WHEN d.day_of_week = 0 THEN false -- 日曜日は休み
    ELSE true
  END as is_open,
  '09:00:00'::time as open_time,
  '19:00:00'::time as close_time,
  '12:00:00'::time as break_start_time,
  '13:00:00'::time as break_end_time
FROM 
  tenants t
  CROSS JOIN (
    SELECT generate_series(0, 6) as day_of_week
  ) d
WHERE NOT EXISTS (
  SELECT 1 FROM business_hours bh 
  WHERE bh.tenant_id = t.id AND bh.day_of_week = d.day_of_week
);

-- 2. RLSポリシーの確認と修正
-- get_user_tenant_id関数が存在しない場合は作成
CREATE OR REPLACE FUNCTION get_user_tenant_id()
RETURNS UUID AS $$
BEGIN
  -- 最初にusersテーブルから取得を試みる
  RETURN (
    SELECT tenant_id 
    FROM users 
    WHERE auth_id = auth.uid()
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. holiday_settingsテーブルが存在しない場合は作成
CREATE TABLE IF NOT EXISTS holiday_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  holiday_type VARCHAR(20) NOT NULL CHECK (holiday_type IN ('weekly', 'monthly', 'specific_date')),
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),
  week_of_month INTEGER CHECK (week_of_month BETWEEN 1 AND 5),
  specific_date DATE,
  end_date DATE,
  description TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  CHECK (
    (holiday_type = 'weekly' AND day_of_week IS NOT NULL) OR
    (holiday_type = 'monthly' AND day_of_week IS NOT NULL AND week_of_month IS NOT NULL) OR
    (holiday_type = 'specific_date' AND specific_date IS NOT NULL)
  )
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_holiday_settings_tenant ON holiday_settings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_holiday_settings_active ON holiday_settings(is_active);

-- RLSを有効化
ALTER TABLE holiday_settings ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーを削除して再作成
DROP POLICY IF EXISTS "Users can manage same tenant holidays" ON holiday_settings;
CREATE POLICY "Users can manage same tenant holidays" ON holiday_settings
  FOR ALL USING (tenant_id = get_user_tenant_id());

-- 4. business_hoursテーブルのRLSポリシーも確認
DROP POLICY IF EXISTS "Users can manage same tenant business hours" ON business_hours;
CREATE POLICY "Users can manage same tenant business hours" ON business_hours
  FOR ALL USING (tenant_id = get_user_tenant_id());

-- 5. テスト用のサンプル休日データを挿入（オプション）
-- INSERT INTO holiday_settings (tenant_id, holiday_type, day_of_week, description)
-- SELECT 
--   t.id,
--   'weekly',
--   0, -- 日曜日
--   '定休日（日曜日）'
-- FROM tenants t
-- WHERE NOT EXISTS (
--   SELECT 1 FROM holiday_settings hs 
--   WHERE hs.tenant_id = t.id 
--   AND hs.holiday_type = 'weekly' 
--   AND hs.day_of_week = 0
-- );

-- 6. 権限の確認
GRANT ALL ON business_hours TO authenticated;
GRANT ALL ON holiday_settings TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_tenant_id() TO authenticated;

-- 7. 更新トリガーの修正
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- business_hoursの更新トリガー
DROP TRIGGER IF EXISTS update_business_hours_updated_at ON business_hours;
CREATE TRIGGER update_business_hours_updated_at
  BEFORE UPDATE ON business_hours
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- holiday_settingsの更新トリガー  
DROP TRIGGER IF EXISTS update_holiday_settings_updated_at ON holiday_settings;
CREATE TRIGGER update_holiday_settings_updated_at
  BEFORE UPDATE ON holiday_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();