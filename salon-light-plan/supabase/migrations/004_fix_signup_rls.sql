-- =====================================
-- サインアップ時のRLSポリシー修正
-- =====================================

-- tenantsテーブルのポリシーを修正
-- 新規登録時は認証済みユーザーがテナントを作成できるようにする
CREATE POLICY "Authenticated users can create tenant on signup" ON tenants
  FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- usersテーブルのポリシーを修正
-- 認証済みユーザーが自分のレコードを作成できるようにする
CREATE POLICY "Users can insert own record" ON users
  FOR INSERT 
  WITH CHECK (id = auth.uid());

-- plan_usageテーブルの初期レコード作成を許可
CREATE POLICY "System can create initial plan usage" ON plan_usage
  FOR INSERT 
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );