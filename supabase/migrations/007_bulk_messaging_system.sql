-- =====================================
-- Bulk Messaging System Schema
-- =====================================

-- Message Templates
CREATE TABLE IF NOT EXISTS message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('reminder', 'campaign', 'announcement', 'emergency', 'custom')),
  subject VARCHAR(255), -- For email
  content TEXT NOT NULL,
  variables JSONB DEFAULT '[]', -- Available template variables
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(tenant_id, name)
);

-- Customer Message Preferences
CREATE TABLE IF NOT EXISTS customer_message_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  channel_type VARCHAR(20) NOT NULL CHECK (channel_type IN ('line', 'email', 'sms')),
  is_opted_in BOOLEAN DEFAULT true,
  opt_in_date TIMESTAMPTZ DEFAULT NOW(),
  opt_out_date TIMESTAMPTZ,
  opt_out_reason VARCHAR(255),
  -- Message type preferences
  receive_reminders BOOLEAN DEFAULT true,
  receive_campaigns BOOLEAN DEFAULT true,
  receive_announcements BOOLEAN DEFAULT true,
  receive_urgent BOOLEAN DEFAULT true,
  -- Preferred send times
  preferred_time_start TIME DEFAULT '09:00',
  preferred_time_end TIME DEFAULT '20:00',
  preferred_days JSONB DEFAULT '["mon","tue","wed","thu","fri","sat","sun"]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, customer_id, channel_type)
);

-- Campaigns
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  campaign_type VARCHAR(50) NOT NULL CHECK (campaign_type IN ('one_time', 'recurring', 'triggered')),
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled')),
  template_id UUID REFERENCES message_templates(id),
  subject VARCHAR(255), -- Override template subject
  content TEXT, -- Override template content
  target_segments JSONB DEFAULT '[]', -- Customer segments
  target_filters JSONB DEFAULT '{}', -- Additional filters
  send_channels JSONB DEFAULT '["line"]', -- Channels to use
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  -- Statistics
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  read_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Campaign Messages (individual messages sent in a campaign)
CREATE TABLE IF NOT EXISTS campaign_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  channel_type VARCHAR(20) NOT NULL,
  message_id UUID REFERENCES messages(id), -- Link to actual message
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'bounced')),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Automated Reminder Rules
CREATE TABLE IF NOT EXISTS reminder_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  trigger_type VARCHAR(50) NOT NULL CHECK (trigger_type IN ('before_appointment', 'after_appointment', 'no_visit', 'birthday')),
  trigger_timing INTEGER NOT NULL, -- Minutes before/after trigger
  template_id UUID REFERENCES message_templates(id),
  send_channels JSONB DEFAULT '["line"]',
  is_active BOOLEAN DEFAULT true,
  conditions JSONB DEFAULT '{}', -- Additional conditions
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sent Reminders (tracking)
CREATE TABLE IF NOT EXISTS sent_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  reminder_rule_id UUID REFERENCES reminder_rules(id) ON DELETE SET NULL,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  reservation_id UUID REFERENCES reservations(id) ON DELETE SET NULL,
  channel_type VARCHAR(20) NOT NULL,
  message_id UUID REFERENCES messages(id),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'sent'
);

-- Message Queue (for scheduled/retry messages)
CREATE TABLE IF NOT EXISTS message_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  reminder_rule_id UUID REFERENCES reminder_rules(id) ON DELETE CASCADE,
  channel_type VARCHAR(20) NOT NULL,
  priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
  scheduled_for TIMESTAMPTZ NOT NULL,
  content TEXT NOT NULL,
  subject VARCHAR(255),
  metadata JSONB DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'cancelled')),
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- Customer Segments
CREATE TABLE IF NOT EXISTS customer_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  segment_type VARCHAR(50) NOT NULL CHECK (segment_type IN ('static', 'dynamic')),
  conditions JSONB DEFAULT '{}', -- For dynamic segments
  customer_ids JSONB DEFAULT '[]', -- For static segments
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, name)
);

-- Delivery Logs
CREATE TABLE IF NOT EXISTS delivery_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  message_id UUID REFERENCES messages(id),
  channel_type VARCHAR(20) NOT NULL,
  provider VARCHAR(50), -- e.g., 'line', 'sendgrid', 'twilio'
  external_id VARCHAR(255), -- Provider's message ID
  status VARCHAR(20) NOT NULL,
  status_details JSONB DEFAULT '{}',
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_message_templates_tenant_category ON message_templates(tenant_id, category);
CREATE INDEX idx_customer_message_preferences_customer ON customer_message_preferences(customer_id);
CREATE INDEX idx_campaigns_tenant_status ON campaigns(tenant_id, status);
CREATE INDEX idx_campaigns_scheduled_at ON campaigns(scheduled_at) WHERE status = 'scheduled';
CREATE INDEX idx_campaign_messages_campaign ON campaign_messages(campaign_id);
CREATE INDEX idx_campaign_messages_customer ON campaign_messages(customer_id);
CREATE INDEX idx_reminder_rules_tenant_active ON reminder_rules(tenant_id, is_active);
CREATE INDEX idx_sent_reminders_customer ON sent_reminders(customer_id);
CREATE INDEX idx_message_queue_scheduled ON message_queue(scheduled_for, status) WHERE status = 'pending';
CREATE INDEX idx_message_queue_tenant_status ON message_queue(tenant_id, status);
CREATE INDEX idx_delivery_logs_message ON delivery_logs(message_id);

-- Enable RLS
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_message_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE sent_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage message templates" ON message_templates
  FOR ALL USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can manage customer preferences" ON customer_message_preferences
  FOR ALL USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can manage campaigns" ON campaigns
  FOR ALL USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can view campaign messages" ON campaign_messages
  FOR ALL USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can manage reminder rules" ON reminder_rules
  FOR ALL USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can view sent reminders" ON sent_reminders
  FOR ALL USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can manage message queue" ON message_queue
  FOR ALL USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can manage customer segments" ON customer_segments
  FOR ALL USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can view delivery logs" ON delivery_logs
  FOR ALL USING (tenant_id = get_user_tenant_id());

-- Update triggers
CREATE TRIGGER update_message_templates_updated_at BEFORE UPDATE ON message_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_customer_message_preferences_updated_at BEFORE UPDATE ON customer_message_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_reminder_rules_updated_at BEFORE UPDATE ON reminder_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_customer_segments_updated_at BEFORE UPDATE ON customer_segments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Default reminder templates
INSERT INTO message_templates (tenant_id, name, category, content, variables) 
SELECT 
  id as tenant_id,
  '1週間前リマインダー' as name,
  'reminder' as category,
  '{customer_name}様

来週{date} {time}にご予約をいただいております。

メニュー: {menu}
担当: {staff_name}

楽しみにお待ちしております！' as content,
  '["customer_name", "date", "time", "menu", "staff_name"]'::jsonb as variables
FROM tenants
ON CONFLICT (tenant_id, name) DO NOTHING;

INSERT INTO message_templates (tenant_id, name, category, content, variables) 
SELECT 
  id as tenant_id,
  '3日前リマインダー' as name,
  'reminder' as category,
  '{customer_name}様

{date} {time}のご予約まであと3日となりました。

変更等ございましたらお早めにご連絡ください。' as content,
  '["customer_name", "date", "time"]'::jsonb as variables
FROM tenants
ON CONFLICT (tenant_id, name) DO NOTHING;

INSERT INTO message_templates (tenant_id, name, category, content, variables) 
SELECT 
  id as tenant_id,
  '当日リマインダー' as name,
  'reminder' as category,
  '{customer_name}様

本日{time}にお待ちしております！

場所: {salon_address}
メニュー: {menu}

お気をつけてお越しください。' as content,
  '["customer_name", "time", "salon_address", "menu"]'::jsonb as variables
FROM tenants
ON CONFLICT (tenant_id, name) DO NOTHING;

INSERT INTO message_templates (tenant_id, name, category, content, variables) 
SELECT 
  id as tenant_id,
  '来店後お礼' as name,
  'reminder' as category,
  '{customer_name}様

本日はご来店いただきありがとうございました！

またのご来店を心よりお待ちしております。' as content,
  '["customer_name"]'::jsonb as variables
FROM tenants
ON CONFLICT (tenant_id, name) DO NOTHING;

-- Default reminder rules
INSERT INTO reminder_rules (tenant_id, name, trigger_type, trigger_timing, is_active)
SELECT 
  id as tenant_id,
  '1週間前リマインダー' as name,
  'before_appointment' as trigger_type,
  10080 as trigger_timing, -- 7 days in minutes
  true as is_active
FROM tenants
ON CONFLICT DO NOTHING;

INSERT INTO reminder_rules (tenant_id, name, trigger_type, trigger_timing, is_active)
SELECT 
  id as tenant_id,
  '3日前リマインダー' as name,
  'before_appointment' as trigger_type,
  4320 as trigger_timing, -- 3 days in minutes
  true as is_active
FROM tenants
ON CONFLICT DO NOTHING;

INSERT INTO reminder_rules (tenant_id, name, trigger_type, trigger_timing, is_active)
SELECT 
  id as tenant_id,
  '当日朝リマインダー' as name,
  'before_appointment' as trigger_type,
  480 as trigger_timing, -- 8 hours in minutes
  true as is_active
FROM tenants
ON CONFLICT DO NOTHING;

INSERT INTO reminder_rules (tenant_id, name, trigger_type, trigger_timing, is_active)
SELECT 
  id as tenant_id,
  '来店後お礼' as name,
  'after_appointment' as trigger_type,
  120 as trigger_timing, -- 2 hours after
  true as is_active
FROM tenants
ON CONFLICT DO NOTHING;

-- Default customer segments
INSERT INTO customer_segments (tenant_id, name, description, segment_type, conditions)
SELECT 
  id as tenant_id,
  '全顧客' as name,
  'すべての顧客' as description,
  'dynamic' as segment_type,
  '{"all": true}'::jsonb as conditions
FROM tenants
ON CONFLICT (tenant_id, name) DO NOTHING;

INSERT INTO customer_segments (tenant_id, name, description, segment_type, conditions)
SELECT 
  id as tenant_id,
  'VIP顧客' as name,
  '月2回以上来店する顧客' as description,
  'dynamic' as segment_type,
  '{"visit_frequency": {"operator": ">=", "value": 2, "period": "month"}}'::jsonb as conditions
FROM tenants
ON CONFLICT (tenant_id, name) DO NOTHING;

INSERT INTO customer_segments (tenant_id, name, description, segment_type, conditions)
SELECT 
  id as tenant_id,
  '新規顧客' as name,
  '初回来店から3ヶ月以内' as description,
  'dynamic' as segment_type,
  '{"first_visit": {"operator": "<=", "value": 90, "unit": "days"}}'::jsonb as conditions
FROM tenants
ON CONFLICT (tenant_id, name) DO NOTHING;

INSERT INTO customer_segments (tenant_id, name, description, segment_type, conditions)
SELECT 
  id as tenant_id,
  '休眠顧客' as name,
  '3ヶ月以上来店なし' as description,
  'dynamic' as segment_type,
  '{"last_visit": {"operator": ">=", "value": 90, "unit": "days"}}'::jsonb as conditions
FROM tenants
ON CONFLICT (tenant_id, name) DO NOTHING;