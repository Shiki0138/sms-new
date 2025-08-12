-- =====================================
-- サインアップ用のRLSポリシー修正
-- =====================================

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Anyone can create tenant on signup" ON tenants;
DROP POLICY IF EXISTS "Users can insert with matching auth id" ON users;
DROP POLICY IF EXISTS "System can manage plan usage" ON plan_usage;

-- サインアップ時に必要な権限を付与

-- 1. tenants: 認証済みユーザーなら誰でも作成可能
CREATE POLICY "Authenticated users can create tenant" ON tenants
  FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- 2. users: 自分のauth_idと一致する場合のみ作成可能
CREATE POLICY "Users can create own record" ON users
  FOR INSERT 
  WITH CHECK (auth_id = auth.uid());

-- 3. plan_usage: テナント作成者が初期レコードを作成可能
CREATE POLICY "Tenant owners can create initial usage" ON plan_usage
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.auth_id = auth.uid() 
      AND users.tenant_id = plan_usage.tenant_id
      AND users.role = 'owner'
    )
  );

-- 4. business_hours: テナント作成者が初期設定を作成可能
CREATE POLICY "Tenant owners can create initial hours" ON business_hours
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.auth_id = auth.uid() 
      AND users.tenant_id = business_hours.tenant_id
      AND users.role = 'owner'
    )
  );

-- デバッグ用: 一時的に全てのINSERTを許可（本番では削除）
-- CREATE POLICY "Temporary allow all inserts" ON tenants FOR INSERT WITH CHECK (true);
-- CREATE POLICY "Temporary allow all inserts" ON users FOR INSERT WITH CHECK (true);
-- CREATE POLICY "Temporary allow all inserts" ON plan_usage FOR INSERT WITH CHECK (true);