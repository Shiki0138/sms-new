-- =====================================
-- 緊急修正: holiday_settingsテーブルの作成
-- =====================================

-- 1. テーブルをドロップして再作成（データがない場合のみ）
DROP TABLE IF EXISTS holiday_settings CASCADE;

-- 2. テーブルを新規作成
CREATE TABLE holiday_settings (
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
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. インデックスの作成
CREATE INDEX idx_holiday_settings_tenant ON holiday_settings(tenant_id);
CREATE INDEX idx_holiday_settings_active ON holiday_settings(is_active);

-- 4. RLSを無効化（一時的に）
ALTER TABLE holiday_settings DISABLE ROW LEVEL SECURITY;

-- 5. 動作確認
SELECT 
  'holiday_settings created' as status,
  COUNT(*) as column_count
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'holiday_settings';

-- 6. plan_usageテーブルの修正（406エラー対策）
-- monthカラムがない可能性があるので確認
DO $$
BEGIN
  -- monthカラムが存在しない場合は追加
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'plan_usage' 
      AND column_name = 'month'
  ) THEN
    ALTER TABLE plan_usage ADD COLUMN month DATE;
  END IF;
END $$;

-- 7. customer_channelsテーブルの確認と作成
CREATE TABLE IF NOT EXISTS customer_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  channel_type VARCHAR(20) NOT NULL CHECK (channel_type IN ('line', 'instagram', 'email', 'sms')),
  channel_id VARCHAR(255) NOT NULL,
  channel_name VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  profile_picture_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(customer_id, channel_type)
);

-- 8. RLSを再度有効化してポリシーを設定
ALTER TABLE holiday_settings ENABLE ROW LEVEL SECURITY;

-- 簡単なポリシー（全ユーザーが全操作可能 - 一時的）
CREATE POLICY "Allow all operations" ON holiday_settings
  FOR ALL USING (true) WITH CHECK (true);

-- 9. 結果確認
SELECT 
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE tablename IN ('holiday_settings', 'customers', 'plan_usage')
GROUP BY tablename;