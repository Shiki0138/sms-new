# 最終セットアップ手順

## ⚠️ 重要な注意事項
このSQLを実行すると、既存のデータが全て削除されます。本番環境では実行しないでください。

## 1. Supabaseで完全なスキーマを実行

Supabase SQL Editorで以下を実行：

```sql
-- COMPLETE_SCHEMA.sql の内容を全てコピー&ペースト
```

このSQLは以下を実行します：
- 既存テーブルの削除（クリーンインストール）
- 全テーブルの作成（正しい順序で）
- インデックスの作成
- RLSポリシーの設定
- デモテナントの作成

## 2. 動作確認

### テーブルが作成されたか確認
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

期待される結果：
- business_hours
- customers
- holiday_settings
- messages
- plan_usage
- reservations
- services
- staff
- tenants
- users

### RLSポリシーの確認
```sql
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

## 3. サインアップのテスト

1. ブラウザで `/auth/signup` にアクセス
2. テストアカウントを作成：
   - サロン名: マイサロン
   - メール: my@salon.com
   - パスワード: MyPassword123

## 4. ログインのテスト

作成したアカウントでログイン：
- `/auth/login` にアクセス
- メールとパスワードでログイン

## 5. トラブルシューティング

### エラー: "relation does not exist"
→ COMPLETE_SCHEMA.sqlが正しく実行されていない

### エラー: "violates row-level security policy"
→ RLSポリシーに問題がある場合、一時的に無効化：
```sql
-- 開発時のみ
ALTER TABLE tenants DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE plan_usage DISABLE ROW LEVEL SECURITY;
```

### エラー: "duplicate key value"
→ 既にデータが存在する。COMPLETE_SCHEMA.sqlを再実行

## 6. 初期ユーザーの手動作成（オプション）

サインアップがうまくいかない場合：

```sql
-- 1. Supabase AuthでユーザーをInvite
-- 2. 招待されたユーザーのUIDを確認
-- 3. 以下を実行

-- ユーザーレコードを作成
INSERT INTO users (auth_id, tenant_id, email, full_name, role)
VALUES (
  '招待したユーザーのUID'::uuid,
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,
  'demo@salon.com',
  'デモオーナー',
  'owner'
);

-- 初期のプラン使用状況
INSERT INTO plan_usage (tenant_id, month, customers_count, reservations_count)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,
  DATE_TRUNC('month', CURRENT_DATE),
  0, 0
);

-- 営業時間の初期設定
INSERT INTO business_hours (tenant_id, day_of_week, is_open, open_time, close_time)
VALUES 
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid, 0, true, '10:00', '19:00'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid, 1, true, '09:00', '20:00'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid, 2, false, NULL, NULL),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid, 3, true, '09:00', '20:00'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid, 4, true, '09:00', '20:00'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid, 5, true, '09:00', '21:00'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid, 6, true, '09:00', '19:00');
```

## 7. 成功の確認

ログイン後、以下が表示されれば成功：
- ダッシュボード
- 顧客管理
- 予約管理
- その他の機能

これで本番環境で使用可能な状態になります！