-- SMS Salon Management System - Sample Data
-- This file populates the database with realistic test data

-- Insert sample services
INSERT INTO services (id, name, description, service_type, duration_minutes, price, category, is_active) VALUES 
(uuid_generate_v4(), 'カット', '基本的なヘアカット', 'cut', 60, 4000, 'ヘアスタイル', true),
(uuid_generate_v4(), 'シャンプー・ブロー', 'シャンプーとブロードライ', 'treatment', 30, 2000, 'ベーシック', true),
(uuid_generate_v4(), 'カラーリング', '全体カラー', 'color', 120, 8000, 'カラー', true),
(uuid_generate_v4(), 'パーマ', 'デジタルパーマ', 'perm', 180, 12000, 'パーマ', true),
(uuid_generate_v4(), 'トリートメント', 'ディープケアトリートメント', 'treatment', 45, 5000, 'ケア', true),
(uuid_generate_v4(), 'ヘッドスパ', 'リラクゼーションヘッドスパ', 'spa', 60, 6000, 'スパ', true),
(uuid_generate_v4(), 'フェイシャルエステ', '基本フェイシャル', 'facial', 90, 10000, 'エステ', true),
(uuid_generate_v4(), 'ネイルケア', 'ベーシックネイルケア', 'nail', 60, 4500, 'ネイル', true);

-- Insert service packages
INSERT INTO service_packages (id, name, description, total_duration_minutes, original_price, package_price, is_active) VALUES 
(uuid_generate_v4(), 'フルコースA', 'カット + カラー + トリートメント', 225, 17000, 15000, true),
(uuid_generate_v4(), 'リラックスコース', 'カット + ヘッドスパ + トリートメント', 165, 15000, 13000, true),
(uuid_generate_v4(), 'ビューティーコース', 'カット + フェイシャル + ネイル', 210, 18500, 16000, true);

-- Insert sample staff users
INSERT INTO users (id, email, password_hash, name, role, phone, specializations, hourly_rate, commission_rate, is_active) VALUES 
(uuid_generate_v4(), 'tanaka@salon.com', crypt('staff123', gen_salt('bf')), '田中 美穂', 'staff', '090-1234-5678', ARRAY['cut', 'color'], 2500, 15, true),
(uuid_generate_v4(), 'sato@salon.com', crypt('staff123', gen_salt('bf')), '佐藤 健太', 'staff', '090-2345-6789', ARRAY['perm', 'treatment'], 2800, 18, true),
(uuid_generate_v4(), 'yamada@salon.com', crypt('staff123', gen_salt('bf')), '山田 さやか', 'staff', '090-3456-7890', ARRAY['facial', 'spa'], 3000, 20, true),
(uuid_generate_v4(), 'receptionist@salon.com', crypt('reception123', gen_salt('bf')), '受付 花子', 'receptionist', '090-4567-8901', ARRAY[], 1800, 0, true);

-- Insert sample customers
INSERT INTO customers (id, first_name, last_name, first_name_kana, last_name_kana, email, phone, birth_date, gender, postal_code, prefecture, city, address, preferences, tags, visit_count, total_spent, first_visit_date, last_visit_date, is_active) VALUES 
(uuid_generate_v4(), 'さくら', '田中', 'サクラ', 'タナカ', 'tanaka.sakura@example.com', '090-1111-2222', '1990-05-15', '女性', '150-0001', '東京都', '渋谷区', '1-2-3 マンション101', '{"preferred_time": "afternoon", "communication": "line"}', ARRAY['VIP', 'リピーター'], 15, 180000, '2023-01-15', '2024-01-10', true),
(uuid_generate_v4(), '美由紀', '佐藤', 'ミユキ', 'サトウ', 'sato.miyuki@example.com', '090-2222-3333', '1988-08-22', '女性', '160-0002', '東京都', '新宿区', '2-3-4 ビル201', '{"preferred_time": "morning", "communication": "email"}', ARRAY['新規'], 3, 45000, '2023-11-20', '2024-01-05', true),
(uuid_generate_v4(), '恵子', '高橋', 'ケイコ', 'タカハシ', 'takahashi.keiko@example.com', '090-3333-4444', '1985-12-03', '女性', '140-0003', '東京都', '品川区', '3-4-5 ハイツ302', '{"preferred_time": "evening", "communication": "instagram"}', ARRAY['常連'], 8, 96000, '2023-06-10', '2023-12-28', true),
(uuid_generate_v4(), '裕子', '鈴木', 'ユウコ', 'スズキ', 'suzuki.yuko@example.com', '090-4444-5555', '1992-03-18', '女性', '170-0004', '東京都', '豊島区', '4-5-6 アパート103', '{"preferred_time": "afternoon", "communication": "phone"}', ARRAY['学生割引'], 5, 30000, '2023-09-15', '2024-01-15', true),
(uuid_generate_v4(), '真由美', '鈴木', 'マユミ', 'スズキ', 'suzuki.mayumi@example.com', '090-5555-6666', '1983-07-25', '女性', '110-0005', '東京都', '台東区', '5-6-7 マンション201', '{"preferred_time": "morning", "communication": "line"}', ARRAY['プレミアム'], 20, 300000, '2022-05-10', '2024-01-12', true);

-- Insert sample appointments (recent and upcoming)
INSERT INTO appointments (id, customer_id, staff_id, service_id, appointment_date, duration_minutes, status, total_amount, payment_status, notes) 
SELECT 
    uuid_generate_v4(),
    c.id,
    u.id,
    s.id,
    '2024-01-15 10:00:00+09'::timestamp with time zone,
    s.duration_minutes,
    'completed',
    s.price,
    'paid',
    '初回カウンセリング実施'
FROM customers c, users u, services s 
WHERE c.first_name = 'さくら' AND u.name = '田中 美穂' AND s.name = 'カット'
LIMIT 1;

INSERT INTO appointments (id, customer_id, staff_id, service_id, appointment_date, duration_minutes, status, total_amount, payment_status, notes) 
SELECT 
    uuid_generate_v4(),
    c.id,
    u.id,
    s.id,
    '2024-02-01 14:00:00+09'::timestamp with time zone,
    s.duration_minutes,
    'scheduled',
    s.price,
    'pending',
    '次回予約確定'
FROM customers c, users u, services s 
WHERE c.first_name = 'さくら' AND u.name = '田中 美穂' AND s.name = 'カラーリング'
LIMIT 1;

-- Insert sample medical records
INSERT INTO medical_records (id, customer_id, staff_id, treatment_type, observations, recommendations, products_used)
SELECT 
    uuid_generate_v4(),
    c.id,
    u.id,
    'ヘアカット',
    'くせ毛が気になる。毛量は普通。前髪は眉上希望。',
    '月1回のカットをおすすめします。トリートメントで髪質改善も検討。',
    ARRAY['シャンプー（ダメージケア用）', 'トリートメント（保湿タイプ）']
FROM customers c, users u 
WHERE c.first_name = 'さくら' AND u.name = '田中 美穂'
LIMIT 1;

INSERT INTO medical_records (id, customer_id, staff_id, treatment_type, observations, recommendations, products_used)
SELECT 
    uuid_generate_v4(),
    c.id,
    u.id,
    'カラーリング',
    'アッシュブラウン希望。アレルギーなし。髪の傷みは軽度。',
    'カラー後のヘアケアを重視。紫外線対策も忘れずに。',
    ARRAY['カラー剤（アッシュブラウン）', 'カラーケアシャンプー', 'UVプロテクトスプレー']
FROM customers c, users u 
WHERE c.first_name = '美由紀' AND u.name = '佐藤 健太'
LIMIT 1;

-- Insert sample sales records
INSERT INTO sales (id, customer_id, staff_id, amount, tax_amount, payment_method, payment_status, payment_date)
SELECT 
    uuid_generate_v4(),
    c.id,
    u.id,
    4000,
    400,
    'cash',
    'paid',
    '2024-01-15 11:00:00+09'::timestamp with time zone
FROM customers c, users u 
WHERE c.first_name = 'さくら' AND u.name = '田中 美穂'
LIMIT 1;

-- Insert staff schedules for this week
INSERT INTO staff_schedules (staff_id, date, start_time, end_time, break_start_time, break_end_time, is_available)
SELECT 
    u.id,
    CURRENT_DATE + i,
    '09:00'::time,
    '18:00'::time,
    '12:00'::time,
    '13:00'::time,
    true
FROM users u, generate_series(0, 6) as i
WHERE u.role = 'staff';

-- Insert sample conversations
INSERT INTO conversations (id, customer_id, channel, last_message_at, is_active)
SELECT 
    uuid_generate_v4(),
    c.id,
    'line',
    CURRENT_TIMESTAMP - INTERVAL '2 hours',
    true
FROM customers c 
WHERE c.first_name = 'さくら'
LIMIT 1;

INSERT INTO conversations (id, customer_id, channel, last_message_at, is_active)
SELECT 
    uuid_generate_v4(),
    c.id,
    'email',
    CURRENT_TIMESTAMP - INTERVAL '1 day',
    true
FROM customers c 
WHERE c.first_name = '美由紀'
LIMIT 1;

-- Insert sample messages
INSERT INTO messages (conversation_id, sender_type, content, sent_at)
SELECT 
    conv.id,
    'staff',
    'こんにちは！次回のご予約はいかがですか？',
    CURRENT_TIMESTAMP - INTERVAL '3 hours'
FROM conversations conv
JOIN customers c ON c.id = conv.customer_id
WHERE c.first_name = 'さくら'
LIMIT 1;

INSERT INTO messages (conversation_id, sender_type, content, sent_at)
SELECT 
    conv.id,
    'customer',
    '来週の土曜日は空いていますか？',
    CURRENT_TIMESTAMP - INTERVAL '2 hours'
FROM conversations conv
JOIN customers c ON c.id = conv.customer_id
WHERE c.first_name = 'さくら'
LIMIT 1;

-- Insert sample notifications
INSERT INTO notifications (recipient_type, title, content, type, channel, scheduled_for)
VALUES 
('customer', '予約リマインダー', '明日14:00からの予約をお忘れなく。', 'reminder', 'sms', CURRENT_TIMESTAMP + INTERVAL '1 day'),
('staff', '新規予約', '新しい予約が入りました。', 'appointment', 'system', CURRENT_TIMESTAMP);

-- Insert default settings if not exists
INSERT INTO settings (key, value, description, category) VALUES 
('notification_enabled', 'true', '通知機能の有効/無効', 'notifications'),
('auto_reminder_hours', '24', '自動リマインダー送信時間（時間前）', 'notifications'),
('max_appointments_per_day', '20', '1日の最大予約数', 'appointments'),
('booking_advance_days', '30', '予約可能な最大日数', 'appointments')
ON CONFLICT (key) DO NOTHING;