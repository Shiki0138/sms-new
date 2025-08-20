-- Initial Data Migration for SMS System
-- Version: 1.0.0
-- Created: 2025-08-20

-- Insert default message templates
INSERT INTO message_templates (id, user_id, name, category, subject, content, variables, is_active, metadata) VALUES
-- Appointment reminders
(uuid_generate_v4(), (SELECT id FROM users LIMIT 1), 'Appointment Reminder', 'appointment', 'Appointment Reminder', 
 'こんにちは{{customer_name}}様。{{appointment_date}}{{appointment_time}}のご予約のリマインドです。お待ちしております。', 
 '["customer_name", "appointment_date", "appointment_time"]'::jsonb, true, '{"system_template": true}'::jsonb),

(uuid_generate_v4(), (SELECT id FROM users LIMIT 1), 'Appointment Confirmation', 'appointment', 'Booking Confirmed', 
 '{{customer_name}}様、ご予約ありがとうございます。{{appointment_date}}{{appointment_time}}でお待ちしております。', 
 '["customer_name", "appointment_date", "appointment_time"]'::jsonb, true, '{"system_template": true}'::jsonb),

-- Marketing messages
(uuid_generate_v4(), (SELECT id FROM users LIMIT 1), 'Monthly Promotion', 'marketing', 'Special Offer', 
 '{{customer_name}}様、今月限定の特別オファーをご用意しました！{{offer_details}} ご予約は{{phone_number}}まで。', 
 '["customer_name", "offer_details", "phone_number"]'::jsonb, true, '{"system_template": true}'::jsonb),

(uuid_generate_v4(), (SELECT id FROM users LIMIT 1), 'Birthday Special', 'marketing', 'Happy Birthday!', 
 '{{customer_name}}様、お誕生日おめでとうございます！特別割引をご用意しました。詳細はお電話でお聞きください。', 
 '["customer_name"]'::jsonb, true, '{"system_template": true}'::jsonb),

-- Follow-up messages
(uuid_generate_v4(), (SELECT id FROM users LIMIT 1), 'Thank You Message', 'followup', 'Thank You', 
 '{{customer_name}}様、本日はありがとうございました。またのお越しをお待ちしております。', 
 '["customer_name"]'::jsonb, true, '{"system_template": true}'::jsonb),

(uuid_generate_v4(), (SELECT id FROM users LIMIT 1), 'Service Feedback', 'followup', 'How was your service?', 
 '{{customer_name}}様、先日のサービスはいかがでしたか？ご感想をお聞かせください。', 
 '["customer_name"]'::jsonb, true, '{"system_template": true}'::jsonb),

-- Customer care
(uuid_generate_v4(), (SELECT id FROM users LIMIT 1), 'Welcome New Customer', 'welcome', 'Welcome!', 
 '{{customer_name}}様、この度は当店をお選びいただきありがとうございます。心よりお待ちしております。', 
 '["customer_name"]'::jsonb, true, '{"system_template": true}'::jsonb),

(uuid_generate_v4(), (SELECT id FROM users LIMIT 1), 'Holiday Greeting', 'seasonal', 'Holiday Wishes', 
 '{{customer_name}}様、{{holiday_name}}おめでとうございます。今年もよろしくお願いいたします。', 
 '["customer_name", "holiday_name"]'::jsonb, true, '{"system_template": true}'::jsonb);

-- Insert default settings (for first user only)
INSERT INTO settings (
    user_id,
    business_name,
    business_phone,
    business_email,
    business_address,
    business_hours,
    sms_sender_name,
    timezone,
    language,
    notification_settings,
    api_settings
) 
SELECT 
    id,
    'Sample Beauty Salon',
    '+81-3-1234-5678',
    'info@sample-salon.com',
    '東京都渋谷区1-2-3',
    '{
        "monday": {"open": "09:00", "close": "19:00", "closed": false},
        "tuesday": {"open": "09:00", "close": "19:00", "closed": false},
        "wednesday": {"open": "09:00", "close": "19:00", "closed": false},
        "thursday": {"open": "09:00", "close": "19:00", "closed": false},
        "friday": {"open": "09:00", "close": "19:00", "closed": false},
        "saturday": {"open": "10:00", "close": "18:00", "closed": false},
        "sunday": {"open": "10:00", "close": "18:00", "closed": false}
    }'::jsonb,
    'SampleSalon',
    'Asia/Tokyo',
    'ja',
    '{
        "email_notifications": true,
        "sms_notifications": true,
        "appointment_reminders": true,
        "marketing_messages": true,
        "reminder_hours": 24
    }'::jsonb,
    '{
        "twilio_enabled": false,
        "max_message_length": 160,
        "rate_limit_per_hour": 100,
        "auto_opt_out": true
    }'::jsonb
FROM users 
WHERE NOT EXISTS (SELECT 1 FROM settings WHERE settings.user_id = users.id)
LIMIT 1;

-- Insert sample services (for first user only)
INSERT INTO services (
    user_id,
    name,
    description,
    category,
    duration_minutes,
    price,
    is_active,
    requires_staff,
    max_advance_booking_days,
    min_advance_booking_hours
)
SELECT 
    id,
    service_name,
    service_description,
    service_category,
    service_duration,
    service_price,
    true,
    true,
    30,
    24
FROM users,
    (VALUES 
        ('カット', '基本的なヘアカット', 'hair', 60, 5000.00),
        ('カラー', 'ヘアカラーリング', 'hair', 120, 8000.00),
        ('パーマ', 'パーマネントウェーブ', 'hair', 180, 12000.00),
        ('トリートメント', 'ヘアトリートメント', 'hair', 45, 3000.00),
        ('フェイシャル', '基本フェイシャルケア', 'facial', 90, 7000.00),
        ('マッサージ', 'リラクゼーションマッサージ', 'massage', 60, 6000.00),
        ('ネイル', 'ジェルネイル', 'nail', 120, 8000.00),
        ('アイラッシュ', 'まつげエクステンション', 'eyelash', 90, 5000.00)
    ) AS service_data(service_name, service_description, service_category, service_duration, service_price)
WHERE NOT EXISTS (SELECT 1 FROM services WHERE services.user_id = users.id)
LIMIT 1;

-- Insert sample staff (for first user only)
INSERT INTO staff (
    user_id,
    name,
    email,
    phone,
    role,
    specialties,
    working_hours,
    is_active,
    can_receive_bookings,
    booking_buffer_minutes
)
SELECT 
    id,
    staff_name,
    staff_email,
    staff_phone,
    staff_role,
    staff_specialties,
    '{
        "monday": {"start": "09:00", "end": "18:00", "available": true},
        "tuesday": {"start": "09:00", "end": "18:00", "available": true},
        "wednesday": {"start": "09:00", "end": "18:00", "available": true},
        "thursday": {"start": "09:00", "end": "18:00", "available": true},
        "friday": {"start": "09:00", "end": "18:00", "available": true},
        "saturday": {"start": "10:00", "end": "17:00", "available": true},
        "sunday": {"start": "10:00", "end": "17:00", "available": false}
    }'::jsonb,
    true,
    true,
    15
FROM users,
    (VALUES 
        ('田中 美容師', 'tanaka@sample-salon.com', '+81-90-1234-5678', 'Senior Stylist', '["hair", "color"]'::text[]),
        ('佐藤 エステティシャン', 'sato@sample-salon.com', '+81-90-2345-6789', 'Esthetician', '["facial", "massage"]'::text[]),
        ('山田 ネイリスト', 'yamada@sample-salon.com', '+81-90-3456-7890', 'Nail Technician', '["nail"]'::text[])
    ) AS staff_data(staff_name, staff_email, staff_phone, staff_role, staff_specialties)
WHERE NOT EXISTS (SELECT 1 FROM staff WHERE staff.user_id = users.id)
LIMIT 1;

-- Create sample customers (for first user only) with Japanese names and phone numbers
INSERT INTO customers (
    user_id,
    name,
    phone,
    email,
    birth_date,
    gender,
    address,
    notes,
    tags,
    first_visit_date,
    last_visit_date,
    total_visits,
    total_spent,
    is_active,
    consent_sms,
    metadata
)
SELECT 
    u.id,
    c.customer_name,
    c.customer_phone,
    c.customer_email,
    c.birth_date,
    c.gender,
    c.address,
    c.notes,
    c.tags,
    c.first_visit_date,
    c.last_visit_date,
    c.total_visits,
    c.total_spent,
    true,
    true,
    '{"source": "initial_data", "demo": true}'::jsonb
FROM users u,
    (VALUES 
        ('田中 花子', '+81-90-1111-2222', 'tanaka.hanako@example.com', '1990-03-15'::date, 'female', '東京都新宿区1-1-1', '定期的にカットとカラーをご利用', '["VIP", "定期客"]'::text[], '2023-01-15'::date, '2024-08-01'::date, 12, 96000.00),
        ('佐藤 美紀', '+81-90-2222-3333', 'sato.miki@example.com', '1985-07-22'::date, 'female', '東京都渋谷区2-2-2', 'アレルギー体質のため要注意', '["アレルギー注意", "定期客"]'::text[], '2023-03-20'::date, '2024-07-20'::date, 8, 64000.00),
        ('山田 由美子', '+81-90-3333-4444', 'yamada.yumiko@example.com', '1992-11-08'::date, 'female', '東京都港区3-3-3', 'ネイルとエステがお気に入り', '["ネイル好き", "エステ客"]'::text[], '2023-02-10'::date, '2024-08-10'::date, 15, 120000.00),
        ('鈴木 恵子', '+81-90-4444-5555', 'suzuki.keiko@example.com', '1988-09-12'::date, 'female', '東京都品川区4-4-4', '月1回のフェイシャルを愛用', '["フェイシャル客", "月1定期"]'::text[], '2023-04-05'::date, '2024-07-30'::date, 10, 70000.00),
        ('高橋 真理', '+81-90-5555-6666', 'takahashi.mari@example.com', '1995-12-03'::date, 'female', '東京都中央区5-5-5', '学生割引対象', '["学生", "若い客層"]'::text[], '2024-01-15'::date, '2024-08-05'::date, 5, 25000.00),
        ('伊藤 麻衣', '+81-90-6666-7777', 'ito.mai@example.com', '1987-04-28'::date, 'female', '東京都杉並区6-6-6', 'マッサージとトリートメントが好き', '["マッサージ客", "リラクゼーション"]'::text[], '2023-06-10'::date, '2024-08-12'::date, 9, 54000.00),
        ('渡辺 智子', '+81-90-7777-8888', 'watanabe.tomoko@example.com', '1983-08-17'::date, 'female', '東京都世田谷区7-7-7', '忙しいスケジュールのため前日予約多し', '["急ぎ客", "短時間希望"]'::text[], '2023-05-25'::date, '2024-07-25'::date, 7, 49000.00),
        ('中村 さくら', '+81-90-8888-9999', 'nakamura.sakura@example.com', '1991-01-20'::date, 'female', '東京都目黒区8-8-8', 'パーマとカラーの組み合わせが多い', '["パーマ客", "カラー好き"]'::text[], '2023-07-12'::date, '2024-08-08'::date, 11, 88000.00),
        ('小林 亜衣', '+81-90-9999-0000', 'kobayashi.ai@example.com', '1989-06-14'::date, 'female', '東京都台東区9-9-9', 'イベント前の集中ケア希望', '["イベント客", "スペシャルケア"]'::text[], '2023-08-30'::date, '2024-07-28'::date, 6, 42000.00),
        ('加藤 美香', '+81-90-0000-1111', 'kato.mika@example.com', '1993-10-25'::date, 'female', '東京都板橋区10-10-10', '友人紹介で来店', '["紹介客", "新しいお客様"]'::text[], '2024-02-20'::date, '2024-08-15'::date, 4, 28000.00)
    ) AS c(customer_name, customer_phone, customer_email, birth_date, gender, address, notes, tags, first_visit_date, last_visit_date, total_visits, total_spent)
WHERE u.id = (SELECT id FROM users LIMIT 1)
AND NOT EXISTS (SELECT 1 FROM customers WHERE customers.user_id = u.id);

-- Link staff with services (sample staff_services relationships)
INSERT INTO staff_services (staff_id, service_id)
SELECT s.id, sv.id
FROM staff s, services sv
WHERE s.user_id = sv.user_id
AND s.user_id = (SELECT id FROM users LIMIT 1)
AND (
    (s.name LIKE '%美容師%' AND sv.category IN ('hair')) OR
    (s.name LIKE '%エステ%' AND sv.category IN ('facial', 'massage')) OR
    (s.name LIKE '%ネイル%' AND sv.category IN ('nail'))
)
ON CONFLICT (staff_id, service_id) DO NOTHING;

-- Create some sample appointments (for the past and upcoming)
INSERT INTO appointments (
    user_id,
    customer_id,
    staff_id,
    service_id,
    appointment_date,
    start_time,
    end_time,
    status,
    price,
    notes,
    reminder_sent,
    confirmed_at
)
SELECT 
    u.id,
    c.id,
    s.id,
    sv.id,
    app.appointment_date,
    app.start_time,
    app.end_time,
    app.status,
    sv.price,
    app.notes,
    app.reminder_sent,
    app.confirmed_at
FROM users u,
     customers c,
     staff s,
     services sv,
    (VALUES 
        ('2024-08-15'::date, '10:00'::time, '11:00'::time, 'completed', 'カットとシャンプー完了', true, '2024-08-14 15:00:00'::timestamp),
        ('2024-08-18'::date, '14:00'::time, '16:00'::time, 'completed', 'カラーリング綺麗に仕上がりました', true, '2024-08-17 10:00:00'::timestamp),
        ('2024-08-22'::date, '11:00'::time, '12:30'::time, 'confirmed', '次回のご予約', true, '2024-08-20 09:00:00'::timestamp),
        ('2024-08-25'::date, '15:00'::time, '17:00'::time, 'confirmed', 'パーマの予定', false, NULL),
        ('2024-08-28'::date, '13:00'::time, '14:00'::time, 'pending', '確認待ち', false, NULL)
    ) AS app(appointment_date, start_time, end_time, status, notes, reminder_sent, confirmed_at)
WHERE u.id = (SELECT id FROM users LIMIT 1)
AND c.user_id = u.id
AND s.user_id = u.id
AND sv.user_id = u.id
AND NOT EXISTS (SELECT 1 FROM appointments WHERE appointments.user_id = u.id)
LIMIT 15; -- Create multiple appointments per combination

-- Create some sample sales records
INSERT INTO sales (
    user_id,
    customer_id,
    appointment_id,
    staff_id,
    sale_date,
    items,
    subtotal,
    tax_amount,
    discount_amount,
    total_amount,
    payment_method,
    payment_status,
    notes
)
SELECT 
    a.user_id,
    a.customer_id,
    a.id,
    a.staff_id,
    a.appointment_date,
    jsonb_build_array(
        jsonb_build_object(
            'name', sv.name,
            'price', sv.price,
            'quantity', 1,
            'category', sv.category
        )
    ),
    sv.price,
    sv.price * 0.10, -- 10% tax
    0,
    sv.price * 1.10, -- with tax
    'cash',
    'paid',
    'サービス完了'
FROM appointments a
JOIN services sv ON a.service_id = sv.id
WHERE a.status = 'completed'
AND NOT EXISTS (SELECT 1 FROM sales WHERE sales.appointment_id = a.id);

-- Create some sample messages
INSERT INTO messages (
    user_id,
    customer_id,
    template_id,
    type,
    recipient_phone,
    recipient_name,
    subject,
    content,
    status,
    sent_at,
    delivered_at,
    provider,
    cost,
    segments
)
SELECT 
    c.user_id,
    c.id,
    (SELECT id FROM message_templates WHERE name = 'Appointment Reminder' LIMIT 1),
    'sms',
    c.phone,
    c.name,
    'Appointment Reminder',
    REPLACE(REPLACE(mt.content, '{{customer_name}}', c.name), '{{appointment_date}}', '明日'),
    'delivered',
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '1 day' + INTERVAL '5 minutes',
    'twilio',
    10.0,
    1
FROM customers c,
     message_templates mt
WHERE c.user_id = (SELECT id FROM users LIMIT 1)
AND mt.name = 'Appointment Reminder'
AND c.consent_sms = true
LIMIT 5;

-- Insert analytics data for the current month
INSERT INTO analytics (
    user_id,
    date,
    metric_type,
    metric_value
)
SELECT 
    (SELECT id FROM users LIMIT 1),
    CURRENT_DATE - INTERVAL '1 day' * generate_series(0, 29),
    'daily_appointments',
    jsonb_build_object(
        'total', (random() * 10 + 5)::int,
        'completed', (random() * 8 + 3)::int,
        'cancelled', (random() * 2)::int,
        'no_show', (random() * 1)::int
    )
WHERE NOT EXISTS (
    SELECT 1 FROM analytics 
    WHERE user_id = (SELECT id FROM users LIMIT 1) 
    AND metric_type = 'daily_appointments'
);

-- Insert monthly revenue analytics
INSERT INTO analytics (
    user_id,
    date,
    metric_type,
    metric_value
)
SELECT 
    (SELECT id FROM users LIMIT 1),
    DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month' * generate_series(0, 5),
    'monthly_revenue',
    jsonb_build_object(
        'total_revenue', (random() * 500000 + 200000)::int,
        'service_revenue', (random() * 400000 + 150000)::int,
        'product_revenue', (random() * 100000 + 50000)::int,
        'new_customers', (random() * 20 + 10)::int,
        'returning_customers', (random() * 50 + 30)::int
    )
WHERE NOT EXISTS (
    SELECT 1 FROM analytics 
    WHERE user_id = (SELECT id FROM users LIMIT 1) 
    AND metric_type = 'monthly_revenue'
);

-- Refresh materialized view
REFRESH MATERIALIZED VIEW customer_analytics;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_sent_at_user_id ON messages(sent_at DESC, user_id) WHERE sent_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_appointments_date_user_id ON appointments(appointment_date DESC, user_id);
CREATE INDEX IF NOT EXISTS idx_customers_last_visit ON customers(last_visit_date DESC, user_id) WHERE last_visit_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sales_date_user_id ON sales(sale_date DESC, user_id);

-- Update table statistics
ANALYZE users;
ANALYZE customers;
ANALYZE appointments;
ANALYZE sales;
ANALYZE messages;
ANALYZE message_templates;
ANALYZE staff;
ANALYZE services;
ANALYZE settings;
ANALYZE subscriptions;