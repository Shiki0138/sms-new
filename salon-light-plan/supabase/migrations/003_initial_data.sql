-- =====================================
-- 初期データ投入スクリプト
-- =====================================

-- デモ用テナントを作成
INSERT INTO tenants (id, name, plan_type, email, phone_number, address, settings)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'デモ美容サロン',
  'light',
  'demo@salon.com',
  '03-1234-5678',
  '東京都渋谷区1-2-3',
  '{
    "business_name": "デモ美容サロン",
    "business_type": "beauty_salon",
    "timezone": "Asia/Tokyo"
  }'::jsonb
);

-- デモユーザーを作成（実際の認証はSupabase Authで行う）
-- この部分は、実際にはSupabase Authでユーザーを作成後、そのUIDを使用する必要があります
-- 以下はサンプルとして記載

-- デフォルトのサービスメニューを作成
INSERT INTO services (tenant_id, name, category, duration, price, description) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'カット', 'ヘアカット', 60, 4000, 'シャンプー・ブロー込み'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'カラー', 'ヘアカラー', 120, 8000, 'リタッチまたはフルカラー'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'パーマ', 'パーマ', 150, 10000, 'デジタルパーマ・コールドパーマ'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'トリートメント', 'ヘアケア', 30, 3000, '髪質改善トリートメント'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'ヘッドスパ', 'リラクゼーション', 45, 4500, '頭皮マッサージ付き');

-- デフォルトの営業時間を設定（火曜日定休）
INSERT INTO business_hours (tenant_id, day_of_week, is_open, open_time, close_time, break_start_time, break_end_time) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 0, true, '10:00', '19:00', NULL, NULL), -- 日曜日
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 1, true, '09:00', '20:00', NULL, NULL), -- 月曜日
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 2, false, NULL, NULL, NULL, NULL), -- 火曜日（定休日）
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 3, true, '09:00', '20:00', NULL, NULL), -- 水曜日
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 4, true, '09:00', '20:00', NULL, NULL), -- 木曜日
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 5, true, '09:00', '21:00', NULL, NULL), -- 金曜日
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 6, true, '09:00', '19:00', NULL, NULL); -- 土曜日

-- デフォルトのリマインダー設定
INSERT INTO reminder_configs (tenant_id, reminder_type, days_before, message_template, is_active, send_channels, send_time) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'pre_visit', 7, 
   '{{customer_name}}様、来週{{date}}{{time}}からのご予約のお知らせです💄
施術内容：{{menu}}
何かご不明な点がございましたらお気軽にご連絡ください🌟', 
   true, ARRAY['line', 'instagram', 'email'], '10:00'),
  
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'pre_visit', 3, 
   '{{customer_name}}様、{{date}}{{time}}からのご予約が近づいてまいりました✨
楽しみにお待ちしております😊
当日は5分前にお越しいただけますと幸いです🕐', 
   true, ARRAY['line', 'instagram', 'email'], '18:00'),
  
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'post_visit', 1, 
   '{{customer_name}}様、昨日はご来店いただきありがとうございました💕
仕上がりはいかがでしょうか？
お気に入りいただけましたら、ぜひSNSでシェアしてくださいね📸✨', 
   true, ARRAY['line', 'instagram', 'email'], '15:00');

-- サンプルスタッフを作成
INSERT INTO staff (tenant_id, name, email, phone_number, role, color, is_active) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '山田 美咲', 'yamada@salon.com', '090-1111-2222', 'stylist', '#ef4444', true),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '佐藤 太郎', 'sato@salon.com', '090-3333-4444', 'stylist', '#3b82f6', true),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '鈴木 花子', 'suzuki@salon.com', '090-5555-6666', 'assistant', '#10b981', true);

-- サンプル顧客を作成
INSERT INTO customers (tenant_id, name, name_kana, phone_number, email, birth_date, gender, notes, visit_count, last_visit_date, preferred_contact_method) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '田中 花子', 'タナカ ハナコ', '090-1234-5678', 'tanaka@example.com', '1990-05-15', 'female', '髪が細いため、優しい施術を希望', 5, '2024-01-15', 'line'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '佐藤 太郎', 'サトウ タロウ', '080-9876-5432', 'sato@example.com', '1985-08-20', 'male', 'カラーアレルギーなし', 3, '2024-01-20', 'email'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '鈴木 美咲', 'スズキ ミサキ', '070-5555-1234', 'suzuki@example.com', '1995-03-10', 'female', 'カラーアレルギーあり', 8, '2024-01-22', 'instagram');

-- 初期のプラン使用状況を作成（今月分）
INSERT INTO plan_usage (tenant_id, month, customers_count, reservations_count, messages_sent, ai_replies_count)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  DATE_TRUNC('month', CURRENT_DATE),
  3,  -- 顧客数
  0,  -- 予約数
  0,  -- メッセージ送信数
  0   -- AI返信数
);

-- =====================================
-- ユーザー作成後の手順
-- =====================================
-- 1. Supabase Authでユーザーを作成
-- 2. 作成したユーザーのUIDを取得
-- 3. 以下のSQLを実行してusersテーブルにレコードを作成
--
-- INSERT INTO users (id, tenant_id, email, full_name, role)
-- VALUES (
--   'auth-user-uid-here',  -- Supabase AuthのユーザーUID
--   'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
--   'user@example.com',
--   'ユーザー名',
--   'owner'  -- または 'admin', 'staff'
-- );