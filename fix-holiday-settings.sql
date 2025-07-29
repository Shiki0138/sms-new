-- =====================================
-- 休日設定機能の修正スクリプト
-- =====================================

-- 1. 既存のget_user_tenant_id関数を確認・作成
CREATE OR REPLACE FUNCTION get_user_tenant_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT tenant_id
    FROM users
    WHERE auth_id = auth.uid() OR id = auth.uid()
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. holiday_settingsテーブルの作成
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

-- 3. インデックスの作成
CREATE INDEX IF NOT EXISTS idx_holiday_settings_tenant ON holiday_settings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_holiday_settings_active ON holiday_settings(is_active);

-- 4. RLSの有効化
ALTER TABLE holiday_settings ENABLE ROW LEVEL SECURITY;

-- 5. RLSポリシーの作成
DROP POLICY IF EXISTS "Users can manage same tenant holidays" ON holiday_settings;
CREATE POLICY "Users can manage same tenant holidays" ON holiday_settings
  FOR ALL USING (tenant_id = get_user_tenant_id());

-- 6. 更新日時の自動更新関数（既存の場合はスキップ）
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 7. 更新トリガーの作成
DROP TRIGGER IF EXISTS update_holiday_settings_updated_at ON holiday_settings;
CREATE TRIGGER update_holiday_settings_updated_at
BEFORE UPDATE ON holiday_settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- 8. テストテナントのIDを確認・修正
-- テスト用のテナントIDを統一（どちらか一つに統一）
DO $$
DECLARE
  correct_tenant_id UUID;
BEGIN
  -- 既存のテナントIDを確認
  SELECT id INTO correct_tenant_id FROM tenants LIMIT 1;
  
  IF correct_tenant_id IS NOT NULL THEN
    RAISE NOTICE 'Using tenant ID: %', correct_tenant_id;
  ELSE
    -- テナントが存在しない場合は作成
    INSERT INTO tenants (id, name, plan_type, email, phone_number, address)
    VALUES (
      'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::UUID,
      'デモ美容サロン',
      'light',
      'demo@salon.com',
      '03-1234-5678',
      '東京都渋谷区1-2-3'
    )
    RETURNING id INTO correct_tenant_id;
  END IF;
END $$;

-- 9. 動作確認
SELECT 
  'holiday_settings table' as check_item,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'holiday_settings'
    ) THEN 'OK' ELSE 'NG' 
  END as status;