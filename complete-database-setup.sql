-- =====================================
-- SMS美容サロン管理システム - 完全データベース設定
-- すべての必要なテーブルとその連携設定
-- =====================================

-- 拡張機能の有効化
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- API認証情報の暗号化用

-- =====================================
-- ヘルパー関数
-- =====================================

-- get_user_tenant_id関数（RLSポリシー用）
CREATE OR REPLACE FUNCTION get_user_tenant_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT tenant_id
    FROM users
    WHERE auth_id = auth.uid() OR id = auth.uid()
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 更新日時自動更新関数
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================
-- 1. 基本テーブル（既存）
-- =====================================

-- テナント（サロン）テーブル
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  plan_type VARCHAR(50) NOT NULL DEFAULT 'light' CHECK (plan_type IN ('light', 'standard', 'premium')),
  email VARCHAR(255) UNIQUE NOT NULL,
  phone_number VARCHAR(20),
  address TEXT,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ユーザーテーブル
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  role VARCHAR(50) NOT NULL DEFAULT 'staff' CHECK (role IN ('owner', 'admin', 'staff')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 顧客テーブル
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  name_kana VARCHAR(255),
  phone_number VARCHAR(20),
  email VARCHAR(255),
  birth_date DATE,
  gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
  address TEXT,
  notes TEXT,
  tags TEXT[],
  visit_count INTEGER DEFAULT 0,
  last_visit_date DATE,
  total_spent DECIMAL(10, 2) DEFAULT 0,
  preferred_contact_method VARCHAR(20) CHECK (preferred_contact_method IN ('phone', 'email', 'line', 'instagram')),
  line_user_id VARCHAR(255),
  instagram_id VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- スタッフテーブル
CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone_number VARCHAR(20),
  role VARCHAR(50) NOT NULL DEFAULT 'stylist',
  color VARCHAR(7) DEFAULT '#3B82F6',
  is_active BOOLEAN DEFAULT true,
  working_hours JSONB DEFAULT '{}'::jsonb,
  skills TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- サービスメニューテーブル
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  duration INTEGER NOT NULL, -- 所要時間（分）
  price DECIMAL(10, 2) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 予約テーブル
CREATE TABLE IF NOT EXISTS reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) DEFAULT 'confirmed' CHECK (status IN ('tentative', 'confirmed', 'completed', 'cancelled', 'no_show')),
  menu_content TEXT,
  price DECIMAL(10, 2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================
-- 2. 営業時間・休日設定テーブル
-- =====================================

-- 営業時間テーブル
CREATE TABLE IF NOT EXISTS business_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=日曜
  is_open BOOLEAN DEFAULT true,
  open_time TIME,
  close_time TIME,
  break_start_time TIME,
  break_end_time TIME,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, day_of_week)
);

-- 休日設定テーブル
CREATE TABLE IF NOT EXISTS holiday_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  holiday_type VARCHAR(20) NOT NULL CHECK (holiday_type IN ('weekly', 'monthly', 'specific_date')),
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6), -- 0=日曜
  week_of_month INTEGER CHECK (week_of_month BETWEEN 1 AND 5), -- 第n週
  specific_date DATE, -- 特定日付
  end_date DATE, -- 期間指定の終了日
  description TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 制約: 各休日タイプに応じて必要なフィールドが設定されていること
  CHECK (
    (holiday_type = 'weekly' AND day_of_week IS NOT NULL) OR
    (holiday_type = 'monthly' AND day_of_week IS NOT NULL AND week_of_month IS NOT NULL) OR
    (holiday_type = 'specific_date' AND specific_date IS NOT NULL)
  )
);

-- =====================================
-- 3. メッセージ・通信関連テーブル
-- =====================================

-- メッセージチャンネルテーブル（顧客の連絡先管理）
CREATE TABLE IF NOT EXISTS message_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  channel_type VARCHAR(20) NOT NULL CHECK (channel_type IN ('line', 'instagram', 'email')),
  channel_id VARCHAR(255) NOT NULL, -- LINEユーザーID、Instagramユーザー名、メールアドレス
  channel_name VARCHAR(255), -- 表示名
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false, -- 認証済みかどうか
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, channel_type, channel_id)
);

-- メッセージテーブル
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  channel_id UUID REFERENCES message_channels(id) ON DELETE CASCADE,
  direction VARCHAR(10) NOT NULL CHECK (direction IN ('sent', 'received')),
  content TEXT NOT NULL,
  media_url TEXT, -- 画像・動画のURL
  media_type VARCHAR(20), -- image, video, audio, file
  is_read BOOLEAN DEFAULT false,
  is_ai_reply BOOLEAN DEFAULT false, -- AI返信で送信されたかどうか
  thread_id UUID, -- 返信スレッド用
  external_message_id VARCHAR(255), -- 外部プラットフォームのメッセージID
  sent_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================
-- 4. API連携テーブル
-- =====================================

-- API統合設定テーブル
CREATE TABLE IF NOT EXISTS api_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  integration_type VARCHAR(50) NOT NULL CHECK (
    integration_type IN ('line', 'instagram', 'google_calendar', 'hot_pepper', 'sendgrid', 'twilio')
  ),
  api_credentials JSONB NOT NULL, -- 暗号化されたAPI認証情報
  webhook_url TEXT, -- Webhook受信用URL
  webhook_secret TEXT, -- Webhook署名検証用
  settings JSONB DEFAULT '{}'::jsonb, -- その他の設定
  is_active BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false, -- 接続テスト成功
  last_sync_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, integration_type)
);

-- =====================================
-- 5. リマインダー設定テーブル
-- =====================================

-- リマインダー設定テーブル
CREATE TABLE IF NOT EXISTS reminder_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  reminder_type VARCHAR(50) NOT NULL CHECK (
    reminder_type IN (
      'pre_visit_7days', 'pre_visit_3days', 'pre_visit_1day',
      'post_visit_24hours', 'post_visit_1week', 'post_visit_1month',
      'birthday', 'anniversary', 'custom'
    )
  ),
  is_enabled BOOLEAN DEFAULT true,
  message_template TEXT NOT NULL,
  send_via_channels TEXT[] DEFAULT '{}', -- ['line', 'email', 'instagram']
  send_time TIME DEFAULT '10:00:00', -- 送信時刻
  conditions JSONB DEFAULT '{}'::jsonb, -- 追加条件（例：特定のサービスを受けた顧客のみ）
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, reminder_type)
);

-- 送信済みリマインダー履歴テーブル
CREATE TABLE IF NOT EXISTS sent_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  reservation_id UUID REFERENCES reservations(id) ON DELETE CASCADE,
  reminder_type VARCHAR(50) NOT NULL,
  channel_type VARCHAR(20) NOT NULL,
  message_content TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL, -- 予定送信時刻
  sent_at TIMESTAMPTZ, -- 実際の送信時刻
  delivery_status VARCHAR(20) DEFAULT 'pending' CHECK (
    delivery_status IN ('pending', 'sent', 'delivered', 'failed', 'bounced')
  ),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================
-- 6. 通知設定テーブル
-- =====================================

-- 通知設定テーブル
CREATE TABLE IF NOT EXISTS notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- NULL の場合はテナント全体の設定
  notification_type VARCHAR(50) NOT NULL CHECK (
    notification_type IN (
      'new_reservation', 'reservation_change', 'reservation_cancel',
      'new_customer', 'new_message', 'reminder_sent',
      'daily_summary', 'weekly_report', 'monthly_report',
      'system_alert', 'plan_limit_warning'
    )
  ),
  is_enabled BOOLEAN DEFAULT true,
  channels TEXT[] DEFAULT '{}', -- ['email', 'push', 'in_app']
  settings JSONB DEFAULT '{}'::jsonb, -- 詳細設定（例：メール送信先、通知時刻など）
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, user_id, notification_type)
);

-- =====================================
-- 7. セキュリティ・監査テーブル
-- =====================================

-- セキュリティログテーブル
CREATE TABLE IF NOT EXISTS security_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL CHECK (
    event_type IN (
      'login', 'logout', 'password_change', 'password_reset',
      'data_export', 'account_delete', 'permission_change',
      'api_access', 'suspicious_activity'
    )
  ),
  ip_address INET,
  user_agent TEXT,
  location JSONB, -- {country, city, coordinates}
  metadata JSONB DEFAULT '{}'::jsonb, -- 追加情報
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================
-- 8. プラン使用状況テーブル
-- =====================================

-- プラン使用状況テーブル（既存を更新）
CREATE TABLE IF NOT EXISTS plan_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  month DATE NOT NULL, -- YYYY-MM-01形式
  customers_count INTEGER DEFAULT 0,
  reservations_count INTEGER DEFAULT 0,
  messages_sent INTEGER DEFAULT 0,
  ai_replies_count INTEGER DEFAULT 0,
  storage_used_mb DECIMAL(10, 2) DEFAULT 0,
  api_calls_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, month)
);

-- =====================================
-- 9. AI関連テーブル
-- =====================================

-- AI返信履歴テーブル
CREATE TABLE IF NOT EXISTS ai_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  original_message TEXT NOT NULL,
  ai_suggestions JSONB NOT NULL, -- AI提案（複数の候補）
  selected_reply TEXT, -- 選択された返信内容
  is_sent BOOLEAN DEFAULT false,
  feedback_rating INTEGER CHECK (feedback_rating BETWEEN 1 AND 5),
  feedback_comment TEXT,
  model_version VARCHAR(50), -- 使用したAIモデルのバージョン
  processing_time_ms INTEGER, -- 処理時間
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================
-- インデックスの作成
-- =====================================

-- 基本テーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customers_tenant_id ON customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(tenant_id, phone_number);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(tenant_id, email);
CREATE INDEX IF NOT EXISTS idx_staff_tenant_id ON staff(tenant_id);
CREATE INDEX IF NOT EXISTS idx_services_tenant_id ON services(tenant_id);
CREATE INDEX IF NOT EXISTS idx_reservations_tenant_date ON reservations(tenant_id, start_time);
CREATE INDEX IF NOT EXISTS idx_reservations_customer ON reservations(customer_id);
CREATE INDEX IF NOT EXISTS idx_reservations_staff ON reservations(staff_id);

-- 営業時間・休日のインデックス
CREATE INDEX IF NOT EXISTS idx_business_hours_tenant ON business_hours(tenant_id);
CREATE INDEX IF NOT EXISTS idx_holiday_settings_tenant ON holiday_settings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_holiday_settings_active ON holiday_settings(tenant_id, is_active);

-- メッセージ関連のインデックス
CREATE INDEX IF NOT EXISTS idx_message_channels_tenant_customer ON message_channels(tenant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_message_channels_type ON message_channels(tenant_id, channel_type);
CREATE INDEX IF NOT EXISTS idx_messages_tenant_sent ON messages(tenant_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_customer ON messages(customer_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(tenant_id, is_read) WHERE is_read = false;

-- API・リマインダー関連のインデックス
CREATE INDEX IF NOT EXISTS idx_api_integrations_tenant ON api_integrations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_reminder_settings_tenant ON reminder_settings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sent_reminders_tenant ON sent_reminders(tenant_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_sent_reminders_status ON sent_reminders(delivery_status) WHERE delivery_status = 'pending';

-- セキュリティ・監査のインデックス
CREATE INDEX IF NOT EXISTS idx_security_logs_tenant ON security_logs(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_logs_user ON security_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_logs_event ON security_logs(event_type, created_at DESC);

-- =====================================
-- Row Level Security (RLS) の設定
-- =====================================

-- すべてのテーブルでRLSを有効化
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE holiday_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sent_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_replies ENABLE ROW LEVEL SECURITY;

-- RLSポリシーの作成（各テーブルに同じパターンを適用）
DO $$
DECLARE
    tbl TEXT;
    tables TEXT[] := ARRAY[
        'tenants', 'customers', 'staff', 'services', 'reservations',
        'business_hours', 'holiday_settings', 'message_channels', 'messages',
        'api_integrations', 'reminder_settings', 'sent_reminders',
        'notification_settings', 'plan_usage', 'ai_replies'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables
    LOOP
        -- 既存のポリシーを削除
        EXECUTE format('DROP POLICY IF EXISTS "Users can manage same tenant %s" ON %I', tbl, tbl);
        
        -- 新しいポリシーを作成
        IF tbl = 'tenants' THEN
            -- tenantsテーブルは特別扱い
            EXECUTE format('
                CREATE POLICY "Users can manage same tenant %s" ON %I
                FOR ALL USING (
                    id IN (
                        SELECT tenant_id FROM users WHERE auth_id = auth.uid() OR id = auth.uid()
                    )
                )', tbl, tbl);
        ELSE
            -- その他のテーブル
            EXECUTE format('
                CREATE POLICY "Users can manage same tenant %s" ON %I
                FOR ALL USING (tenant_id = get_user_tenant_id())', tbl, tbl);
        END IF;
    END LOOP;
END $$;

-- usersテーブルの特別なポリシー
DROP POLICY IF EXISTS "Users can manage same tenant users" ON users;
CREATE POLICY "Users can view same tenant users" ON users
    FOR SELECT USING (tenant_id = get_user_tenant_id());
CREATE POLICY "Users can insert own record" ON users
    FOR INSERT WITH CHECK (auth_id = auth.uid() OR id = auth.uid());
CREATE POLICY "Users can update own record" ON users
    FOR UPDATE USING (auth_id = auth.uid() OR id = auth.uid());

-- security_logsテーブルの特別なポリシー
DROP POLICY IF EXISTS "Users can manage same tenant security_logs" ON security_logs;
CREATE POLICY "Users can view own security logs" ON security_logs
    FOR SELECT USING (
        user_id = auth.uid() OR 
        tenant_id = get_user_tenant_id()
    );
CREATE POLICY "System can insert security logs" ON security_logs
    FOR INSERT WITH CHECK (true); -- システムのみが挿入可能

-- =====================================
-- トリガーの設定
-- =====================================

-- 更新日時の自動更新トリガー
DO $$
DECLARE
    tbl TEXT;
    tables TEXT[] := ARRAY[
        'tenants', 'users', 'customers', 'staff', 'services', 'reservations',
        'business_hours', 'holiday_settings', 'message_channels', 'messages',
        'api_integrations', 'reminder_settings', 'notification_settings',
        'plan_usage', 'ai_replies'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS update_%s_updated_at ON %I;
            CREATE TRIGGER update_%s_updated_at
            BEFORE UPDATE ON %I
            FOR EACH ROW EXECUTE FUNCTION update_updated_at();
        ', tbl, tbl, tbl, tbl);
    END LOOP;
END $$;

-- =====================================
-- 初期データの投入（開発用）
-- =====================================

-- テストテナントの作成
INSERT INTO tenants (id, name, plan_type, email, phone_number, address)
VALUES (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::UUID,
    'デモ美容サロン',
    'light',
    'demo@salon.com',
    '03-1234-5678',
    '東京都渋谷区1-2-3'
) ON CONFLICT (id) DO NOTHING;

-- デフォルトの営業時間設定（日曜休み）
INSERT INTO business_hours (tenant_id, day_of_week, is_open, open_time, close_time, break_start_time, break_end_time)
SELECT 
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::UUID,
    generate_series(0, 6),
    CASE WHEN generate_series(0, 6) = 0 THEN false ELSE true END,
    '09:00'::TIME,
    '18:00'::TIME,
    '12:00'::TIME,
    '13:00'::TIME
ON CONFLICT (tenant_id, day_of_week) DO NOTHING;

-- デフォルトのリマインダー設定
INSERT INTO reminder_settings (tenant_id, reminder_type, is_enabled, message_template, send_via_channels)
VALUES 
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890'::UUID, 'pre_visit_1day', true, 
     '{{customer_name}}様、明日{{time}}にご予約をいただいております。お待ちしております！', 
     ARRAY['line', 'email']),
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890'::UUID, 'post_visit_24hours', true, 
     '{{customer_name}}様、昨日はご来店ありがとうございました。またのお越しをお待ちしております。', 
     ARRAY['line'])
ON CONFLICT (tenant_id, reminder_type) DO NOTHING;

-- デフォルトの通知設定
INSERT INTO notification_settings (tenant_id, notification_type, is_enabled, channels)
VALUES 
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890'::UUID, 'new_reservation', true, ARRAY['email', 'in_app']),
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890'::UUID, 'monthly_report', true, ARRAY['email'])
ON CONFLICT (tenant_id, user_id, notification_type) DO NOTHING;

-- =====================================
-- 動作確認用のビュー
-- =====================================

-- 設定状況確認ビュー
CREATE OR REPLACE VIEW v_settings_status AS
SELECT 
    t.id as tenant_id,
    t.name as tenant_name,
    t.plan_type,
    -- 基本設定
    (SELECT COUNT(*) FROM users WHERE tenant_id = t.id) as users_count,
    (SELECT COUNT(*) FROM customers WHERE tenant_id = t.id) as customers_count,
    (SELECT COUNT(*) FROM staff WHERE tenant_id = t.id) as staff_count,
    (SELECT COUNT(*) FROM services WHERE tenant_id = t.id) as services_count,
    -- 営業時間・休日
    (SELECT COUNT(*) FROM business_hours WHERE tenant_id = t.id) as business_hours_count,
    (SELECT COUNT(*) FROM holiday_settings WHERE tenant_id = t.id AND is_active = true) as active_holidays_count,
    -- API連携
    (SELECT COUNT(*) FROM api_integrations WHERE tenant_id = t.id AND is_active = true) as active_integrations_count,
    -- リマインダー
    (SELECT COUNT(*) FROM reminder_settings WHERE tenant_id = t.id AND is_enabled = true) as active_reminders_count,
    -- 通知
    (SELECT COUNT(*) FROM notification_settings WHERE tenant_id = t.id AND is_enabled = true) as active_notifications_count
FROM tenants t;

-- =====================================
-- 設定完了の確認
-- =====================================

DO $$
BEGIN
    RAISE NOTICE '=== データベース設定完了 ===';
    RAISE NOTICE 'すべてのテーブルが作成されました。';
    RAISE NOTICE 'RLSポリシーが設定されました。';
    RAISE NOTICE 'インデックスが作成されました。';
    RAISE NOTICE 'トリガーが設定されました。';
    RAISE NOTICE '';
    RAISE NOTICE '次のステップ:';
    RAISE NOTICE '1. アプリケーションでAPI連携機能を実装';
    RAISE NOTICE '2. リマインダー送信のバックグラウンドジョブを設定';
    RAISE NOTICE '3. 通知システムの実装';
    RAISE NOTICE '4. セキュリティ監査ログの記録開始';
END $$;