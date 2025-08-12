-- =====================================
-- スタッフスケジュール管理
-- =====================================

-- スタッフの勤務スケジュール
CREATE TABLE IF NOT EXISTS staff_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=日曜日, 6=土曜日
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  break_start_time TIME,
  break_end_time TIME,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, staff_id, day_of_week)
);

-- スタッフの特定日の勤務状況（休暇など）
CREATE TABLE IF NOT EXISTS staff_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  availability_type VARCHAR(20) NOT NULL CHECK (availability_type IN ('available', 'unavailable', 'limited')),
  start_time TIME, -- limited の場合のみ
  end_time TIME,   -- limited の場合のみ
  reason VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, staff_id, date)
);

-- スタッフのスキル・サービス対応表
CREATE TABLE IF NOT EXISTS staff_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  proficiency_level VARCHAR(20) DEFAULT 'standard' CHECK (proficiency_level IN ('beginner', 'standard', 'expert')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, staff_id, service_id)
);

-- インデックス作成
CREATE INDEX idx_staff_schedules_tenant_id ON staff_schedules(tenant_id);
CREATE INDEX idx_staff_schedules_staff_id ON staff_schedules(staff_id);
CREATE INDEX idx_staff_availability_tenant_id ON staff_availability(tenant_id);
CREATE INDEX idx_staff_availability_staff_id ON staff_availability(staff_id);
CREATE INDEX idx_staff_availability_date ON staff_availability(date);
CREATE INDEX idx_staff_services_tenant_id ON staff_services(tenant_id);
CREATE INDEX idx_staff_services_staff_id ON staff_services(staff_id);
CREATE INDEX idx_staff_services_service_id ON staff_services(service_id);

-- RLSを有効化
ALTER TABLE staff_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_services ENABLE ROW LEVEL SECURITY;

-- RLSポリシー
CREATE POLICY "Users can manage same tenant staff schedules" ON staff_schedules
  FOR ALL USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can manage same tenant staff availability" ON staff_availability
  FOR ALL USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can manage same tenant staff services" ON staff_services
  FOR ALL USING (tenant_id = get_user_tenant_id());

-- トリガー作成
CREATE TRIGGER update_staff_schedules_updated_at BEFORE UPDATE ON staff_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_staff_availability_updated_at BEFORE UPDATE ON staff_availability
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();