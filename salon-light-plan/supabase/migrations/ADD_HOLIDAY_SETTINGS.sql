-- =====================================
-- 休日設定テーブルの追加
-- =====================================

-- holiday_settingsテーブルの作成
CREATE TABLE IF NOT EXISTS holiday_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  holiday_type VARCHAR(20) NOT NULL CHECK (holiday_type IN ('weekly', 'monthly', 'specific_date')),
  day_of_week INTEGER, -- 0=日曜, 1=月曜...
  week_of_month INTEGER CHECK (week_of_month BETWEEN 1 AND 5), -- 第n週
  specific_date DATE, -- 特定日付
  end_date DATE, -- 期間指定の終了日
  description TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- 制約
  CHECK (
    (holiday_type = 'weekly' AND day_of_week IS NOT NULL) OR
    (holiday_type = 'monthly' AND day_of_week IS NOT NULL AND week_of_month IS NOT NULL) OR
    (holiday_type = 'specific_date' AND specific_date IS NOT NULL)
  )
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_holiday_settings_tenant ON holiday_settings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_holiday_settings_active ON holiday_settings(is_active);

-- RLSポリシー
ALTER TABLE holiday_settings ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーがある場合は削除
DROP POLICY IF EXISTS "Users can manage same tenant holidays" ON holiday_settings;

-- 新しいポリシーを作成
CREATE POLICY "Users can manage same tenant holidays" ON holiday_settings
  FOR ALL USING (tenant_id = get_user_tenant_id());

-- 更新日時の自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_holiday_settings_updated_at ON holiday_settings;

CREATE TRIGGER update_holiday_settings_updated_at
BEFORE UPDATE ON holiday_settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();