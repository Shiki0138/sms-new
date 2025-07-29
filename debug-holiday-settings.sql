-- =====================================
-- holiday_settings問題のデバッグSQL
-- =====================================

-- 1. RLSポリシーの確認
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'holiday_settings';

-- 2. 現在のユーザーのテナントIDを確認
SELECT auth.uid() as current_user_id;

-- 3. usersテーブルの確認
SELECT 
  id,
  auth_id,
  tenant_id,
  email,
  role
FROM users
WHERE auth_id = auth.uid() OR id = auth.uid();

-- 4. get_user_tenant_id()関数のテスト
SELECT get_user_tenant_id() as function_result;

-- 5. テナントテーブルの確認
SELECT 
  id,
  name,
  plan_type
FROM tenants
WHERE id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

-- 6. RLSを一時的に無効化してテスト（管理者のみ実行）
-- ALTER TABLE holiday_settings DISABLE ROW LEVEL SECURITY;

-- 7. 直接挿入テスト（RLSが無効の場合のみ動作）
INSERT INTO holiday_settings (
  tenant_id,
  holiday_type,
  day_of_week,
  description,
  is_active
) VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'weekly',
  1,
  'テスト月曜休み',
  true
) RETURNING *;

-- 8. 挿入後の確認
SELECT * FROM holiday_settings WHERE tenant_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

-- 9. RLSポリシーの修正案
-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Users can manage same tenant holidays" ON holiday_settings;
DROP POLICY IF EXISTS "Users can view same tenant holidays" ON holiday_settings;
DROP POLICY IF EXISTS "Users can insert same tenant holidays" ON holiday_settings;
DROP POLICY IF EXISTS "Users can update same tenant holidays" ON holiday_settings;
DROP POLICY IF EXISTS "Users can delete same tenant holidays" ON holiday_settings;

-- シンプルなポリシーを作成（デバッグ用）
CREATE POLICY "Enable all for authenticated users" ON holiday_settings
  FOR ALL 
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 10. 再度RLSを有効化
-- ALTER TABLE holiday_settings ENABLE ROW LEVEL SECURITY;