# サインアップエラーの修正方法

## エラー内容
```
new row violates row-level security policy for table "tenants"
```

## 原因
新規登録時にtenantsテーブルへの挿入がRLS（Row Level Security）ポリシーによってブロックされている。

## 解決方法

### 1. RLSポリシーを修正（Supabase SQL Editorで実行）

```sql
-- supabase/migrations/004_fix_signup_rls.sql の内容を実行

-- tenantsテーブルのポリシーを修正
CREATE POLICY "Authenticated users can create tenant on signup" ON tenants
  FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- usersテーブルのポリシーを修正
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
```

### 2. Edge Functionをデプロイ

```bash
# Supabase CLIでサインアップ用のEdge Functionをデプロイ
supabase functions deploy signup
```

### 3. 環境変数を確認

Supabaseダッシュボードで以下が設定されているか確認：
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`（Edge Functions用）

## テスト方法

1. `/auth/signup` にアクセス
2. 以下の情報で新規登録：
   - サロン名: テストサロン
   - メールアドレス: test@example.com
   - パスワード: password123

3. 正常に登録できれば、自動的にダッシュボードへリダイレクトされる

## 代替方法（手動でユーザー作成）

Supabaseダッシュボードから直接ユーザーを作成する場合：

1. **Authentication → Users → Invite user**
2. **SQL Editorで以下を実行**：

```sql
-- 1. テナントを作成
INSERT INTO tenants (name, plan_type, email, settings)
VALUES (
  'テストサロン',
  'light',
  'test@example.com',
  '{"business_name": "テストサロン", "business_type": "beauty_salon", "timezone": "Asia/Tokyo"}'::jsonb
);

-- 2. 作成したテナントのIDを確認
SELECT id FROM tenants WHERE email = 'test@example.com';

-- 3. ユーザーレコードを作成（認証ユーザーのUIDを使用）
INSERT INTO users (id, tenant_id, email, full_name, role)
VALUES (
  '認証ユーザーのUID',
  '上で確認したテナントID',
  'test@example.com',
  'テストオーナー',
  'owner'
);

-- 4. 初期のプラン使用状況を作成
INSERT INTO plan_usage (tenant_id, month, customers_count, reservations_count, messages_sent, ai_replies_count)
VALUES (
  '上で確認したテナントID',
  DATE_TRUNC('month', CURRENT_DATE),
  0, 0, 0, 0
);
```

## 注意事項

- Edge Functionを使用する場合は、CORSの設定が必要
- 本番環境では必ずHTTPSを使用すること
- サービスロールキーは絶対に公開しないこと