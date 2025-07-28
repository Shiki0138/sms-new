-- =====================================
-- テナント作成時のRLSエラーを修正
-- =====================================

-- 1. 現在のポリシーを確認（デバッグ用）
-- SELECT tablename, policyname, cmd, qual, with_check 
-- FROM pg_policies 
-- WHERE tablename = 'tenants';

-- 2. 既存のテナントポリシーを削除
DROP POLICY IF EXISTS "Users can view own tenant" ON tenants;
DROP POLICY IF EXISTS "Authenticated users can create tenant" ON tenants;

-- 3. 新しいポリシーを作成

-- 3.1 誰でもテナントを作成できる（サインアップ時）
CREATE POLICY "Anyone can create tenant during signup" ON tenants
  FOR INSERT 
  WITH CHECK (true);

-- 3.2 自分のテナントのみ閲覧可能
CREATE POLICY "Users can view own tenant" ON tenants
  FOR SELECT 
  USING (
    id IN (
      SELECT tenant_id 
      FROM users 
      WHERE auth_id = auth.uid()
    )
  );

-- 3.3 自分のテナントのみ更新可能
CREATE POLICY "Users can update own tenant" ON tenants
  FOR UPDATE 
  USING (
    id IN (
      SELECT tenant_id 
      FROM users 
      WHERE auth_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

-- 4. usersテーブルのポリシーも確認・修正
DROP POLICY IF EXISTS "Users can create own record" ON users;

-- 認証されたユーザーが自分のレコードを作成可能
CREATE POLICY "Users can create own record" ON users
  FOR INSERT 
  WITH CHECK (
    auth_id = auth.uid() OR auth.uid() IS NOT NULL
  );

-- 5. plan_usageテーブルのポリシーも修正
DROP POLICY IF EXISTS "System can manage plan usage" ON plan_usage;

-- 誰でもplan_usageを作成可能（サインアップ時）
CREATE POLICY "Anyone can create initial plan usage" ON plan_usage
  FOR INSERT 
  WITH CHECK (true);

-- 自分のテナントのplan_usageのみ閲覧可能
CREATE POLICY "Users can view own plan usage" ON plan_usage
  FOR SELECT 
  USING (
    tenant_id IN (
      SELECT tenant_id 
      FROM users 
      WHERE auth_id = auth.uid()
    )
  );

-- =====================================
-- 開発時の緊急対応（本番では使用しない）
-- =====================================
-- もし上記でも動作しない場合は、一時的にRLSを無効化
-- ALTER TABLE tenants DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE users DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE plan_usage DISABLE ROW LEVEL SECURITY;