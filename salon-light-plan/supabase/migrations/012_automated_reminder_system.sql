-- =====================================
-- 自動リマインダーシステム - データベーススキーマ
-- =====================================

-- リマインダー設定テーブル（拡張版）
CREATE TABLE IF NOT EXISTS reminder_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  reminder_type VARCHAR(50) NOT NULL,
  label VARCHAR(255) NOT NULL,
  description TEXT,
  is_enabled BOOLEAN DEFAULT true,
  timing_value INTEGER NOT NULL, -- 7, 3, 1 (日数)
  timing_unit VARCHAR(10) DEFAULT 'days', -- days, hours, weeks
  message_template TEXT NOT NULL,
  send_via_channels VARCHAR(20)[] DEFAULT ARRAY['line'],
  delivery_rules JSONB DEFAULT '{}'::jsonb, -- 営業時間、休業日考慮など
  customer_filters JSONB DEFAULT '{}'::jsonb, -- 顧客タイプ、価格帯など
  priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  retry_config JSONB DEFAULT '{"max_retries": 3, "retry_interval_hours": 2}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, reminder_type)
);

-- 送信済みリマインダーテーブル（拡張版）
CREATE TABLE IF NOT EXISTS sent_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  reservation_id UUID REFERENCES reservations(id) ON DELETE CASCADE,
  reminder_type VARCHAR(50) NOT NULL,
  channel_type VARCHAR(20) NOT NULL,
  message_content TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  delivery_status VARCHAR(20) DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'failed', 'cancelled')),
  delivery_details JSONB DEFAULT '{}'::jsonb,
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  action_taken VARCHAR(50), -- confirmed, rescheduled, cancelled, no_action
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- リマインダースケジュールテーブル
CREATE TABLE IF NOT EXISTS reminder_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  reservation_id UUID REFERENCES reservations(id) ON DELETE CASCADE,
  reminder_type VARCHAR(50) NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'processing', 'sent', 'failed', 'cancelled')),
  priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- リマインダー効果測定テーブル
CREATE TABLE IF NOT EXISTS reminder_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  reminder_id UUID REFERENCES sent_reminders(id) ON DELETE CASCADE,
  reservation_id UUID REFERENCES reservations(id) ON DELETE CASCADE,
  reminder_type VARCHAR(50) NOT NULL,
  effectiveness_score DECIMAL(3,2), -- 0.00-1.00
  business_impact JSONB DEFAULT '{}'::jsonb, -- no_show_prevented, revenue_saved, etc.
  customer_response VARCHAR(50),
  response_time_hours INTEGER,
  satisfaction_rating INTEGER CHECK (satisfaction_rating BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  date DATE DEFAULT CURRENT_DATE
);

-- リマインダーテンプレートテーブル
CREATE TABLE IF NOT EXISTS reminder_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  reminder_type VARCHAR(50) NOT NULL,
  category VARCHAR(50), -- standard, seasonal, promotional, etc.
  template_content TEXT NOT NULL,
  channel_type VARCHAR(20) NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb, -- available variables
  conditions JSONB DEFAULT '{}'::jsonb, -- when to use this template
  usage_count INTEGER DEFAULT 0,
  effectiveness_rating DECIMAL(3,2) DEFAULT 0.00,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 自動リマインダージョブテーブル
CREATE TABLE IF NOT EXISTS reminder_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  job_type VARCHAR(50) NOT NULL, -- scheduler, sender, analyzer
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  schedule_expression VARCHAR(100), -- cron expression
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  run_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- リマインダー配信ログテーブル
CREATE TABLE IF NOT EXISTS reminder_delivery_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  reminder_id UUID REFERENCES sent_reminders(id) ON DELETE CASCADE,
  channel_type VARCHAR(20) NOT NULL,
  attempt_number INTEGER DEFAULT 1,
  delivery_status VARCHAR(20) NOT NULL,
  response_data JSONB DEFAULT '{}'::jsonb,
  error_details TEXT,
  processing_time_ms INTEGER,
  delivered_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_reminder_settings_tenant_type ON reminder_settings(tenant_id, reminder_type);
CREATE INDEX IF NOT EXISTS idx_sent_reminders_tenant_scheduled ON sent_reminders(tenant_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_sent_reminders_status ON sent_reminders(delivery_status);
CREATE INDEX IF NOT EXISTS idx_reminder_schedules_scheduled_at ON reminder_schedules(scheduled_at, status);
CREATE INDEX IF NOT EXISTS idx_reminder_analytics_tenant_date ON reminder_analytics(tenant_id, date);
CREATE INDEX IF NOT EXISTS idx_reminder_templates_tenant_type ON reminder_templates(tenant_id, reminder_type, is_active);
CREATE INDEX IF NOT EXISTS idx_reminder_jobs_next_run ON reminder_jobs(next_run_at, status);

-- トリガー作成（updated_at自動更新）
CREATE TRIGGER update_reminder_settings_updated_at BEFORE UPDATE ON reminder_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_sent_reminders_updated_at BEFORE UPDATE ON sent_reminders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_reminder_schedules_updated_at BEFORE UPDATE ON reminder_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_reminder_templates_updated_at BEFORE UPDATE ON reminder_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_reminder_jobs_updated_at BEFORE UPDATE ON reminder_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS有効化
ALTER TABLE reminder_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sent_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_delivery_logs ENABLE ROW LEVEL SECURITY;

-- RLSポリシー
CREATE POLICY "Users can manage same tenant reminder settings" ON reminder_settings
  FOR ALL USING (tenant_id = get_user_tenant_id());
CREATE POLICY "Users can manage same tenant sent reminders" ON sent_reminders
  FOR ALL USING (tenant_id = get_user_tenant_id());
CREATE POLICY "Users can manage same tenant reminder schedules" ON reminder_schedules
  FOR ALL USING (tenant_id = get_user_tenant_id());
CREATE POLICY "Users can view same tenant reminder analytics" ON reminder_analytics
  FOR SELECT USING (tenant_id = get_user_tenant_id());
CREATE POLICY "Users can manage same tenant reminder templates" ON reminder_templates
  FOR ALL USING (tenant_id = get_user_tenant_id());
CREATE POLICY "Users can view same tenant reminder jobs" ON reminder_jobs
  FOR SELECT USING (tenant_id = get_user_tenant_id());
CREATE POLICY "Users can view same tenant delivery logs" ON reminder_delivery_logs
  FOR SELECT USING (tenant_id = get_user_tenant_id());

-- デフォルトリマインダー設定を挿入
INSERT INTO reminder_settings (tenant_id, reminder_type, label, description, timing_value, message_template, send_via_channels, delivery_rules, priority)
SELECT 
  t.id,
  'pre_visit_7days',
  '1週間前リマインダー',
  '予約の1週間前に送信される確認メッセージ',
  7,
  '{customer_name}様

来週{date} {time}にご予約をいただいております✨

メニュー: {menu}
所要時間: {duration}

楽しみにお待ちしております！
ご不明な点がございましたらお気軽にご連絡ください。',
  ARRAY['line'],
  '{"business_hours_only": true, "skip_holidays": true, "preferred_time": "10:00"}'::jsonb,
  'medium'
FROM tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM reminder_settings rs 
  WHERE rs.tenant_id = t.id AND rs.reminder_type = 'pre_visit_7days'
);

INSERT INTO reminder_settings (tenant_id, reminder_type, label, description, timing_value, message_template, send_via_channels, delivery_rules, priority)
SELECT 
  t.id,
  'pre_visit_3days',
  '3日前リマインダー',
  '予約の3日前に送信される詳細確認メッセージ',
  3,
  '{customer_name}様

{date} {time}のご予約まであと3日となりました。

【ご予約内容】
メニュー: {menu}
担当: {staff_name}

変更等ございましたらお早めにご連絡ください。
お会いできるのを楽しみにしています😊',
  ARRAY['line'],
  '{"business_hours_only": true, "skip_holidays": true, "preferred_time": "19:00"}'::jsonb,
  'high'
FROM tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM reminder_settings rs 
  WHERE rs.tenant_id = t.id AND rs.reminder_type = 'pre_visit_3days'
);

INSERT INTO reminder_settings (tenant_id, reminder_type, label, description, timing_value, message_template, send_via_channels, delivery_rules, priority)
SELECT 
  t.id,
  'post_visit_24hours',
  '来店後翌日フォローアップ',
  '来店翌日に送信されるアフターケアメッセージ',
  1,
  '{customer_name}様

昨日はご来店いただきありがとうございました💕

仕上がりはいかがでしょうか？
スタイリングで困ったことがあれば、お気軽にメッセージください。

またのご来店を心よりお待ちしております！',
  ARRAY['line'],
  '{"business_hours_only": true, "skip_holidays": false, "preferred_time": "11:00"}'::jsonb,
  'medium'
FROM tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM reminder_settings rs 
  WHERE rs.tenant_id = t.id AND rs.reminder_type = 'post_visit_24hours'
);

-- リマインダー処理のためのストアドプロシージャ
CREATE OR REPLACE FUNCTION schedule_reminder_for_reservation(
  p_tenant_id UUID,
  p_reservation_id UUID
) RETURNS VOID AS $$
DECLARE
  reservation_record RECORD;
  setting_record RECORD;
  scheduled_time TIMESTAMPTZ;
BEGIN
  -- 予約情報を取得
  SELECT * INTO reservation_record
  FROM reservations 
  WHERE id = p_reservation_id AND tenant_id = p_tenant_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- 有効なリマインダー設定を取得してスケジュール作成
  FOR setting_record IN 
    SELECT * FROM reminder_settings 
    WHERE tenant_id = p_tenant_id AND is_enabled = true
  LOOP
    -- スケジュール時間を計算
    IF setting_record.reminder_type LIKE 'pre_visit_%' THEN
      scheduled_time = reservation_record.start_time - 
        (setting_record.timing_value || ' ' || setting_record.timing_unit)::INTERVAL;
    ELSIF setting_record.reminder_type LIKE 'post_visit_%' THEN
      scheduled_time = reservation_record.end_time + 
        (setting_record.timing_value || ' ' || setting_record.timing_unit)::INTERVAL;
    END IF;
    
    -- 営業時間内に調整
    IF (setting_record.delivery_rules->>'business_hours_only')::boolean = true THEN
      -- 平日9-18時に調整（簡略化）
      scheduled_time = date_trunc('day', scheduled_time) + 
        COALESCE((setting_record.delivery_rules->>'preferred_time')::text, '10:00')::time;
    END IF;
    
    -- スケジュールに追加
    INSERT INTO reminder_schedules (
      tenant_id, customer_id, reservation_id, reminder_type, 
      scheduled_at, priority, metadata
    ) VALUES (
      p_tenant_id, 
      reservation_record.customer_id, 
      p_reservation_id, 
      setting_record.reminder_type,
      scheduled_time,
      setting_record.priority,
      jsonb_build_object(
        'setting_id', setting_record.id,
        'channels', setting_record.send_via_channels,
        'template', setting_record.message_template
      )
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 予約作成時の自動トリガー
CREATE OR REPLACE FUNCTION auto_schedule_reminders()
RETURNS TRIGGER AS $$
BEGIN
  -- 新規予約または確定状態に変更された場合
  IF (TG_OP = 'INSERT' AND NEW.status = 'confirmed') OR
     (TG_OP = 'UPDATE' AND OLD.status != 'confirmed' AND NEW.status = 'confirmed') THEN
    PERFORM schedule_reminder_for_reservation(NEW.tenant_id, NEW.id);
  END IF;
  
  -- 予約がキャンセルされた場合はスケジュールを削除
  IF TG_OP = 'UPDATE' AND NEW.status = 'cancelled' THEN
    UPDATE reminder_schedules 
    SET status = 'cancelled' 
    WHERE reservation_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガーを予約テーブルに追加
CREATE TRIGGER auto_schedule_reminders_trigger
  AFTER INSERT OR UPDATE ON reservations
  FOR EACH ROW EXECUTE FUNCTION auto_schedule_reminders();