# 休日設定の手動セットアップ

## エラー内容
「休日設定を保存できませんでした」というエラーが表示される場合、`holiday_settings`テーブルが存在しない可能性があります。

## 解決方法

### 1. Supabase SQL Editorで実行

以下のSQLを実行してください：

```sql
-- holiday_settingsテーブルが存在するか確認
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'holiday_settings'
);
```

もしFALSEが返ってきた場合は、`ADD_HOLIDAY_SETTINGS.sql`の内容を実行してください。

### 2. 開発環境での一時的な対処法

開発環境でRLSエラーが出る場合：

```sql
-- RLSを一時的に無効化（開発環境のみ）
ALTER TABLE holiday_settings DISABLE ROW LEVEL SECURITY;
```

### 3. 手動で休日設定を追加

```sql
-- 例: 毎週火曜日を定休日に設定
INSERT INTO holiday_settings (tenant_id, holiday_type, day_of_week, description, is_active)
VALUES (
  'あなたのテナントID'::uuid,
  'weekly',
  2, -- 火曜日
  '定休日',
  true
);
```

### 4. 営業時間の初期設定

```sql
-- 営業時間が未設定の場合は初期データを挿入
INSERT INTO business_hours (tenant_id, day_of_week, is_open, open_time, close_time)
VALUES 
  ('あなたのテナントID'::uuid, 0, false, NULL, NULL), -- 日曜日休み
  ('あなたのテナントID'::uuid, 1, true, '09:00', '20:00'), -- 月曜日
  ('あなたのテナントID'::uuid, 2, false, NULL, NULL), -- 火曜日定休
  ('あなたのテナントID'::uuid, 3, true, '09:00', '20:00'), -- 水曜日
  ('あなたのテナントID'::uuid, 4, true, '09:00', '20:00'), -- 木曜日
  ('あなたのテナントID'::uuid, 5, true, '09:00', '20:00'), -- 金曜日
  ('あなたのテナントID'::uuid, 6, true, '09:00', '20:00'); -- 土曜日
```

## トラブルシューティング

### エラー: "relation 'holiday_settings' does not exist"
→ `ADD_HOLIDAY_SETTINGS.sql`を実行してください

### エラー: "new row violates row-level security policy"
→ RLSを一時的に無効化するか、適切なポリシーを設定してください

### エラー: "duplicate key value violates unique constraint"
→ 営業時間の設定が既に存在します。UPDATE文を使用してください