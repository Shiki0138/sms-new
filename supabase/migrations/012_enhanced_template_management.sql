-- =====================================
-- Enhanced Template Management System
-- =====================================

-- Enhanced Message Templates with Distribution Types and Versioning
DROP TABLE IF EXISTS message_templates CASCADE;
CREATE TABLE message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Distribution categories
  category VARCHAR(50) NOT NULL CHECK (category IN (
    'campaign',        -- キャンペーン情報
    'holiday',         -- 休業通知
    'emergency',       -- 緊急連絡
    'special_offer',   -- お得な情報
    'reminder',        -- リマインダー
    'custom'           -- カスタム
  )),
  
  -- Sub-categories for better organization
  sub_category VARCHAR(100),
  
  -- Channel-specific content
  line_content TEXT,
  email_content TEXT,
  email_subject VARCHAR(255),
  sms_content TEXT,
  
  -- Template variables and metadata
  variables JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Versioning and A/B testing
  version INTEGER DEFAULT 1,
  parent_template_id UUID REFERENCES message_templates(id),
  is_ab_test BOOLEAN DEFAULT false,
  ab_test_percentage INTEGER CHECK (ab_test_percentage >= 0 AND ab_test_percentage <= 100),
  
  -- Status and activation
  is_active BOOLEAN DEFAULT true,
  is_approved BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  
  -- Scheduling
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  
  -- Usage tracking
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  UNIQUE(tenant_id, name, version)
);

-- Template Variable Definitions
CREATE TABLE template_variables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  description TEXT,
  data_type VARCHAR(50) DEFAULT 'string' CHECK (data_type IN ('string', 'number', 'date', 'boolean', 'url')),
  data_source VARCHAR(100), -- customer, reservation, salon, system
  data_path VARCHAR(255), -- JSON path for complex data
  default_value TEXT,
  example_value TEXT,
  is_required BOOLEAN DEFAULT false,
  is_system BOOLEAN DEFAULT false, -- System variables vs custom variables
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(tenant_id, name)
);

-- Template Distribution Rules
CREATE TABLE template_distribution_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES message_templates(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  
  -- Distribution conditions
  send_conditions JSONB DEFAULT '{}'::jsonb, -- Days, times, seasons, customer segments
  exclusion_conditions JSONB DEFAULT '{}'::jsonb, -- Opt-out, blocked customers
  
  -- Channel preferences and priorities
  channel_priorities JSONB DEFAULT '{"line": 1, "email": 2, "sms": 3}'::jsonb,
  fallback_channels JSONB DEFAULT '["email", "sms"]'::jsonb,
  
  -- Frequency limits
  frequency_limit INTEGER, -- Max sends per customer per period
  frequency_period INTEGER, -- Period in days
  
  -- Send timing
  preferred_send_times JSONB DEFAULT '{"start": "09:00", "end": "20:00"}'::jsonb,
  excluded_days JSONB DEFAULT '[]'::jsonb, -- Days to exclude [0-6, Sunday=0]
  
  -- Auto-send configuration
  is_auto_send BOOLEAN DEFAULT false,
  trigger_event VARCHAR(100), -- appointment_created, customer_birthday, etc.
  trigger_timing INTEGER, -- Minutes before/after trigger event
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Template Performance Analytics
CREATE TABLE template_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES message_templates(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  
  -- Delivery statistics
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  opened_count INTEGER DEFAULT 0,
  clicked_count INTEGER DEFAULT 0,
  bounced_count INTEGER DEFAULT 0,
  unsubscribed_count INTEGER DEFAULT 0,
  
  -- Channel breakdown
  line_sent INTEGER DEFAULT 0,
  email_sent INTEGER DEFAULT 0,
  sms_sent INTEGER DEFAULT 0,
  
  -- Performance metrics
  delivery_rate DECIMAL(5,2), -- delivered/sent * 100
  open_rate DECIMAL(5,2), -- opened/delivered * 100
  click_rate DECIMAL(5,2), -- clicked/opened * 100
  conversion_rate DECIMAL(5,2), -- conversions/sent * 100
  
  -- Revenue tracking (for campaign templates)
  revenue_generated DECIMAL(12,2) DEFAULT 0,
  bookings_generated INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(tenant_id, template_id, date)
);

-- Automated Reminder Templates
CREATE TABLE reminder_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES message_templates(id) ON DELETE CASCADE,
  
  -- Reminder timing
  reminder_type VARCHAR(50) NOT NULL CHECK (reminder_type IN (
    'pre_appointment_7d',  -- 1週間前
    'pre_appointment_3d',  -- 3日前
    'pre_appointment_1d',  -- 1日前
    'pre_appointment_2h',  -- 2時間前
    'post_appointment_2h', -- 来店後2時間
    'post_appointment_1d', -- 来店後1日
    'post_appointment_1w', -- 来店後1週間
    'no_visit_30d',        -- 30日来店なし
    'birthday',            -- 誕生日
    'anniversary',         -- 来店記念日
    'custom'               -- カスタムトリガー
  )),
  
  -- Timing configuration
  trigger_timing INTEGER NOT NULL, -- Minutes before/after event
  max_reminders INTEGER DEFAULT 1, -- Maximum reminders per customer
  reminder_interval INTEGER, -- Minutes between reminders if max > 1
  
  -- Conditions
  send_conditions JSONB DEFAULT '{}'::jsonb,
  customer_filters JSONB DEFAULT '{}'::jsonb,
  
  -- Customization
  allow_customer_customization BOOLEAN DEFAULT false,
  customizable_fields JSONB DEFAULT '[]'::jsonb,
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customer Template Preferences
CREATE TABLE customer_template_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  
  -- Channel preferences
  preferred_channels JSONB DEFAULT '["line"]'::jsonb,
  blocked_channels JSONB DEFAULT '[]'::jsonb,
  
  -- Content preferences
  preferred_language VARCHAR(10) DEFAULT 'ja',
  communication_style VARCHAR(20) DEFAULT 'polite' CHECK (communication_style IN ('formal', 'polite', 'casual', 'friendly')),
  
  -- Template category preferences
  receive_campaigns BOOLEAN DEFAULT true,
  receive_reminders BOOLEAN DEFAULT true,
  receive_promotions BOOLEAN DEFAULT true,
  receive_announcements BOOLEAN DEFAULT true,
  receive_birthday_messages BOOLEAN DEFAULT true,
  
  -- Timing preferences
  preferred_send_time_start TIME DEFAULT '09:00',
  preferred_send_time_end TIME DEFAULT '20:00',
  do_not_disturb_days JSONB DEFAULT '[]'::jsonb,
  
  -- Frequency preferences
  max_messages_per_week INTEGER DEFAULT 5,
  min_hours_between_messages INTEGER DEFAULT 2,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(tenant_id, customer_id)
);

-- Seasonal and Event-based Templates
CREATE TABLE seasonal_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES message_templates(id) ON DELETE CASCADE,
  
  -- Seasonal configuration
  season_type VARCHAR(50) NOT NULL CHECK (season_type IN (
    'new_year',          -- 新年
    'valentines',        -- バレンタイン
    'white_day',         -- ホワイトデー
    'cherry_blossom',    -- 桜の季節
    'golden_week',       -- ゴールデンウィーク
    'mothers_day',       -- 母の日
    'fathers_day',       -- 父の日
    'summer_vacation',   -- 夏休み
    'obon',             -- お盆
    'halloween',         -- ハロウィン
    'christmas',         -- クリスマス
    'year_end',         -- 年末
    'custom_event'       -- カスタムイベント
  )),
  
  -- Activation period
  start_date DATE,
  end_date DATE,
  recurring_yearly BOOLEAN DEFAULT true,
  
  -- Custom event details (for custom_event type)
  event_name VARCHAR(255),
  event_description TEXT,
  
  -- Send timing within period
  send_days_before INTEGER DEFAULT 0,
  send_on_date BOOLEAN DEFAULT true,
  send_days_after INTEGER DEFAULT 0,
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Template Usage History
CREATE TABLE template_usage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES message_templates(id) ON DELETE CASCADE,
  
  -- Usage details
  used_by UUID REFERENCES auth.users(id),
  usage_type VARCHAR(50) NOT NULL CHECK (usage_type IN (
    'manual_send',       -- 手動送信
    'campaign',          -- キャンペーン送信
    'automated_reminder', -- 自動リマインダー
    'api_send',          -- API経由送信
    'test_send'          -- テスト送信
  )),
  
  -- Recipients and channels
  recipient_count INTEGER DEFAULT 1,
  channels_used JSONB DEFAULT '[]'::jsonb,
  
  -- Campaign association
  campaign_id UUID,
  
  -- Results tracking
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  
  used_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_message_templates_tenant_category ON message_templates(tenant_id, category);
CREATE INDEX idx_message_templates_active ON message_templates(tenant_id, is_active) WHERE is_active = true;
CREATE INDEX idx_message_templates_parent ON message_templates(parent_template_id) WHERE parent_template_id IS NOT NULL;
CREATE INDEX idx_template_variables_tenant ON template_variables(tenant_id, data_source);
CREATE INDEX idx_template_distribution_rules_template ON template_distribution_rules(template_id);
CREATE INDEX idx_template_analytics_date ON template_analytics(tenant_id, date);
CREATE INDEX idx_reminder_templates_type ON reminder_templates(tenant_id, reminder_type);
CREATE INDEX idx_customer_preferences_customer ON customer_template_preferences(customer_id);
CREATE INDEX idx_seasonal_templates_dates ON seasonal_templates(start_date, end_date);
CREATE INDEX idx_template_usage_history_template ON template_usage_history(template_id, used_at);

-- Enable RLS
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_variables ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_distribution_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_template_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasonal_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_usage_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage templates" ON message_templates
  FOR ALL USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can manage template variables" ON template_variables
  FOR ALL USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can manage distribution rules" ON template_distribution_rules
  FOR ALL USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can view template analytics" ON template_analytics
  FOR SELECT USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can manage reminder templates" ON reminder_templates
  FOR ALL USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can manage customer preferences" ON customer_template_preferences
  FOR ALL USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can manage seasonal templates" ON seasonal_templates
  FOR ALL USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can view usage history" ON template_usage_history
  FOR SELECT USING (tenant_id = get_user_tenant_id());

-- Update triggers
CREATE TRIGGER update_message_templates_updated_at BEFORE UPDATE ON message_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_template_variables_updated_at BEFORE UPDATE ON template_variables
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_template_distribution_rules_updated_at BEFORE UPDATE ON template_distribution_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_reminder_templates_updated_at BEFORE UPDATE ON reminder_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_customer_template_preferences_updated_at BEFORE UPDATE ON customer_template_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Insert default template variables
INSERT INTO template_variables (tenant_id, name, display_name, description, data_source, example_value, is_system)
SELECT 
  id as tenant_id,
  'customer_name' as name,
  '顧客名' as display_name,
  'お客様のお名前' as description,
  'customer' as data_source,
  '田中 花子' as example_value,
  true as is_system
FROM tenants
ON CONFLICT (tenant_id, name) DO NOTHING;

INSERT INTO template_variables (tenant_id, name, display_name, description, data_source, example_value, is_system)
SELECT 
  id as tenant_id,
  'salon_name' as name,
  'サロン名' as display_name,
  'サロンの名前' as description,
  'salon' as data_source,
  'ビューティーサロン花' as example_value,
  true as is_system
FROM tenants
ON CONFLICT (tenant_id, name) DO NOTHING;

INSERT INTO template_variables (tenant_id, name, display_name, description, data_source, example_value, is_system)
SELECT 
  id as tenant_id,
  'appointment_date' as name,
  '予約日' as display_name,
  'ご予約の日付' as description,
  'reservation' as data_source,
  '4月15日(月)' as example_value,
  true as is_system
FROM tenants
ON CONFLICT (tenant_id, name) DO NOTHING;

INSERT INTO template_variables (tenant_id, name, display_name, description, data_source, example_value, is_system)
SELECT 
  id as tenant_id,
  'appointment_time' as name,
  '予約時間' as display_name,
  'ご予約の時間' as description,
  'reservation' as data_source,
  '14:00' as example_value,
  true as is_system
FROM tenants
ON CONFLICT (tenant_id, name) DO NOTHING;

INSERT INTO template_variables (tenant_id, name, display_name, description, data_source, example_value, is_system)
SELECT 
  id as tenant_id,
  'staff_name' as name,
  'スタッフ名' as display_name,
  '担当スタッフの名前' as description,
  'reservation' as data_source,
  '佐藤 美咲' as example_value,
  true as is_system
FROM tenants
ON CONFLICT (tenant_id, name) DO NOTHING;

INSERT INTO template_variables (tenant_id, name, display_name, description, data_source, example_value, is_system)
SELECT 
  id as tenant_id,
  'menu_name' as name,
  'メニュー名' as display_name,
  'ご予約のメニュー' as description,
  'reservation' as data_source,
  'カット＋カラー' as example_value,
  true as is_system
FROM tenants
ON CONFLICT (tenant_id, name) DO NOTHING;

INSERT INTO template_variables (tenant_id, name, display_name, description, data_source, example_value, is_system)
SELECT 
  id as tenant_id,
  'salon_phone' as name,
  'サロン電話番号' as display_name,
  'サロンの電話番号' as description,
  'salon' as data_source,
  '03-1234-5678' as example_value,
  true as is_system
FROM tenants
ON CONFLICT (tenant_id, name) DO NOTHING;

INSERT INTO template_variables (tenant_id, name, display_name, description, data_source, example_value, is_system)
SELECT 
  id as tenant_id,
  'salon_address' as name,
  'サロン住所' as display_name,
  'サロンの住所' as description,
  'salon' as data_source,
  '東京都渋谷区〇〇1-2-3' as example_value,
  true as is_system
FROM tenants
ON CONFLICT (tenant_id, name) DO NOTHING;

-- Insert predefined campaign templates
INSERT INTO message_templates (tenant_id, name, description, category, sub_category, line_content, email_subject, email_content, sms_content, variables, is_active, is_approved)
SELECT 
  id as tenant_id,
  '新メニューキャンペーン' as name,
  '新しいメニューやサービスを紹介するキャンペーン' as description,
  'campaign' as category,
  'new_service' as sub_category,
  '{customer_name}様

いつもご利用いただきありがとうございます！

✨ 新メニューのご案内 ✨

この度、新しく「{menu_name}」をスタートいたします！

🎉 オープン記念特価
通常価格 ¥{regular_price}
→ 特別価格 ¥{special_price}

期間：{campaign_start_date}〜{campaign_end_date}

ご予約・お問い合わせはお気軽に♪
{salon_name}
TEL: {salon_phone}' as line_content,
  '【{salon_name}】新メニューのご案内' as email_subject,
  '{customer_name}様

いつも{salon_name}をご利用いただき、誠にありがとうございます。

この度、新しいメニュー「{menu_name}」をご用意いたしました。

■ オープン記念特価 ■
通常価格：¥{regular_price}
特別価格：¥{special_price}

キャンペーン期間：{campaign_start_date}〜{campaign_end_date}

詳しくはお電話またはLINEにてお気軽にお問い合わせください。

皆様のご来店を心よりお待ちしております。

{salon_name}
〒{salon_address}
TEL: {salon_phone}' as email_content,
  '{customer_name}様 新メニュー「{menu_name}」特価¥{special_price}で開始！期間{campaign_end_date}まで。{salon_name} {salon_phone}' as sms_content,
  '["customer_name", "salon_name", "menu_name", "regular_price", "special_price", "campaign_start_date", "campaign_end_date", "salon_phone", "salon_address"]'::jsonb as variables,
  true as is_active,
  true as is_approved
FROM tenants
ON CONFLICT (tenant_id, name, version) DO NOTHING;

INSERT INTO message_templates (tenant_id, name, description, category, sub_category, line_content, email_subject, email_content, sms_content, variables, is_active, is_approved)
SELECT 
  id as tenant_id,
  '年末年始休業のお知らせ' as name,
  '年末年始の休業期間をお知らせするテンプレート' as description,
  'holiday' as category,
  'year_end' as sub_category,
  '{customer_name}様

いつもご利用いただきありがとうございます。

年末年始の営業についてお知らせいたします。

🗓️ 休業期間
{holiday_start_date}〜{holiday_end_date}

📅 営業再開
{business_restart_date}より通常営業

年内のご予約はお早めにお願いいたします。

来年もどうぞ宜しくお願いいたします。

{salon_name}
TEL: {salon_phone}' as line_content,
  '【{salon_name}】年末年始休業のお知らせ' as email_subject,
  '{customer_name}様

いつも{salon_name}をご利用いただき、誠にありがとうございます。

年末年始の営業についてご案内申し上げます。

■ 休業期間 ■
{holiday_start_date}〜{holiday_end_date}

■ 営業再開 ■  
{business_restart_date}より通常営業いたします。

年内のご予約をご希望の方は、お早めにご連絡ください。

本年も大変お世話になりました。
来年もより一層のサービス向上に努めてまいります。

{salon_name}
〒{salon_address}
TEL: {salon_phone}' as email_content,
  '{salon_name}年末年始休業{holiday_start_date}〜{holiday_end_date}、{business_restart_date}より営業再開。年内予約はお早めに。{salon_phone}' as sms_content,
  '["customer_name", "salon_name", "holiday_start_date", "holiday_end_date", "business_restart_date", "salon_phone", "salon_address"]'::jsonb as variables,
  true as is_active,
  true as is_approved
FROM tenants
ON CONFLICT (tenant_id, name, version) DO NOTHING;

INSERT INTO message_templates (tenant_id, name, description, category, sub_category, line_content, email_subject, email_content, sms_content, variables, is_active, is_approved)
SELECT 
  id as tenant_id,
  '緊急：臨時休業のお知らせ' as name,
  '急な臨時休業をお知らせする緊急テンプレート' as description,
  'emergency' as category,
  'temporary_closure' as sub_category,
  '【緊急連絡】{customer_name}様

申し訳ございません。

{emergency_reason}のため、
{closure_date}は臨時休業とさせていただきます。

ご予約をいただいていたお客様には、
個別にご連絡いたします。

ご迷惑をおかけして大変申し訳ございません。

{salon_name}
TEL: {salon_phone}' as line_content,
  '【緊急】{salon_name} 臨時休業のお知らせ' as email_subject,
  '{customer_name}様

{salon_name}より緊急連絡です。

{emergency_reason}のため、{closure_date}は臨時休業とさせていただきます。

ご予約をいただいていたお客様には、改めて個別にご連絡いたします。

急なご連絡となり、ご迷惑をおかけして誠に申し訳ございません。

{salon_name}
〒{salon_address}  
TEL: {salon_phone}' as email_content,
  '【緊急】{salon_name}臨時休業{closure_date}。{emergency_reason}のため。ご予約の方には個別連絡します。{salon_phone}' as sms_content,
  '["customer_name", "salon_name", "emergency_reason", "closure_date", "salon_phone", "salon_address"]'::jsonb as variables,
  true as is_active,
  true as is_approved
FROM tenants
ON CONFLICT (tenant_id, name, version) DO NOTHING;

INSERT INTO message_templates (tenant_id, name, description, category, sub_category, line_content, email_subject, email_content, sms_content, variables, is_active, is_approved)
SELECT 
  id as tenant_id,
  '会員様限定特典' as name,
  'VIP顧客やリピーター向けの特別オファー' as description,
  'special_offer' as category,
  'member_exclusive' as sub_category,
  '{customer_name}様

いつもありがとうございます！

✨ 会員様限定特典 ✨

日頃の感謝を込めて、特別なご案内です。

🎁 今月限定特典
・全メニュー{discount_rate}%OFF
・次回予約で使える¥{voucher_amount}クーポン
・{special_service}無料サービス

有効期限：{offer_end_date}まで

いつもご愛顧いただき、ありがとうございます💕

{salon_name}
TEL: {salon_phone}' as line_content,
  '【{salon_name}】会員様限定特典のご案内' as email_subject,
  '{customer_name}様

いつも{salon_name}をご利用いただき、誠にありがとうございます。

日頃のご愛顧に感謝を込めて、会員様限定の特別特典をご用意いたしました。

■ 今月の特典内容 ■
・全メニュー{discount_rate}%OFF
・次回予約で使える¥{voucher_amount}クーポンプレゼント  
・{special_service}を無料でお付けします

■ 有効期限 ■
{offer_end_date}まで

これからも末永くお付き合いいただけますよう、スタッフ一同心よりお待ちしております。

{salon_name}
〒{salon_address}
TEL: {salon_phone}' as email_content,
  '{customer_name}様限定！全メニュー{discount_rate}%OFF+¥{voucher_amount}クーポン。{offer_end_date}まで。{salon_name} {salon_phone}' as sms_content,
  '["customer_name", "salon_name", "discount_rate", "voucher_amount", "special_service", "offer_end_date", "salon_phone", "salon_address"]'::jsonb as variables,
  true as is_active,
  true as is_approved
FROM tenants
ON CONFLICT (tenant_id, name, version) DO NOTHING;

-- Create default reminder templates
INSERT INTO message_templates (tenant_id, name, description, category, line_content, email_subject, email_content, sms_content, variables, is_active, is_approved)
SELECT 
  id as tenant_id,
  '1週間前リマインダー（改良版）' as name,
  '予約1週間前の詳細リマインダー' as description,
  'reminder' as category,
  '{customer_name}様

来週のご予約についてお知らせいたします💫

📅 ご予約詳細
日時：{appointment_date} {appointment_time}
メニュー：{menu_name}
担当：{staff_name}
所要時間：約{duration}分

🏠 アクセス  
{salon_name}
{salon_address}
TEL: {salon_phone}

何かご不明な点がございましたら、お気軽にお声がけください✨

楽しみにお待ちしております！' as line_content,
  '【{salon_name}】ご予約のリマインダー（{appointment_date}）' as email_subject,
  '{customer_name}様

{salon_name}です。
来週のご予約についてリマインドいたします。

■ ご予約詳細 ■
日時：{appointment_date} {appointment_time}
メニュー：{menu_name}  
担当スタッフ：{staff_name}
所要時間：約{duration}分

■ サロン情報 ■
{salon_name}
〒{salon_address}
TEL: {salon_phone}

ご質問やご要望がございましたら、事前にお知らせください。

スタッフ一同、心よりお待ちしております。' as email_content,
  '{customer_name}様 {appointment_date}{appointment_time}{menu_name}のご予約です。{salon_name} {salon_phone}' as sms_content,
  '["customer_name", "salon_name", "appointment_date", "appointment_time", "menu_name", "staff_name", "duration", "salon_address", "salon_phone"]'::jsonb as variables,
  true as is_active,
  true as is_approved
FROM tenants
ON CONFLICT (tenant_id, name, version) DO NOTHING;

-- Link reminder templates
INSERT INTO reminder_templates (tenant_id, template_id, reminder_type, trigger_timing, is_active)
SELECT 
  t.id as tenant_id,
  mt.id as template_id,
  'pre_appointment_7d' as reminder_type,
  10080 as trigger_timing, -- 7 days in minutes
  true as is_active
FROM tenants t
JOIN message_templates mt ON mt.tenant_id = t.id AND mt.name = '1週間前リマインダー（改良版）'
ON CONFLICT DO NOTHING;