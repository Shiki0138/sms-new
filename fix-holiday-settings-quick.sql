-- =====================================
-- QUICK FIX: Holiday Settings UUID Conversion
-- =====================================

-- 1. Create a helper function to convert TEXT tenant_id to UUID if needed
CREATE OR REPLACE FUNCTION ensure_uuid_format(input_text TEXT)
RETURNS UUID AS $$
BEGIN
  -- If it's already a valid UUID, return it
  IF input_text ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN
    RETURN input_text::UUID;
  END IF;
  
  -- If it's a ULID or other format, try to find the matching tenant
  RETURN (
    SELECT id FROM tenants 
    WHERE id::TEXT = input_text 
    OR name = input_text 
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql;

-- 2. Update the get_user_tenant_id function to work correctly
CREATE OR REPLACE FUNCTION get_user_tenant_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT tenant_id
    FROM users
    WHERE id = auth.uid() OR auth_id = auth.uid()
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Ensure holiday_settings table exists with UUID format
CREATE TABLE IF NOT EXISTS holiday_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  holiday_type VARCHAR(20) NOT NULL CHECK (holiday_type IN ('weekly', 'monthly', 'specific_date')),
  day_of_week INTEGER,
  week_of_month INTEGER CHECK (week_of_month BETWEEN 1 AND 5),
  specific_date DATE,
  end_date DATE,
  description TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  CHECK (
    (holiday_type = 'weekly' AND day_of_week IS NOT NULL) OR
    (holiday_type = 'monthly' AND day_of_week IS NOT NULL AND week_of_month IS NOT NULL) OR
    (holiday_type = 'specific_date' AND specific_date IS NOT NULL)
  )
);

-- 4. Add indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_holiday_settings_tenant ON holiday_settings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_holiday_settings_active ON holiday_settings(is_active);

-- 5. Enable RLS
ALTER TABLE holiday_settings ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policy
DROP POLICY IF EXISTS "Users can manage same tenant holidays" ON holiday_settings;
CREATE POLICY "Users can manage same tenant holidays" ON holiday_settings
  FOR ALL USING (tenant_id = get_user_tenant_id());

-- 7. Create update trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_holiday_settings_updated_at ON holiday_settings;
CREATE TRIGGER update_holiday_settings_updated_at
BEFORE UPDATE ON holiday_settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- 8. Verify the setup
SELECT 
  'Table exists' as check_item,
  EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'holiday_settings'
  ) as status;