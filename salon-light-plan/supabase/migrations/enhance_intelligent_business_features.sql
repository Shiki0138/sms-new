-- =====================================
-- Intelligent Business Features Enhancement
-- Enhanced bulk messaging & reminder system with business intelligence
-- =====================================

-- Add intelligent reminders table
CREATE TABLE IF NOT EXISTS intelligent_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  reservation_id UUID REFERENCES reservations(id) ON DELETE SET NULL,
  reminder_type VARCHAR(50) NOT NULL CHECK (reminder_type IN (
    'pre_visit_confirmation',
    'service_maintenance_due',
    'weather_based_promotion',
    'no_show_recovery',
    'post_visit_satisfaction',
    'upsell_opportunity',
    'retention_risk_alert',
    'seasonal_service_reminder',
    'birthday_special',
    'anniversary_celebration',
    'referral_request',
    'loyalty_milestone'
  )),
  trigger_condition JSONB NOT NULL,
  personalization_data JSONB NOT NULL,
  optimal_send_time TIMESTAMPTZ NOT NULL,
  channel_priority JSONB NOT NULL,
  content_template_id VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'sent', 'failed', 'cancelled')),
  effectiveness_score DECIMAL(3,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  scheduled_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for intelligent reminders
CREATE INDEX idx_intelligent_reminders_tenant_customer ON intelligent_reminders(tenant_id, customer_id);
CREATE INDEX idx_intelligent_reminders_scheduled_at ON intelligent_reminders(scheduled_at);
CREATE INDEX idx_intelligent_reminders_status ON intelligent_reminders(status);
CREATE INDEX idx_intelligent_reminders_type ON intelligent_reminders(reminder_type);

-- Enhanced bulk messages table with A/B testing and advanced analytics
ALTER TABLE bulk_messages ADD COLUMN IF NOT EXISTS campaign_goal VARCHAR(50) CHECK (campaign_goal IN (
  'increase_bookings',
  'reduce_no_shows', 
  'customer_retention',
  'increase_revenue',
  'referrals'
));
ALTER TABLE bulk_messages ADD COLUMN IF NOT EXISTS exclude_segments TEXT[];
ALTER TABLE bulk_messages ADD COLUMN IF NOT EXISTS ab_test_enabled BOOLEAN DEFAULT false;
ALTER TABLE bulk_messages ADD COLUMN IF NOT EXISTS ab_variants JSONB;
ALTER TABLE bulk_messages ADD COLUMN IF NOT EXISTS optimal_send_time BOOLEAN DEFAULT false;
ALTER TABLE bulk_messages ADD COLUMN IF NOT EXISTS performance_metrics JSONB;

-- Customer journey events tracking
CREATE TABLE IF NOT EXISTS customer_journey_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
    'message_sent',
    'message_opened',
    'message_clicked',
    'booking_made',
    'service_completed',
    'campaign_interaction',
    'website_visit',
    'social_engagement'
  )),
  event_source VARCHAR(50) NOT NULL,
  event_data JSONB,
  campaign_id UUID REFERENCES bulk_messages(id) ON DELETE SET NULL,
  reservation_id UUID REFERENCES reservations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for journey tracking
CREATE INDEX idx_customer_journey_tenant_customer ON customer_journey_events(tenant_id, customer_id);
CREATE INDEX idx_customer_journey_event_type ON customer_journey_events(event_type);
CREATE INDEX idx_customer_journey_created_at ON customer_journey_events(created_at);
CREATE INDEX idx_customer_journey_campaign ON customer_journey_events(campaign_id);

-- Customer touchpoints for attribution modeling
CREATE TABLE IF NOT EXISTS customer_touchpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  touchpoint_type VARCHAR(50) NOT NULL,
  channel VARCHAR(20) NOT NULL,
  campaign_id UUID REFERENCES bulk_messages(id) ON DELETE SET NULL,
  touchpoint_data JSONB,
  attribution_score DECIMAL(5,4) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for touchpoints
CREATE INDEX idx_customer_touchpoints_tenant_customer ON customer_touchpoints(tenant_id, customer_id);
CREATE INDEX idx_customer_touchpoints_campaign ON customer_touchpoints(campaign_id);
CREATE INDEX idx_customer_touchpoints_created_at ON customer_touchpoints(created_at);

-- Campaign performance tracking
CREATE TABLE IF NOT EXISTS campaign_performance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES bulk_messages(id) ON DELETE CASCADE,
  metric_type VARCHAR(50) NOT NULL,
  metric_value DECIMAL(10,4),
  measurement_time TIMESTAMPTZ DEFAULT NOW(),
  additional_data JSONB
);

-- Add indexes for performance logs
CREATE INDEX idx_campaign_performance_tenant_campaign ON campaign_performance_logs(tenant_id, campaign_id);
CREATE INDEX idx_campaign_performance_metric_type ON campaign_performance_logs(metric_type);
CREATE INDEX idx_campaign_performance_time ON campaign_performance_logs(measurement_time);

-- Revenue attribution tracking
CREATE TABLE IF NOT EXISTS revenue_attributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES bulk_messages(id) ON DELETE SET NULL,
  touchpoint_id UUID REFERENCES customer_touchpoints(id) ON DELETE SET NULL,
  attribution_type VARCHAR(50) NOT NULL CHECK (attribution_type IN (
    'first_touch',
    'last_touch',
    'linear',
    'time_decay',
    'data_driven'
  )),
  attribution_weight DECIMAL(5,4) NOT NULL DEFAULT 1.0,
  revenue_amount DECIMAL(10,2) NOT NULL,
  attribution_confidence DECIMAL(3,2) DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for revenue attribution
CREATE INDEX idx_revenue_attributions_tenant ON revenue_attributions(tenant_id);
CREATE INDEX idx_revenue_attributions_campaign ON revenue_attributions(campaign_id);
CREATE INDEX idx_revenue_attributions_reservation ON revenue_attributions(reservation_id);

-- Reminder responses tracking
CREATE TABLE IF NOT EXISTS reminder_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  reminder_id UUID NOT NULL REFERENCES intelligent_reminders(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  response_type VARCHAR(50) NOT NULL CHECK (response_type IN (
    'opened',
    'clicked',
    'replied',
    'booked',
    'ignored',
    'unsubscribed'
  )),
  response_time TIMESTAMPTZ DEFAULT NOW(),
  response_content TEXT,
  booking_created BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for reminder responses
CREATE INDEX idx_reminder_responses_reminder ON reminder_responses(reminder_id);
CREATE INDEX idx_reminder_responses_customer ON reminder_responses(customer_id);
CREATE INDEX idx_reminder_responses_type ON reminder_responses(response_type);

-- Campaign booking attributions
CREATE TABLE IF NOT EXISTS campaign_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES bulk_messages(id) ON DELETE CASCADE,
  reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  attribution_method VARCHAR(50) NOT NULL DEFAULT 'direct',
  conversion_time_hours INTEGER,
  revenue DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for campaign bookings
CREATE INDEX idx_campaign_bookings_campaign ON campaign_bookings(campaign_id);
CREATE INDEX idx_campaign_bookings_tenant ON campaign_bookings(tenant_id);
CREATE INDEX idx_campaign_bookings_created_at ON campaign_bookings(created_at);

-- Customer segments analysis cache
CREATE TABLE IF NOT EXISTS customer_segment_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  segment_type VARCHAR(100) NOT NULL,
  customer_ids UUID[] NOT NULL,
  segment_criteria JSONB NOT NULL,
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours'
);

-- Add indexes for segment cache
CREATE INDEX idx_customer_segment_cache_tenant ON customer_segment_cache(tenant_id);
CREATE INDEX idx_customer_segment_cache_type ON customer_segment_cache(segment_type);
CREATE INDEX idx_customer_segment_cache_expires ON customer_segment_cache(expires_at);

-- Business intelligence insights cache
CREATE TABLE IF NOT EXISTS business_insights_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  insight_type VARCHAR(100) NOT NULL,
  insight_data JSONB NOT NULL,
  confidence_score DECIMAL(3,2) DEFAULT 1.0,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '6 hours'
);

-- Add indexes for insights cache
CREATE INDEX idx_business_insights_cache_tenant ON business_insights_cache(tenant_id);
CREATE INDEX idx_business_insights_cache_type ON business_insights_cache(insight_type);
CREATE INDEX idx_business_insights_cache_expires ON business_insights_cache(expires_at);

-- Weather data for weather-based promotions
CREATE TABLE IF NOT EXISTS weather_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location VARCHAR(100) NOT NULL DEFAULT 'Tokyo',
  weather_condition VARCHAR(50) NOT NULL,
  temperature DECIMAL(4,1),
  humidity INTEGER,
  precipitation_probability INTEGER,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for weather data
CREATE INDEX idx_weather_data_location ON weather_data(location);
CREATE INDEX idx_weather_data_recorded_at ON weather_data(recorded_at);
CREATE INDEX idx_weather_data_condition ON weather_data(weather_condition);

-- Enhanced customer channels with performance tracking
ALTER TABLE customer_channels ADD COLUMN IF NOT EXISTS is_preferred BOOLEAN DEFAULT false;
ALTER TABLE customer_channels ADD COLUMN IF NOT EXISTS engagement_score DECIMAL(3,2) DEFAULT 0;
ALTER TABLE customer_channels ADD COLUMN IF NOT EXISTS last_engaged_at TIMESTAMPTZ;
ALTER TABLE customer_channels ADD COLUMN IF NOT EXISTS response_rate DECIMAL(3,2) DEFAULT 0;

-- Add acquisition campaign tracking to customers
ALTER TABLE customers ADD COLUMN IF NOT EXISTS acquisition_campaign_id UUID REFERENCES bulk_messages(id) ON DELETE SET NULL;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS preferred_name VARCHAR(255);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS communication_style VARCHAR(20) DEFAULT 'friendly' CHECK (communication_style IN ('formal', 'casual', 'friendly'));
ALTER TABLE customers ADD COLUMN IF NOT EXISTS churn_risk_score DECIMAL(3,2) DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS predicted_ltv DECIMAL(10,2);

-- Enhanced reservations with campaign attribution
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES bulk_messages(id) ON DELETE SET NULL;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS reminder_id UUID REFERENCES intelligent_reminders(id) ON DELETE SET NULL;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS weather_condition VARCHAR(50);
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS booking_channel VARCHAR(50) DEFAULT 'direct';

-- Message logs enhancement for tracking
ALTER TABLE bulk_message_logs ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ;
ALTER TABLE bulk_message_logs ADD COLUMN IF NOT EXISTS clicked_at TIMESTAMPTZ;
ALTER TABLE bulk_message_logs ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
ALTER TABLE bulk_message_logs ADD COLUMN IF NOT EXISTS bounce_reason TEXT;

-- Functions for intelligent features

-- Function to update customer engagement scores
CREATE OR REPLACE FUNCTION update_customer_engagement_score()
RETURNS TRIGGER AS $$
BEGIN
  -- Update engagement score based on message interactions
  UPDATE customer_channels 
  SET 
    engagement_score = COALESCE(
      (SELECT AVG(
        CASE 
          WHEN opened_at IS NOT NULL THEN 1.0
          WHEN clicked_at IS NOT NULL THEN 1.5
          ELSE 0.0
        END
      ) FROM bulk_message_logs 
      WHERE customer_id = NEW.customer_id 
        AND channel_used = (SELECT channel_type FROM customer_channels WHERE id = NEW.channel_id)
        AND created_at >= NOW() - INTERVAL '30 days'
      ), 0
    ),
    last_engaged_at = CASE 
      WHEN NEW.opened_at IS NOT NULL OR NEW.clicked_at IS NOT NULL 
      THEN NOW() 
      ELSE last_engaged_at 
    END
  WHERE customer_id = NEW.customer_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updating engagement scores
DROP TRIGGER IF EXISTS trigger_update_engagement_score ON bulk_message_logs;
CREATE TRIGGER trigger_update_engagement_score
  AFTER INSERT OR UPDATE ON bulk_message_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_engagement_score();

-- Function to calculate customer churn risk
CREATE OR REPLACE FUNCTION calculate_customer_churn_risk()
RETURNS TRIGGER AS $$
DECLARE
  days_since_last_visit INTEGER;
  avg_visit_frequency DECIMAL;
  engagement_score DECIMAL;
  churn_score DECIMAL DEFAULT 0;
BEGIN
  -- Calculate days since last visit
  days_since_last_visit := COALESCE(
    EXTRACT(DAYS FROM NOW() - NEW.last_visit_date), 999
  );
  
  -- Calculate average visit frequency
  avg_visit_frequency := CASE 
    WHEN NEW.visit_count > 1 AND NEW.last_visit_date IS NOT NULL 
    THEN EXTRACT(DAYS FROM NEW.last_visit_date - NEW.created_at) / GREATEST(NEW.visit_count - 1, 1)
    ELSE 60 
  END;
  
  -- Get average engagement score
  engagement_score := COALESCE(
    (SELECT AVG(engagement_score) 
     FROM customer_channels 
     WHERE customer_id = NEW.id AND is_active = true), 0
  );
  
  -- Calculate churn risk score (0-1)
  churn_score := LEAST(1.0, GREATEST(0.0, 
    (days_since_last_visit / (avg_visit_frequency * 1.5)) * 0.6 +
    (1.0 - engagement_score) * 0.4
  ));
  
  -- Update churn risk score
  NEW.churn_risk_score := churn_score;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for calculating churn risk
DROP TRIGGER IF EXISTS trigger_calculate_churn_risk ON customers;
CREATE TRIGGER trigger_calculate_churn_risk
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION calculate_customer_churn_risk();

-- Function to automatically schedule intelligent reminders
CREATE OR REPLACE FUNCTION schedule_intelligent_reminders()
RETURNS VOID AS $$
DECLARE
  customer_record RECORD;
  reminder_record RECORD;
BEGIN
  -- Schedule service maintenance reminders
  FOR customer_record IN 
    SELECT c.*, r.menu_content, r.end_time as last_service_date
    FROM customers c
    JOIN reservations r ON c.id = r.customer_id
    WHERE r.status = 'COMPLETED'
      AND r.end_time >= NOW() - INTERVAL '60 days'
      AND NOT EXISTS (
        SELECT 1 FROM intelligent_reminders ir 
        WHERE ir.customer_id = c.id 
          AND ir.reminder_type = 'service_maintenance_due'
          AND ir.status IN ('scheduled', 'sent')
          AND ir.created_at >= NOW() - INTERVAL '30 days'
      )
  LOOP
    -- Insert color maintenance reminders
    IF customer_record.menu_content ILIKE '%カラー%' THEN
      INSERT INTO intelligent_reminders (
        tenant_id, customer_id, reminder_type,
        trigger_condition, personalization_data, 
        optimal_send_time, channel_priority, content_template_id,
        scheduled_at
      ) VALUES (
        customer_record.tenant_id,
        customer_record.id,
        'service_maintenance_due',
        '{"trigger_type": "time_based", "conditions": {"days_after_visit": 35}}'::jsonb,
        json_build_object(
          'customer_name', customer_record.name,
          'last_service', customer_record.menu_content,
          'last_visit_date', customer_record.last_service_date,
          'communication_style', COALESCE(customer_record.communication_style, 'friendly')
        )::jsonb,
        customer_record.last_service_date + INTERVAL '35 days' + INTERVAL '11 hours',
        '[{"channel": "line", "priority": 1, "effectiveness_score": 0.75}]'::jsonb,
        'color_maintenance_intelligent',
        customer_record.last_service_date + INTERVAL '35 days' + INTERVAL '11 hours'
      );
    END IF;
  END LOOP;
  
  -- Schedule loyalty milestone reminders
  FOR customer_record IN
    SELECT * FROM customers 
    WHERE visit_count % 10 = 0 
      AND visit_count >= 10
      AND NOT EXISTS (
        SELECT 1 FROM intelligent_reminders ir 
        WHERE ir.customer_id = customers.id 
          AND ir.reminder_type = 'loyalty_milestone'
          AND ir.status IN ('scheduled', 'sent')
          AND ir.created_at >= NOW() - INTERVAL '7 days'
      )
  LOOP
    INSERT INTO intelligent_reminders (
      tenant_id, customer_id, reminder_type,
      trigger_condition, personalization_data,
      optimal_send_time, channel_priority, content_template_id,
      scheduled_at
    ) VALUES (
      customer_record.tenant_id,
      customer_record.id,
      'loyalty_milestone',
      '{"trigger_type": "milestone_based", "conditions": {"visit_count_milestone": 10}}'::jsonb,
      json_build_object(
        'customer_name', customer_record.name,
        'visit_count', customer_record.visit_count,
        'first_visit_date', customer_record.created_at,
        'years_with_us', EXTRACT(YEAR FROM AGE(NOW(), customer_record.created_at)),
        'communication_style', COALESCE(customer_record.communication_style, 'friendly')
      )::jsonb,
      NOW() + INTERVAL '1 day' + INTERVAL '15 hours',
      '[{"channel": "line", "priority": 1, "effectiveness_score": 0.88}]'::jsonb,
      'loyalty_milestone_celebration',
      NOW() + INTERVAL '1 day' + INTERVAL '15 hours'
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create a function to clean up old cache data
CREATE OR REPLACE FUNCTION cleanup_cache_data()
RETURNS VOID AS $$
BEGIN
  DELETE FROM customer_segment_cache WHERE expires_at < NOW();
  DELETE FROM business_insights_cache WHERE expires_at < NOW();
  DELETE FROM weather_data WHERE recorded_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Row Level Security (RLS) policies for new tables

-- Enable RLS on all new tables
ALTER TABLE intelligent_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_journey_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_touchpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_performance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_attributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_segment_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_insights_cache ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for intelligent reminders
CREATE POLICY "intelligent_reminders_tenant_isolation" ON intelligent_reminders
  FOR ALL USING (tenant_id = get_user_tenant_id());

-- Create RLS policies for customer journey events
CREATE POLICY "customer_journey_events_tenant_isolation" ON customer_journey_events
  FOR ALL USING (tenant_id = get_user_tenant_id());

-- Create RLS policies for customer touchpoints
CREATE POLICY "customer_touchpoints_tenant_isolation" ON customer_touchpoints
  FOR ALL USING (tenant_id = get_user_tenant_id());

-- Create RLS policies for campaign performance logs
CREATE POLICY "campaign_performance_logs_tenant_isolation" ON campaign_performance_logs
  FOR ALL USING (tenant_id = get_user_tenant_id());

-- Create RLS policies for revenue attributions
CREATE POLICY "revenue_attributions_tenant_isolation" ON revenue_attributions
  FOR ALL USING (tenant_id = get_user_tenant_id());

-- Create RLS policies for reminder responses
CREATE POLICY "reminder_responses_tenant_isolation" ON reminder_responses
  FOR ALL USING (tenant_id = get_user_tenant_id());

-- Create RLS policies for campaign bookings
CREATE POLICY "campaign_bookings_tenant_isolation" ON campaign_bookings
  FOR ALL USING (tenant_id = get_user_tenant_id());

-- Create RLS policies for customer segment cache
CREATE POLICY "customer_segment_cache_tenant_isolation" ON customer_segment_cache
  FOR ALL USING (tenant_id = get_user_tenant_id());

-- Create RLS policies for business insights cache
CREATE POLICY "business_insights_cache_tenant_isolation" ON business_insights_cache
  FOR ALL USING (tenant_id = get_user_tenant_id());

-- Weather data is public (no tenant isolation needed)
ALTER TABLE weather_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "weather_data_public_read" ON weather_data
  FOR SELECT USING (true);

-- Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customers_churn_risk ON customers(churn_risk_score DESC) WHERE churn_risk_score > 0.5;
CREATE INDEX IF NOT EXISTS idx_customers_predicted_ltv ON customers(predicted_ltv DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_reservations_campaign ON reservations(campaign_id) WHERE campaign_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bulk_message_logs_interactions ON bulk_message_logs(opened_at, clicked_at) WHERE opened_at IS NOT NULL OR clicked_at IS NOT NULL;

-- Update trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers to new tables
CREATE TRIGGER trigger_intelligent_reminders_updated_at
  BEFORE UPDATE ON intelligent_reminders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Insert sample weather data
INSERT INTO weather_data (weather_condition, temperature, humidity, precipitation_probability) 
VALUES 
  ('sunny', 25.0, 45, 10),
  ('rainy', 18.0, 85, 90),
  ('cloudy', 22.0, 65, 30)
ON CONFLICT DO NOTHING;

COMMIT;