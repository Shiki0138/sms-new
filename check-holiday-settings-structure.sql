-- holiday_settingsテーブルの詳細確認

-- 1. テーブル構造を確認
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'holiday_settings'
ORDER BY ordinal_position;

-- 2. 既存のデータを確認
SELECT * FROM holiday_settings;

-- 3. RLSの状態を確認
SELECT 
  relname,
  relrowsecurity
FROM pg_class
WHERE relname = 'holiday_settings';

-- 4. 現在のポリシーを確認
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'holiday_settings';

-- 5. テスト用のデータを挿入してみる
INSERT INTO holiday_settings (
  tenant_id,
  holiday_type,
  day_of_week,
  description,
  is_active
) VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'weekly',
  0,  -- 日曜日
  '毎週日曜日',
  true
) RETURNING *;