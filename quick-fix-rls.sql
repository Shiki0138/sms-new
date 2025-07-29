-- =====================================
-- RLSポリシーの緊急修正
-- =====================================

-- 1. 既存のポリシーをすべて削除
DROP POLICY IF EXISTS "Users can manage same tenant holidays" ON holiday_settings;
DROP POLICY IF EXISTS "Users can view same tenant holidays" ON holiday_settings;
DROP POLICY IF EXISTS "Users can insert same tenant holidays" ON holiday_settings;
DROP POLICY IF EXISTS "Users can update same tenant holidays" ON holiday_settings;
DROP POLICY IF EXISTS "Users can delete same tenant holidays" ON holiday_settings;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON holiday_settings;
DROP POLICY IF EXISTS "Allow all operations" ON holiday_settings;

-- 2. シンプルで緩いポリシーを作成（認証ユーザーなら誰でもOK）
CREATE POLICY "Allow authenticated users to view holidays" ON holiday_settings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert holidays" ON holiday_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update holidays" ON holiday_settings
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete holidays" ON holiday_settings
  FOR DELETE
  TO authenticated
  USING (true);

-- 3. 確認
SELECT 
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename = 'holiday_settings'
ORDER BY policyname;