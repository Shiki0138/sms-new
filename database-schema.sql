-- 美容サロン管理システム - ライトプラン データベーススキーマ

-- ULID生成関数（PostgreSQL用）
CREATE OR REPLACE FUNCTION generate_ulid() RETURNS TEXT AS $$
DECLARE
    timestamp_part BIGINT;
    random_part TEXT;
BEGIN
    -- 現在時刻をミリ秒で取得
    timestamp_part := EXTRACT(EPOCH FROM NOW()) * 1000;
    
    -- ランダム部分を生成（簡易版）
    random_part := LPAD(TO_HEX((RANDOM() * 4294967295)::BIGINT), 8, '0') ||
                   LPAD(TO_HEX((RANDOM() * 4294967295)::BIGINT), 8, '0') ||
                   LPAD(TO_HEX((RANDOM() * 65535)::BIGINT), 4, '0');
    
    RETURN LPAD(TO_HEX(timestamp_part), 12, '0') || UPPER(random_part);
END;
$$ LANGUAGE plpgsql;

-- 1. テナント（サロン）テーブル
CREATE TABLE tenants (
    id TEXT PRIMARY KEY DEFAULT generate_ulid(),
    name TEXT NOT NULL,
    plan TEXT DEFAULT 'light' CHECK (plan IN ('light', 'standard', 'premium')),
    phone_number TEXT,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. ユーザー・テナント関連テーブル
CREATE TABLE user_tenant_mapping (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'owner' CHECK (role IN ('owner', 'staff')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, tenant_id)
);

-- 3. 顧客テーブル
CREATE TABLE customers (
    id TEXT PRIMARY KEY DEFAULT generate_ulid(),
    tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone_number TEXT,
    email TEXT,
    line_id TEXT, -- LINE連携用
    instagram_id TEXT, -- Instagram連携用
    notes TEXT,
    visit_count INTEGER DEFAULT 0,
    last_visit_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. サービスメニューテーブル
CREATE TABLE service_menus (
    id TEXT PRIMARY KEY DEFAULT generate_ulid(),
    tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT,
    duration INTEGER NOT NULL, -- 分単位
    price DECIMAL(10,2) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. 予約テーブル
CREATE TABLE reservations (
    id TEXT PRIMARY KEY DEFAULT generate_ulid(),
    tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id TEXT REFERENCES customers(id) ON DELETE CASCADE,
    staff_id TEXT, -- ライトプランでは1名のみなので外部キー制約なし
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    menu_content TEXT NOT NULL,
    status TEXT DEFAULT 'TENTATIVE' CHECK (
        status IN ('TENTATIVE', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW')
    ),
    price DECIMAL(10,2),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. 営業設定テーブル
CREATE TABLE business_settings (
    id TEXT PRIMARY KEY DEFAULT generate_ulid(),
    tenant_id TEXT UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
    business_hours JSONB NOT NULL DEFAULT '{}', -- 曜日別営業時間
    weekly_closed_days INTEGER[] DEFAULT '{}', -- 定休日 [0-6] (日曜=0)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. プラン使用状況テーブル
CREATE TABLE plan_usage (
    id TEXT PRIMARY KEY DEFAULT generate_ulid(),
    tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
    month DATE NOT NULL, -- YYYY-MM-01形式
    customer_count INTEGER DEFAULT 0,
    reservation_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, month)
);

-- 8. スタッフテーブル
CREATE TABLE staff (
    id TEXT PRIMARY KEY DEFAULT generate_ulid(),
    tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    position TEXT, -- 役職・役割
    color TEXT NOT NULL, -- カレンダー表示用の色（HEXコード）
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- アクティブな同名スタッフの重複防止
    CONSTRAINT unique_active_staff_name 
        EXCLUDE (tenant_id WITH =, name WITH =) 
        WHERE (is_active = true),
    -- アクティブな同色スタッフの重複防止
    CONSTRAINT unique_active_staff_color 
        EXCLUDE (tenant_id WITH =, color WITH =) 
        WHERE (is_active = true)
);

-- 9. 施術履歴テーブル
CREATE TABLE treatment_history (
    id TEXT PRIMARY KEY DEFAULT generate_ulid(),
    tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id TEXT REFERENCES customers(id) ON DELETE CASCADE,
    staff_id TEXT REFERENCES staff(id) ON DELETE SET NULL,
    reservation_id TEXT REFERENCES reservations(id) ON DELETE SET NULL,
    treatment_date TIMESTAMP WITH TIME ZONE NOT NULL,
    service_name TEXT NOT NULL,
    notes TEXT, -- 施術時のメモ
    customer_requests TEXT, -- お客様の要望
    treatment_photos TEXT[], -- 施術写真のURL（最大3枚）
    price DECIMAL(10,2),
    duration_minutes INTEGER,
    satisfaction_rating INTEGER CHECK (satisfaction_rating BETWEEN 1 AND 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. 休日設定テーブル
CREATE TABLE holiday_settings (
    id TEXT PRIMARY KEY DEFAULT generate_ulid(),
    tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
    holiday_type TEXT NOT NULL CHECK (holiday_type IN ('weekly', 'monthly', 'specific_date')),
    -- weekly: 毎週の定休日 (day_of_week: 0=日曜, 1=月曜...)
    day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
    -- monthly: 第n曜日 (week_of_month: 1-5, day_of_week: 0-6)
    week_of_month INTEGER CHECK (week_of_month BETWEEN 1 AND 5),
    -- specific_date: 特定日付
    specific_date DATE,
    end_date DATE, -- 期間指定の終了日（年末年始等）
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. 営業時間設定テーブル
CREATE TABLE business_hours (
    id TEXT PRIMARY KEY DEFAULT generate_ulid(),
    tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=日曜
    is_open BOOLEAN DEFAULT true,
    open_time TIME,
    close_time TIME,
    break_start_time TIME, -- 休憩開始
    break_end_time TIME, -- 休憩終了
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, day_of_week)
);

-- インデックス作成
CREATE INDEX idx_reservations_tenant_date ON reservations(tenant_id, start_time);
CREATE INDEX idx_customers_tenant_name ON customers(tenant_id, name);
CREATE INDEX idx_customers_line_id ON customers(tenant_id, line_id);
CREATE INDEX idx_customers_instagram_id ON customers(tenant_id, instagram_id);
CREATE INDEX idx_reservations_status ON reservations(tenant_id, status);
CREATE INDEX idx_user_tenant_mapping_user ON user_tenant_mapping(user_id);
CREATE INDEX idx_service_menus_tenant_active ON service_menus(tenant_id, is_active);
CREATE INDEX idx_staff_tenant_active ON staff(tenant_id, is_active);
CREATE INDEX idx_treatment_history_customer ON treatment_history(customer_id, treatment_date DESC);
CREATE INDEX idx_treatment_history_staff ON treatment_history(staff_id, treatment_date DESC);
CREATE INDEX idx_holiday_settings_tenant ON holiday_settings(tenant_id, is_active);
CREATE INDEX idx_business_hours_tenant ON business_hours(tenant_id, day_of_week);

-- Row Level Security (RLS) 有効化
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE holiday_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_hours ENABLE ROW LEVEL SECURITY;

-- RLS ポリシー作成
-- テナントアクセスポリシー
CREATE POLICY "Users can only access their tenant" ON tenants
    FOR ALL USING (
        id IN (
            SELECT tenant_id FROM user_tenant_mapping 
            WHERE user_id = auth.uid()
        )
    );

-- 顧客アクセスポリシー
CREATE POLICY "Users can only access their tenant's customers" ON customers
    FOR ALL USING (
        tenant_id IN (
            SELECT tenant_id FROM user_tenant_mapping 
            WHERE user_id = auth.uid()
        )
    );

-- 予約アクセスポリシー
CREATE POLICY "Users can only access their tenant's reservations" ON reservations
    FOR ALL USING (
        tenant_id IN (
            SELECT tenant_id FROM user_tenant_mapping 
            WHERE user_id = auth.uid()
        )
    );

-- サービスメニューアクセスポリシー
CREATE POLICY "Users can only access their tenant's menus" ON service_menus
    FOR ALL USING (
        tenant_id IN (
            SELECT tenant_id FROM user_tenant_mapping 
            WHERE user_id = auth.uid()
        )
    );

-- 営業設定アクセスポリシー
CREATE POLICY "Users can only access their tenant's settings" ON business_settings
    FOR ALL USING (
        tenant_id IN (
            SELECT tenant_id FROM user_tenant_mapping 
            WHERE user_id = auth.uid()
        )
    );

-- プラン使用状況アクセスポリシー
CREATE POLICY "Users can only access their tenant's usage" ON plan_usage
    FOR ALL USING (
        tenant_id IN (
            SELECT tenant_id FROM user_tenant_mapping 
            WHERE user_id = auth.uid()
        )
    );

-- スタッフアクセスポリシー
CREATE POLICY "Users can only access their tenant's staff" ON staff
    FOR ALL USING (
        tenant_id IN (
            SELECT tenant_id FROM user_tenant_mapping 
            WHERE user_id = auth.uid()
        )
    );

-- 施術履歴アクセスポリシー
CREATE POLICY "Users can only access their tenant's treatment history" ON treatment_history
    FOR ALL USING (
        tenant_id IN (
            SELECT tenant_id FROM user_tenant_mapping 
            WHERE user_id = auth.uid()
        )
    );

-- 休日設定アクセスポリシー
CREATE POLICY "Users can only access their tenant's holiday settings" ON holiday_settings
    FOR ALL USING (
        tenant_id IN (
            SELECT tenant_id FROM user_tenant_mapping 
            WHERE user_id = auth.uid()
        )
    );

-- 営業時間アクセスポリシー
CREATE POLICY "Users can only access their tenant's business hours" ON business_hours
    FOR ALL USING (
        tenant_id IN (
            SELECT tenant_id FROM user_tenant_mapping 
            WHERE user_id = auth.uid()
        )
    );

-- 更新時刻自動更新のトリガー関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 更新時刻自動更新トリガー
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_service_menus_updated_at BEFORE UPDATE ON service_menus
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reservations_updated_at BEFORE UPDATE ON reservations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_business_settings_updated_at BEFORE UPDATE ON business_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_updated_at BEFORE UPDATE ON staff
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_treatment_history_updated_at BEFORE UPDATE ON treatment_history
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_business_hours_updated_at BEFORE UPDATE ON business_hours
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- テストデータ投入（開発用）
-- テナント作成
INSERT INTO tenants (id, name, plan, phone_number, address) VALUES 
('01HZTEST001', 'テストサロン', 'light', '03-1234-5678', '東京都渋谷区テスト1-2-3');

-- 営業設定作成
INSERT INTO business_settings (tenant_id, business_hours, weekly_closed_days) VALUES 
('01HZTEST001', 
 '{"0": null, "1": {"open": "09:00", "close": "18:00"}, "2": {"open": "09:00", "close": "18:00"}, "3": {"open": "09:00", "close": "18:00"}, "4": {"open": "09:00", "close": "18:00"}, "5": {"open": "09:00", "close": "18:00"}, "6": {"open": "09:00", "close": "17:00"}}',
 '{0}'); -- 日曜定休

-- サービスメニュー作成
INSERT INTO service_menus (tenant_id, name, category, duration, price, description) VALUES 
('01HZTEST001', 'カット', 'ヘアケア', 60, 4000.00, '基本的なヘアカット'),
('01HZTEST001', 'カラー', 'ヘアケア', 120, 8000.00, 'ヘアカラーリング'),
('01HZTEST001', 'パーマ', 'ヘアケア', 150, 10000.00, 'パーマネントウェーブ');

-- 顧客作成
INSERT INTO customers (tenant_id, name, phone_number, email, visit_count) VALUES 
('01HZTEST001', '田中花子', '090-1234-5678', 'tanaka@example.com', 3),
('01HZTEST001', '佐藤太郎', '090-8765-4321', 'sato@example.com', 1);

-- スタッフ作成
INSERT INTO staff (tenant_id, name, email, phone, position, color, is_active) VALUES 
('01HZTEST001', '山田美咲', 'yamada@testsalon.com', '090-1111-2222', 'スタイリスト', '#ef4444', true),
('01HZTEST001', '佐々木次郎', 'sasaki@testsalon.com', '090-3333-4444', 'アシスタント', '#3b82f6', true);

-- 予約作成
INSERT INTO reservations (tenant_id, customer_id, start_time, end_time, menu_content, status, price, staff_id) VALUES 
('01HZTEST001', 
 (SELECT id FROM customers WHERE name = '田中花子' LIMIT 1),
 NOW() + INTERVAL '1 day',
 NOW() + INTERVAL '1 day' + INTERVAL '1 hour',
 'カット',
 'CONFIRMED',
 4000.00,
 (SELECT id FROM staff WHERE name = '山田美咲' LIMIT 1));

-- 8. メッセージチャンネルテーブル（LINE、Instagram、メール）
CREATE TABLE message_channels (
    id TEXT PRIMARY KEY DEFAULT generate_ulid(),
    tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id TEXT REFERENCES customers(id) ON DELETE CASCADE,
    channel_type TEXT NOT NULL CHECK (channel_type IN ('line', 'instagram', 'email')),
    channel_id TEXT NOT NULL, -- LINEユーザーID、Instagramユーザー名、メールアドレス
    channel_name TEXT, -- 表示名
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, channel_type, channel_id)
);

-- 9. メッセージテーブル
CREATE TABLE messages (
    id TEXT PRIMARY KEY DEFAULT generate_ulid(),
    tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id TEXT REFERENCES customers(id) ON DELETE CASCADE,
    channel_id TEXT REFERENCES message_channels(id) ON DELETE CASCADE,
    message_type TEXT NOT NULL CHECK (message_type IN ('received', 'sent')),
    content TEXT NOT NULL,
    media_url TEXT, -- 画像・動画のURL
    media_type TEXT, -- image, video, audio, file
    is_read BOOLEAN DEFAULT false,
    is_ai_reply BOOLEAN DEFAULT false, -- AI返信で送信されたかどうか
    thread_id TEXT, -- 返信スレッド用
    external_message_id TEXT, -- 外部プラットフォームのメッセージID
    sent_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. AI返信履歴テーブル
CREATE TABLE ai_replies (
    id TEXT PRIMARY KEY DEFAULT generate_ulid(),
    tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
    message_id TEXT REFERENCES messages(id) ON DELETE CASCADE,
    original_message TEXT NOT NULL, -- 元の受信メッセージ
    ai_suggestions JSONB NOT NULL, -- AI提案（3つの候補）
    selected_reply TEXT, -- 選択された返信内容
    is_sent BOOLEAN DEFAULT false,
    feedback_rating INTEGER CHECK (feedback_rating BETWEEN 1 AND 5), -- 返信の評価
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. 自動リマインダー設定テーブル
CREATE TABLE reminder_settings (
    id TEXT PRIMARY KEY DEFAULT generate_ulid(),
    tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
    reminder_type TEXT NOT NULL CHECK (reminder_type IN ('pre_visit_7days', 'pre_visit_3days', 'pre_visit_1day', 'post_visit_24hours', 'post_visit_1week', 'post_visit_1month')),
    is_enabled BOOLEAN DEFAULT true,
    message_template TEXT NOT NULL,
    send_via_channels TEXT[] DEFAULT '{}', -- ['line', 'email'] など
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, reminder_type)
);

-- 12. 送信済みリマインダー履歴テーブル
CREATE TABLE sent_reminders (
    id TEXT PRIMARY KEY DEFAULT generate_ulid(),
    tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id TEXT REFERENCES customers(id) ON DELETE CASCADE,
    reservation_id TEXT REFERENCES reservations(id) ON DELETE CASCADE,
    reminder_type TEXT NOT NULL,
    channel_type TEXT NOT NULL,
    message_content TEXT NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE NOT NULL,
    delivery_status TEXT DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. 外部API設定テーブル
CREATE TABLE api_integrations (
    id TEXT PRIMARY KEY DEFAULT generate_ulid(),
    tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
    integration_type TEXT NOT NULL CHECK (integration_type IN ('line', 'instagram', 'google_calendar', 'hot_pepper')),
    api_credentials JSONB NOT NULL, -- 暗号化されたAPI認証情報
    webhook_url TEXT,
    is_active BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, integration_type)
);

-- 追加インデックス
CREATE INDEX idx_message_channels_tenant_customer ON message_channels(tenant_id, customer_id);
CREATE INDEX idx_messages_tenant_sent ON messages(tenant_id, sent_at DESC);
CREATE INDEX idx_messages_channel_sent ON messages(channel_id, sent_at DESC);
CREATE INDEX idx_messages_unread ON messages(tenant_id, is_read) WHERE is_read = false;
CREATE INDEX idx_ai_replies_tenant ON ai_replies(tenant_id, created_at DESC);
CREATE INDEX idx_sent_reminders_tenant ON sent_reminders(tenant_id, sent_at DESC);
CREATE INDEX idx_api_integrations_tenant ON api_integrations(tenant_id, integration_type);

-- 追加RLS有効化
ALTER TABLE message_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sent_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_integrations ENABLE ROW LEVEL SECURITY;

-- 追加RLSポリシー
CREATE POLICY "Users can only access their tenant's message channels" ON message_channels
    FOR ALL USING (
        tenant_id IN (
            SELECT tenant_id FROM user_tenant_mapping 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can only access their tenant's messages" ON messages
    FOR ALL USING (
        tenant_id IN (
            SELECT tenant_id FROM user_tenant_mapping 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can only access their tenant's ai replies" ON ai_replies
    FOR ALL USING (
        tenant_id IN (
            SELECT tenant_id FROM user_tenant_mapping 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can only access their tenant's reminder settings" ON reminder_settings
    FOR ALL USING (
        tenant_id IN (
            SELECT tenant_id FROM user_tenant_mapping 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can only access their tenant's sent reminders" ON sent_reminders
    FOR ALL USING (
        tenant_id IN (
            SELECT tenant_id FROM user_tenant_mapping 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can only access their tenant's api integrations" ON api_integrations
    FOR ALL USING (
        tenant_id IN (
            SELECT tenant_id FROM user_tenant_mapping 
            WHERE user_id = auth.uid()
        )
    );

-- 追加更新時刻自動更新トリガー
CREATE TRIGGER update_message_channels_updated_at BEFORE UPDATE ON message_channels
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_replies_updated_at BEFORE UPDATE ON ai_replies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reminder_settings_updated_at BEFORE UPDATE ON reminder_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_api_integrations_updated_at BEFORE UPDATE ON api_integrations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE tenants IS 'サロン（テナント）情報';
COMMENT ON TABLE user_tenant_mapping IS 'ユーザーとテナントの関連';
COMMENT ON TABLE customers IS '顧客情報';
COMMENT ON TABLE service_menus IS 'サービスメニュー';
COMMENT ON TABLE reservations IS '予約情報';
COMMENT ON TABLE business_settings IS '営業設定';
COMMENT ON TABLE plan_usage IS 'プラン使用状況';
COMMENT ON TABLE message_channels IS 'メッセージチャンネル（LINE、Instagram、メール）';
COMMENT ON TABLE messages IS 'メッセージ履歴';
COMMENT ON TABLE ai_replies IS 'AI返信履歴';
COMMENT ON TABLE reminder_settings IS '自動リマインダー設定';
COMMENT ON TABLE sent_reminders IS '送信済みリマインダー履歴';
COMMENT ON TABLE api_integrations IS '外部API統合設定';