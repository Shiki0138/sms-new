-- Enhanced Menu Management Migration
-- This migration adds advanced features for menu management including pricing options, staff assignments, and analytics

-- Add enhanced fields to treatment_menus table
ALTER TABLE treatment_menus ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE treatment_menus ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;
ALTER TABLE treatment_menus ADD COLUMN IF NOT EXISTS popularity_score INTEGER DEFAULT 0 CHECK (popularity_score >= 0 AND popularity_score <= 100);
ALTER TABLE treatment_menus ADD COLUMN IF NOT EXISTS booking_count INTEGER DEFAULT 0;
ALTER TABLE treatment_menus ADD COLUMN IF NOT EXISTS member_price DECIMAL(10, 2);
ALTER TABLE treatment_menus ADD COLUMN IF NOT EXISTS peak_price DECIMAL(10, 2);
ALTER TABLE treatment_menus ADD COLUMN IF NOT EXISTS off_peak_price DECIMAL(10, 2);
ALTER TABLE treatment_menus ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE treatment_menus ADD COLUMN IF NOT EXISTS is_online_bookable BOOLEAN DEFAULT true;
ALTER TABLE treatment_menus ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
ALTER TABLE treatment_menus ADD COLUMN IF NOT EXISTS min_advance_booking_hours INTEGER DEFAULT 24;
ALTER TABLE treatment_menus ADD COLUMN IF NOT EXISTS max_advance_booking_days INTEGER DEFAULT 30;

-- Create menu categories table
CREATE TABLE IF NOT EXISTS menu_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  display_order INTEGER DEFAULT 0,
  color VARCHAR(7) DEFAULT '#3B82F6',
  icon VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tenant_id, name)
);

-- Create menu pricing options table
CREATE TABLE IF NOT EXISTS menu_pricing_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id UUID NOT NULL REFERENCES treatment_menus(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('member', 'time', 'day', 'package', 'campaign')),
  name VARCHAR(100) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  discount_percentage INTEGER CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
  conditions TEXT,
  start_time TIME,
  end_time TIME,
  days_of_week INTEGER[],
  valid_from DATE,
  valid_until DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create staff menu assignments table
CREATE TABLE IF NOT EXISTS staff_menu_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  menu_id UUID NOT NULL REFERENCES treatment_menus(id) ON DELETE CASCADE,
  skill_level VARCHAR(20) NOT NULL CHECK (skill_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
  can_perform BOOLEAN DEFAULT true,
  custom_duration_minutes INTEGER,
  commission_rate DECIMAL(5, 2) CHECK (commission_rate >= 0 AND commission_rate <= 100),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(staff_id, menu_id)
);

-- Create menu analytics table for tracking performance
CREATE TABLE IF NOT EXISTS menu_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id UUID NOT NULL REFERENCES treatment_menus(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  booking_count INTEGER DEFAULT 0,
  revenue DECIMAL(10, 2) DEFAULT 0,
  average_rating DECIMAL(3, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(menu_id, date)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_treatment_menus_category ON treatment_menus(category);
CREATE INDEX IF NOT EXISTS idx_treatment_menus_tenant_active ON treatment_menus(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_treatment_menus_display_order ON treatment_menus(display_order);
CREATE INDEX IF NOT EXISTS idx_menu_pricing_options_menu ON menu_pricing_options(menu_id);
CREATE INDEX IF NOT EXISTS idx_staff_menu_assignments_staff ON staff_menu_assignments(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_menu_assignments_menu ON staff_menu_assignments(menu_id);
CREATE INDEX IF NOT EXISTS idx_menu_analytics_menu_date ON menu_analytics(menu_id, date);

-- Enable RLS on new tables
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_pricing_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_menu_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_analytics ENABLE ROW LEVEL SECURITY;

-- RLS policies for menu_categories
CREATE POLICY "menu_categories_tenant_isolation" ON menu_categories
  FOR ALL USING (tenant_id = auth.uid() OR tenant_id IN (
    SELECT tenant_id FROM users WHERE id = auth.uid()
  ));

-- RLS policies for menu_pricing_options
CREATE POLICY "menu_pricing_options_tenant_isolation" ON menu_pricing_options
  FOR ALL USING (menu_id IN (
    SELECT id FROM treatment_menus 
    WHERE tenant_id = auth.uid() OR tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  ));

-- RLS policies for staff_menu_assignments
CREATE POLICY "staff_menu_assignments_tenant_isolation" ON staff_menu_assignments
  FOR ALL USING (
    staff_id IN (SELECT id FROM staff WHERE tenant_id = auth.uid() OR tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    ))
  );

-- RLS policies for menu_analytics
CREATE POLICY "menu_analytics_tenant_isolation" ON menu_analytics
  FOR ALL USING (menu_id IN (
    SELECT id FROM treatment_menus 
    WHERE tenant_id = auth.uid() OR tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  ));

-- Function to update menu popularity score based on bookings
CREATE OR REPLACE FUNCTION update_menu_popularity_score()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE treatment_menus
  SET 
    booking_count = booking_count + 1,
    popularity_score = LEAST(100, booking_count * 2) -- Simple formula, can be adjusted
  WHERE id = NEW.menu_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update popularity when new booking is created
CREATE TRIGGER update_menu_popularity_on_booking
  AFTER INSERT ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION update_menu_popularity_score();

-- Function to calculate menu analytics
CREATE OR REPLACE FUNCTION calculate_menu_analytics(p_tenant_id UUID, p_date DATE)
RETURNS VOID AS $$
BEGIN
  INSERT INTO menu_analytics (menu_id, date, booking_count, revenue)
  SELECT 
    tm.id,
    p_date,
    COUNT(r.id),
    COALESCE(SUM(r.price), 0)
  FROM treatment_menus tm
  LEFT JOIN reservations r ON r.menu_id = tm.id AND DATE(r.reservation_date) = p_date
  WHERE tm.tenant_id = p_tenant_id
  GROUP BY tm.id
  ON CONFLICT (menu_id, date) 
  DO UPDATE SET
    booking_count = EXCLUDED.booking_count,
    revenue = EXCLUDED.revenue,
    average_rating = EXCLUDED.average_rating;
END;
$$ LANGUAGE plpgsql;

-- Insert default categories for existing tenants
INSERT INTO menu_categories (tenant_id, name, display_order, color)
SELECT DISTINCT 
  tenant_id,
  unnest(ARRAY['カット', 'カラー', 'パーマ', 'トリートメント', 'スパ', 'セット', 'その他']),
  generate_series(1, 7),
  unnest(ARRAY['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#6366F1', '#6B7280'])
FROM tenants
ON CONFLICT (tenant_id, name) DO NOTHING;