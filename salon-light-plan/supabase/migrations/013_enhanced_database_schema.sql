-- =====================================
-- ENHANCED DATABASE SCHEMA FOR SMS SALON MANAGEMENT SYSTEM
-- =====================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================
-- TREATMENT RECORDS (施術記録)
-- =====================================
CREATE TABLE IF NOT EXISTS treatment_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  reservation_id UUID REFERENCES reservations(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
  treatment_date DATE NOT NULL,
  service_names TEXT[] NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  total_duration INTEGER NOT NULL, -- 施術時間(分)
  customer_notes TEXT, -- 顧客向けメモ
  staff_notes TEXT, -- スタッフメモ
  skin_condition TEXT, -- 肌の状態
  hair_condition TEXT, -- 髪の状態
  satisfaction_rating INTEGER CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 5),
  next_visit_recommendation TEXT, -- 次回来店の推奨
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- =====================================
-- TREATMENT PHOTOS (施術写真)
-- =====================================
CREATE TABLE IF NOT EXISTS treatment_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  treatment_record_id UUID NOT NULL REFERENCES treatment_records(id) ON DELETE CASCADE,
  photo_type VARCHAR(20) NOT NULL CHECK (photo_type IN ('before', 'after', 'process')),
  file_url TEXT NOT NULL,
  file_name VARCHAR(255),
  file_size INTEGER,
  mime_type VARCHAR(100),
  description TEXT,
  taken_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  is_customer_viewable BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- =====================================
-- MENU CATEGORIES (メニューカテゴリ)
-- =====================================
CREATE TABLE IF NOT EXISTS menu_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(tenant_id, name)
);

-- =====================================
-- TREATMENT MENUS (施術メニュー)
-- Enhanced version of services table
-- =====================================
CREATE TABLE IF NOT EXISTS treatment_menus (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category_id UUID REFERENCES menu_categories(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  base_price DECIMAL(10, 2) NOT NULL,
  member_price DECIMAL(10, 2),
  duration_minutes INTEGER NOT NULL,
  display_order INTEGER DEFAULT 0,
  image_url TEXT,
  is_online_bookable BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  tags TEXT[],
  booking_count INTEGER DEFAULT 0,
  popularity_score DECIMAL(3, 2) DEFAULT 0.0,
  min_advance_booking_hours INTEGER DEFAULT 2,
  max_advance_booking_days INTEGER DEFAULT 30,
  preparation_notes TEXT,
  contraindications TEXT, -- 禁忌事項
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- =====================================
-- STAFF MENU ASSIGNMENTS (スタッフ・メニュー対応表)
-- =====================================
CREATE TABLE IF NOT EXISTS staff_menu_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  menu_id UUID NOT NULL REFERENCES treatment_menus(id) ON DELETE CASCADE,
  skill_level VARCHAR(20) NOT NULL DEFAULT 'intermediate' CHECK (skill_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
  can_perform BOOLEAN DEFAULT true,
  custom_duration_minutes INTEGER,
  commission_rate DECIMAL(5, 2), -- 歩合率(%)
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(staff_id, menu_id)
);

-- =====================================
-- NOTIFICATION SETTINGS (通知設定)
-- =====================================
CREATE TABLE IF NOT EXISTS notification_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) NOT NULL,
  trigger_event VARCHAR(50) NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  timing_value INTEGER DEFAULT 0,
  timing_unit VARCHAR(10) DEFAULT 'hours' CHECK (timing_unit IN ('minutes', 'hours', 'days')),
  message_template TEXT NOT NULL,
  channels TEXT[] DEFAULT ARRAY['line'],
  conditions JSONB DEFAULT '{}'::jsonb,
  priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(tenant_id, notification_type)
);

-- =====================================
-- NOTIFICATION_QUEUE (通知キュー)
-- =====================================
CREATE TABLE IF NOT EXISTS notification_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) NOT NULL,
  channel_type VARCHAR(20) NOT NULL,
  recipient_address VARCHAR(255) NOT NULL,
  subject VARCHAR(255),
  message_content TEXT NOT NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'cancelled')),
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  last_attempt_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- =====================================
-- AI_REPLY_SETTINGS (AI返信設定)
-- =====================================
CREATE TABLE IF NOT EXISTS ai_reply_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  is_enabled BOOLEAN DEFAULT false,
  auto_reply_enabled BOOLEAN DEFAULT false,
  business_context TEXT,
  tone_style VARCHAR(20) DEFAULT 'friendly' CHECK (tone_style IN ('formal', 'friendly', 'casual')),
  response_language VARCHAR(10) DEFAULT 'ja',
  max_suggestions INTEGER DEFAULT 3,
  confidence_threshold DECIMAL(3, 2) DEFAULT 0.7,
  blocked_keywords TEXT[],
  custom_prompts JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(tenant_id)
);

-- =====================================
-- AI_REPLY_HISTORY (AI返信履歴)
-- =====================================
CREATE TABLE IF NOT EXISTS ai_reply_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  original_message TEXT NOT NULL,
  suggested_replies JSONB NOT NULL, -- AI提案の配列
  selected_reply TEXT,
  is_sent BOOLEAN DEFAULT false,
  feedback_rating INTEGER CHECK (feedback_rating >= 1 AND feedback_rating <= 5),
  model_version VARCHAR(50),
  processing_time_ms INTEGER,
  confidence_score DECIMAL(3, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- =====================================
-- HOT_PEPPER_INTEGRATION (ホットペッパー連携)
-- =====================================
CREATE TABLE IF NOT EXISTS hot_pepper_integration (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  api_key VARCHAR(255),
  shop_id VARCHAR(100),
  is_active BOOLEAN DEFAULT false,
  sync_settings JSONB DEFAULT '{}'::jsonb,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_status VARCHAR(20) DEFAULT 'inactive' CHECK (sync_status IN ('inactive', 'syncing', 'success', 'error')),
  error_log TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(tenant_id)
);

-- =====================================
-- HOT_PEPPER_RESERVATIONS (ホットペッパー予約)
-- =====================================
CREATE TABLE IF NOT EXISTS hot_pepper_reservations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  reservation_id UUID REFERENCES reservations(id) ON DELETE SET NULL,
  hot_pepper_reservation_id VARCHAR(100) NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(20),
  service_name TEXT NOT NULL,
  reservation_date TIMESTAMP WITH TIME ZONE NOT NULL,
  price DECIMAL(10, 2),
  status VARCHAR(20) NOT NULL,
  sync_status VARCHAR(20) DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'error')),
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(tenant_id, hot_pepper_reservation_id)
);

-- =====================================
-- CUSTOMER_VISIT_HISTORY (来店履歴)
-- =====================================
CREATE TABLE IF NOT EXISTS customer_visit_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  visit_date DATE NOT NULL,
  services_received TEXT[] NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  payment_method VARCHAR(20),
  staff_members TEXT[],
  satisfaction_rating INTEGER CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 5),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(customer_id, visit_date)
);

-- =====================================
-- CUSTOMER_PREFERENCES (顧客の好み)
-- =====================================
CREATE TABLE IF NOT EXISTS customer_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  preferred_staff_ids UUID[],
  preferred_time_slots TIME[],
  preferred_days_of_week INTEGER[], -- 0:日曜 ~ 6:土曜
  favorite_services TEXT[],
  allergies TEXT[],
  skin_type VARCHAR(20),
  hair_type VARCHAR(20),
  special_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(customer_id)
);

-- =====================================
-- MARKETING_CAMPAIGNS (マーケティングキャンペーン)
-- =====================================
CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  campaign_type VARCHAR(30) NOT NULL CHECK (campaign_type IN ('new_customer', 'loyalty', 'seasonal', 'birthday', 'win_back')),
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
  start_date DATE NOT NULL,
  end_date DATE,
  target_criteria JSONB DEFAULT '{}'::jsonb,
  discount_type VARCHAR(20) CHECK (discount_type IN ('percentage', 'fixed_amount', 'free_service')),
  discount_value DECIMAL(10, 2),
  usage_limit INTEGER,
  usage_count INTEGER DEFAULT 0,
  channels TEXT[] DEFAULT ARRAY['line'],
  message_template TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- =====================================
-- ADDITIONAL INDEXES
-- =====================================
CREATE INDEX IF NOT EXISTS idx_treatment_records_tenant_id ON treatment_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_treatment_records_customer_id ON treatment_records(customer_id);
CREATE INDEX IF NOT EXISTS idx_treatment_records_date ON treatment_records(treatment_date);
CREATE INDEX IF NOT EXISTS idx_treatment_photos_record_id ON treatment_photos(treatment_record_id);
CREATE INDEX IF NOT EXISTS idx_treatment_menus_tenant_id ON treatment_menus(tenant_id);
CREATE INDEX IF NOT EXISTS idx_treatment_menus_category_id ON treatment_menus(category_id);
CREATE INDEX IF NOT EXISTS idx_notification_queue_scheduled_at ON notification_queue(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_notification_queue_status ON notification_queue(status);
CREATE INDEX IF NOT EXISTS idx_customer_channels_customer_id ON customer_channels(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_channels_channel_type ON customer_channels(channel_type);
CREATE INDEX IF NOT EXISTS idx_hot_pepper_reservations_date ON hot_pepper_reservations(reservation_date);

-- =====================================
-- ADDITIONAL TRIGGERS
-- =====================================

-- Treatment records updated_at trigger
CREATE TRIGGER update_treatment_records_updated_at BEFORE UPDATE ON treatment_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Menu categories updated_at trigger
CREATE TRIGGER update_menu_categories_updated_at BEFORE UPDATE ON menu_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Treatment menus updated_at trigger
CREATE TRIGGER update_treatment_menus_updated_at BEFORE UPDATE ON treatment_menus
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Staff menu assignments updated_at trigger
CREATE TRIGGER update_staff_menu_assignments_updated_at BEFORE UPDATE ON staff_menu_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Notification settings updated_at trigger
CREATE TRIGGER update_notification_settings_updated_at BEFORE UPDATE ON notification_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Notification queue updated_at trigger
CREATE TRIGGER update_notification_queue_updated_at BEFORE UPDATE ON notification_queue
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- AI reply settings updated_at trigger
CREATE TRIGGER update_ai_reply_settings_updated_at BEFORE UPDATE ON ai_reply_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- AI reply history updated_at trigger
CREATE TRIGGER update_ai_reply_history_updated_at BEFORE UPDATE ON ai_reply_history
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Hot pepper integration updated_at trigger
CREATE TRIGGER update_hot_pepper_integration_updated_at BEFORE UPDATE ON hot_pepper_integration
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Hot pepper reservations updated_at trigger
CREATE TRIGGER update_hot_pepper_reservations_updated_at BEFORE UPDATE ON hot_pepper_reservations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Customer preferences updated_at trigger
CREATE TRIGGER update_customer_preferences_updated_at BEFORE UPDATE ON customer_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Marketing campaigns updated_at trigger
CREATE TRIGGER update_marketing_campaigns_updated_at BEFORE UPDATE ON marketing_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================
-- UTILITY FUNCTIONS
-- =====================================

-- Function to update customer visit count and last visit date
CREATE OR REPLACE FUNCTION update_customer_visit_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE customers 
    SET 
      visit_count = visit_count + 1,
      last_visit_date = NEW.treatment_date,
      total_spent = total_spent + NEW.total_price,
      updated_at = TIMEZONE('utc', NOW())
    WHERE id = NEW.customer_id;
    
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- If treatment date changed, update customer stats
    IF OLD.treatment_date != NEW.treatment_date OR OLD.total_price != NEW.total_price THEN
      -- Recalculate customer stats
      WITH stats AS (
        SELECT 
          COUNT(*) as visit_count,
          MAX(treatment_date) as last_visit_date,
          SUM(total_price) as total_spent
        FROM treatment_records 
        WHERE customer_id = NEW.customer_id AND is_completed = true
      )
      UPDATE customers 
      SET 
        visit_count = stats.visit_count,
        last_visit_date = stats.last_visit_date,
        total_spent = stats.total_spent,
        updated_at = TIMEZONE('utc', NOW())
      FROM stats
      WHERE id = NEW.customer_id;
    END IF;
    
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Recalculate customer stats when record is deleted
    WITH stats AS (
      SELECT 
        COUNT(*) as visit_count,
        MAX(treatment_date) as last_visit_date,
        COALESCE(SUM(total_price), 0) as total_spent
      FROM treatment_records 
      WHERE customer_id = OLD.customer_id AND is_completed = true
    )
    UPDATE customers 
    SET 
      visit_count = stats.visit_count,
      last_visit_date = stats.last_visit_date,
      total_spent = stats.total_spent,
      updated_at = TIMEZONE('utc', NOW())
    FROM stats
    WHERE id = OLD.customer_id;
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update customer stats when treatment records change
CREATE TRIGGER update_customer_stats_trigger
  AFTER INSERT OR UPDATE OF treatment_date, total_price, is_completed OR DELETE
  ON treatment_records
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_visit_stats();

-- Function to update menu popularity
CREATE OR REPLACE FUNCTION update_menu_popularity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- Update booking count for each service in the treatment
    UPDATE treatment_menus 
    SET 
      booking_count = booking_count + 1,
      popularity_score = LEAST(5.0, booking_count / 10.0),
      updated_at = TIMEZONE('utc', NOW())
    WHERE name = ANY(NEW.service_names) AND tenant_id = NEW.tenant_id;
    
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update menu popularity when treatment records are created/updated
CREATE TRIGGER update_menu_popularity_trigger
  AFTER INSERT OR UPDATE OF service_names
  ON treatment_records
  FOR EACH ROW
  EXECUTE FUNCTION update_menu_popularity();

-- =====================================
-- SECURITY POLICIES (RLS)
-- =====================================

-- Enable RLS on all new tables
ALTER TABLE treatment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatment_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatment_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_menu_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_reply_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_reply_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE hot_pepper_integration ENABLE ROW LEVEL SECURITY;
ALTER TABLE hot_pepper_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_visit_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;

-- Create policies for tenant isolation
CREATE POLICY tenant_treatment_records_policy ON treatment_records
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY tenant_treatment_photos_policy ON treatment_photos
  FOR ALL USING (
    treatment_record_id IN (
      SELECT tr.id FROM treatment_records tr
      JOIN users u ON tr.tenant_id = u.tenant_id
      WHERE u.id = auth.uid()
    )
  );

CREATE POLICY tenant_menu_categories_policy ON menu_categories
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY tenant_treatment_menus_policy ON treatment_menus
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY tenant_staff_menu_assignments_policy ON staff_menu_assignments
  FOR ALL USING (
    staff_id IN (
      SELECT s.id FROM staff s
      JOIN users u ON s.tenant_id = u.tenant_id
      WHERE u.id = auth.uid()
    )
  );

CREATE POLICY tenant_notification_settings_policy ON notification_settings
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY tenant_notification_queue_policy ON notification_queue
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY tenant_ai_reply_settings_policy ON ai_reply_settings
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY tenant_ai_reply_history_policy ON ai_reply_history
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY tenant_hot_pepper_integration_policy ON hot_pepper_integration
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY tenant_hot_pepper_reservations_policy ON hot_pepper_reservations
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY tenant_customer_visit_history_policy ON customer_visit_history
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY tenant_customer_preferences_policy ON customer_preferences
  FOR ALL USING (
    customer_id IN (
      SELECT c.id FROM customers c
      JOIN users u ON c.tenant_id = u.tenant_id
      WHERE u.id = auth.uid()
    )
  );

CREATE POLICY tenant_marketing_campaigns_policy ON marketing_campaigns
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );