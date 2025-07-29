-- =====================================
-- データベース構造の確認と修正スクリプト
-- =====================================

-- 1. holiday_settingsテーブルの存在確認
SELECT 
  'holiday_settings table exists' as check_item,
  EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'holiday_settings'
  ) as result;

-- 2. カラム構造の確認
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'holiday_settings'
ORDER BY ordinal_position;

-- 3. テーブルが存在しない場合は作成
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
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. カラムが不足している場合は追加
-- week_of_monthカラムの追加
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'holiday_settings' 
      AND column_name = 'week_of_month'
  ) THEN
    ALTER TABLE holiday_settings ADD COLUMN week_of_month INTEGER CHECK (week_of_month BETWEEN 1 AND 5);
  END IF;
END $$;

-- specific_dateカラムの追加
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'holiday_settings' 
      AND column_name = 'specific_date'
  ) THEN
    ALTER TABLE holiday_settings ADD COLUMN specific_date DATE;
  END IF;
END $$;

-- end_dateカラムの追加
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'holiday_settings' 
      AND column_name = 'end_date'
  ) THEN
    ALTER TABLE holiday_settings ADD COLUMN end_date DATE;
  END IF;
END $$;

-- 5. インデックスの作成
CREATE INDEX IF NOT EXISTS idx_holiday_settings_tenant ON holiday_settings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_holiday_settings_active ON holiday_settings(is_active);
CREATE INDEX IF NOT EXISTS idx_holiday_settings_type ON holiday_settings(holiday_type);

-- 6. RLSの有効化
ALTER TABLE holiday_settings ENABLE ROW LEVEL SECURITY;

-- 7. get_user_tenant_id関数の作成または更新
CREATE OR REPLACE FUNCTION get_user_tenant_id()
RETURNS UUID AS $$
DECLARE
  tenant_id_result UUID;
BEGIN
  -- まずusersテーブルから取得を試みる
  SELECT tenant_id INTO tenant_id_result
  FROM users
  WHERE auth_id = auth.uid() OR id = auth.uid()
  LIMIT 1;
  
  -- 見つからない場合はauth.jwt()から取得
  IF tenant_id_result IS NULL THEN
    tenant_id_result := (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::UUID;
  END IF;
  
  RETURN tenant_id_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. RLSポリシーの作成
DROP POLICY IF EXISTS "Users can view same tenant holidays" ON holiday_settings;
CREATE POLICY "Users can view same tenant holidays" ON holiday_settings
  FOR SELECT USING (tenant_id = get_user_tenant_id());

DROP POLICY IF EXISTS "Users can insert same tenant holidays" ON holiday_settings;
CREATE POLICY "Users can insert same tenant holidays" ON holiday_settings
  FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id());

DROP POLICY IF EXISTS "Users can update same tenant holidays" ON holiday_settings;
CREATE POLICY "Users can update same tenant holidays" ON holiday_settings
  FOR UPDATE USING (tenant_id = get_user_tenant_id());

DROP POLICY IF EXISTS "Users can delete same tenant holidays" ON holiday_settings;
CREATE POLICY "Users can delete same tenant holidays" ON holiday_settings
  FOR DELETE USING (tenant_id = get_user_tenant_id());

-- 9. 更新トリガーの作成
DROP TRIGGER IF EXISTS update_holiday_settings_updated_at ON holiday_settings;
CREATE TRIGGER update_holiday_settings_updated_at
BEFORE UPDATE ON holiday_settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 10. plan_usageテーブルの確認と修正
-- エラー406が出ているので、カラム名を確認
SELECT 
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'plan_usage'
ORDER BY ordinal_position;

-- 11. customer_channelsテーブルの確認
-- エラー400が出ているので、結合関係を確認
SELECT 
  'customer_channels table exists' as check_item,
  EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'customer_channels'
  ) as result;

-- 12. 動作確認のためのテストクエリ
-- holiday_settingsへの挿入テスト
DO $$
DECLARE
  test_tenant_id UUID;
BEGIN
  -- テストテナントIDを取得
  SELECT id INTO test_tenant_id FROM tenants LIMIT 1;
  
  IF test_tenant_id IS NOT NULL THEN
    -- テスト挿入（エラーが出た場合はロールバック）
    BEGIN
      INSERT INTO holiday_settings (tenant_id, holiday_type, day_of_week, description, is_active)
      VALUES (test_tenant_id, 'weekly', 0, 'テスト休日', true);
      
      -- 成功したら削除
      DELETE FROM holiday_settings WHERE description = 'テスト休日';
      
      RAISE NOTICE 'holiday_settings table is working correctly';
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Error inserting into holiday_settings: %', SQLERRM;
    END;
  END IF;
END $$;

-- 13. 全テーブルの状態確認
SELECT 
  schemaname,
  tablename,
  hasindexes,
  hasrules,
  hastriggers
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('holiday_settings', 'plan_usage', 'customers', 'customer_channels')
ORDER BY tablename;