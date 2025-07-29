-- holiday_settingsテーブルの存在確認とトラブルシューティング

-- 1. テーブルの存在確認
SELECT 
    EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'holiday_settings'
    ) as table_exists;

-- 2. もしテーブルが存在する場合、その構造を確認
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'holiday_settings'
ORDER BY ordinal_position;

-- 3. RLSポリシーの確認
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'holiday_settings';

-- 4. get_user_tenant_id関数の確認
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines
WHERE routine_name = 'get_user_tenant_id'
AND routine_schema = 'public';

-- 5. 現在のユーザーとテナントIDの確認
SELECT 
    auth.uid() as current_user_id,
    get_user_tenant_id() as current_tenant_id;

-- 6. usersテーブルの確認
SELECT 
    id,
    auth_id,
    tenant_id,
    email
FROM users
WHERE auth_id = auth.uid() OR id = auth.uid()
LIMIT 5;

-- 7. tenantsテーブルの確認
SELECT 
    id,
    name,
    plan_type
FROM tenants
LIMIT 5;

-- 8. エラーログの確認（もし存在すれば）
-- Supabaseのダッシュボードでエラーログを確認してください