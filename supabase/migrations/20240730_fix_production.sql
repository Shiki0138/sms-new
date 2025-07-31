-- 本番環境用の初期化スクリプト
-- テナント、営業時間、休日設定の初期データを作成

-- テナントテーブルの作成（存在しない場合）
CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- デフォルトテナントの作成（存在しない場合）
INSERT INTO tenants (id, name) 
VALUES ('default-tenant-id', 'デフォルトサロン')
ON CONFLICT (id) DO NOTHING;

-- 営業時間テーブルの作成（存在しない場合）
CREATE TABLE IF NOT EXISTS business_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  is_open BOOLEAN DEFAULT true,
  open_time TIME NOT NULL,
  close_time TIME NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, day_of_week)
);

-- 休日設定テーブルの作成（存在しない場合）
CREATE TABLE IF NOT EXISTS holiday_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  holiday_type TEXT NOT NULL CHECK (holiday_type IN ('specific_date', 'weekly', 'monthly')),
  specific_date DATE,
  end_date DATE,
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),
  week_of_month INTEGER CHECK (week_of_month >= 1 AND week_of_month <= 5),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- デフォルトの営業時間を挿入（存在しない場合）
INSERT INTO business_hours (tenant_id, day_of_week, is_open, open_time, close_time) VALUES
  ('default-tenant-id', 0, false, '09:00', '18:00'), -- 日曜日（休業）
  ('default-tenant-id', 1, false, '09:00', '19:00'), -- 月曜日（休業）
  ('default-tenant-id', 2, false, '09:00', '19:00'), -- 火曜日（休業）
  ('default-tenant-id', 3, true, '09:00', '19:00'),  -- 水曜日
  ('default-tenant-id', 4, true, '09:00', '19:00'),  -- 木曜日
  ('default-tenant-id', 5, true, '09:00', '19:00'),  -- 金曜日
  ('default-tenant-id', 6, true, '09:00', '18:00')   -- 土曜日
ON CONFLICT (tenant_id, day_of_week) DO UPDATE SET
  is_open = EXCLUDED.is_open,
  open_time = EXCLUDED.open_time,
  close_time = EXCLUDED.close_time,
  updated_at = NOW();

-- デフォルトの休日設定を挿入（毎週月曜日・火曜日）
INSERT INTO holiday_settings (tenant_id, holiday_type, day_of_week, description, is_active) VALUES
  ('default-tenant-id', 'weekly', 1, '毎週月曜日', true),
  ('default-tenant-id', 'weekly', 2, '毎週火曜日', true)
ON CONFLICT DO NOTHING;

-- 権限の設定
GRANT ALL ON tenants TO authenticated;
GRANT ALL ON business_hours TO authenticated;
GRANT ALL ON holiday_settings TO authenticated;

-- RLSポリシーの作成（存在しない場合）
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE holiday_settings ENABLE ROW LEVEL SECURITY;

-- 全ユーザーがデフォルトテナントのデータを読み書きできるようにする
CREATE POLICY "Allow all operations on default tenant" ON tenants
  FOR ALL USING (id = 'default-tenant-id');

CREATE POLICY "Allow all operations on default tenant business hours" ON business_hours
  FOR ALL USING (tenant_id = 'default-tenant-id');

CREATE POLICY "Allow all operations on default tenant holidays" ON holiday_settings
  FOR ALL USING (tenant_id = 'default-tenant-id');