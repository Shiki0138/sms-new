# 即座の解決方法

## エラー
```
テナント作成エラー: new row violates row-level security policy for table "tenants"
```

## 今すぐ動作させる方法

### オプション1: RLSを無効化（最速・開発環境のみ）

Supabase SQL Editorで実行：

```sql
-- DISABLE_RLS_DEV.sql の内容を実行
```

これで**即座に**サインアップが可能になります。

### オプション2: 手動でデモアカウントを作成

1. **Supabase Authでユーザーを作成**
   ```
   Authentication → Users → Invite user
   メール: demo@example.com
   ```

2. **招待メールからパスワードを設定**

3. **SQL Editorで実行**
   ```sql
   -- ユーザーIDを確認
   SELECT id, email FROM auth.users WHERE email = 'demo@example.com';
   
   -- ユーザーレコードを作成（上記で取得したIDを使用）
   INSERT INTO users (auth_id, tenant_id, email, full_name, role)
   VALUES (
     '上記で確認したID'::uuid,
     'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,
     'demo@example.com',
     'デモオーナー',
     'owner'
   );
   ```

4. **ログイン**
   - メール: demo@example.com
   - パスワード: 設定したパスワード

## 本番環境への移行時

必ず以下を実行：

```sql
-- RLSを再度有効化
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE holiday_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_usage ENABLE ROW LEVEL SECURITY;

-- 適切なRLSポリシーを設定
-- FIX_TENANT_RLS.sql を実行
```

## 動作確認

1. `/auth/login` でログイン
2. ダッシュボードが表示されれば成功
3. 各機能（顧客管理、予約管理など）をテスト