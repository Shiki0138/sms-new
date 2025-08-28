-- =====================================
-- 拡張スタッフ管理システム
-- Enhanced Staff Management System
-- =====================================

-- スタッフテーブルを拡張
ALTER TABLE staff ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50) UNIQUE;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS hire_date DATE;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS department VARCHAR(100);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS position VARCHAR(100);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS salary_type VARCHAR(20) CHECK (salary_type IN ('hourly', 'monthly', 'commission', 'mixed')) DEFAULT 'hourly';
ALTER TABLE staff ADD COLUMN IF NOT EXISTS base_salary DECIMAL(10, 2);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(8, 2);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5, 4); -- Percentage as decimal
ALTER TABLE staff ADD COLUMN IF NOT EXISTS emergency_contact JSONB DEFAULT '{}'::jsonb;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS certifications TEXT[];
ALTER TABLE staff ADD COLUMN IF NOT EXISTS languages TEXT[];
ALTER TABLE staff ADD COLUMN IF NOT EXISTS profile_image_url TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS contract_type VARCHAR(20) CHECK (contract_type IN ('full_time', 'part_time', 'contractor', 'intern')) DEFAULT 'full_time';
ALTER TABLE staff ADD COLUMN IF NOT EXISTS performance_score DECIMAL(3, 2) DEFAULT 0.00 CHECK (performance_score >= 0 AND performance_score <= 5);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS notes TEXT;

-- スタッフ権限管理
CREATE TABLE IF NOT EXISTS staff_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  permission VARCHAR(100) NOT NULL,
  granted_by UUID REFERENCES staff(id) ON DELETE SET NULL,
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, staff_id, permission)
);

-- スタッフ勤務スケジュール（既存のテーブルを拡張）
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

-- スタッフ勤務シフト（日別の実際のシフト）
CREATE TABLE IF NOT EXISTS staff_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  shift_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  break_start_time TIME,
  break_end_time TIME,
  status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, staff_id, shift_date)
);

-- スタッフ勤怠記録
CREATE TABLE IF NOT EXISTS staff_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  shift_id UUID REFERENCES staff_shifts(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  clock_in_time TIMESTAMPTZ,
  clock_out_time TIMESTAMPTZ,
  break_start_time TIMESTAMPTZ,
  break_end_time TIMESTAMPTZ,
  total_hours DECIMAL(4, 2),
  overtime_hours DECIMAL(4, 2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'half_day', 'sick', 'vacation')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, staff_id, date)
);

-- スタッフスキル・資格
CREATE TABLE IF NOT EXISTS staff_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  skill_name VARCHAR(100) NOT NULL,
  skill_level VARCHAR(20) CHECK (skill_level IN ('beginner', 'intermediate', 'advanced', 'expert')) DEFAULT 'intermediate',
  certification_date DATE,
  expiry_date DATE,
  certification_authority VARCHAR(200),
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, staff_id, skill_name)
);

-- スタッフサービス対応可能表
CREATE TABLE IF NOT EXISTS staff_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  proficiency_level VARCHAR(20) DEFAULT 'standard' CHECK (proficiency_level IN ('beginner', 'standard', 'expert')),
  commission_override DECIMAL(5, 4), -- Override commission rate for this service
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, staff_id, service_id)
);

-- スタッフパフォーマンス記録
CREATE TABLE IF NOT EXISTS staff_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_appointments INTEGER DEFAULT 0,
  completed_appointments INTEGER DEFAULT 0,
  cancelled_appointments INTEGER DEFAULT 0,
  no_show_appointments INTEGER DEFAULT 0,
  total_revenue DECIMAL(10, 2) DEFAULT 0,
  commission_earned DECIMAL(10, 2) DEFAULT 0,
  average_rating DECIMAL(3, 2) DEFAULT 0,
  customer_reviews_count INTEGER DEFAULT 0,
  repeat_customer_rate DECIMAL(5, 4) DEFAULT 0,
  punctuality_score DECIMAL(3, 2) DEFAULT 0,
  targets_met INTEGER DEFAULT 0,
  targets_total INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, staff_id, period_start)
);

-- スタッフ給与計算
CREATE TABLE IF NOT EXISTS staff_payroll (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  pay_period_start DATE NOT NULL,
  pay_period_end DATE NOT NULL,
  base_hours DECIMAL(6, 2) DEFAULT 0,
  overtime_hours DECIMAL(6, 2) DEFAULT 0,
  base_pay DECIMAL(10, 2) DEFAULT 0,
  overtime_pay DECIMAL(10, 2) DEFAULT 0,
  commission_amount DECIMAL(10, 2) DEFAULT 0,
  bonus_amount DECIMAL(10, 2) DEFAULT 0,
  deductions DECIMAL(10, 2) DEFAULT 0,
  gross_pay DECIMAL(10, 2) DEFAULT 0,
  net_pay DECIMAL(10, 2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
  notes TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, staff_id, pay_period_start)
);

-- スタッフ可用性設定
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

-- スタッフ顧客評価
CREATE TABLE IF NOT EXISTS staff_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  reservation_id UUID REFERENCES reservations(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  service_quality INTEGER CHECK (service_quality >= 1 AND service_quality <= 5),
  punctuality INTEGER CHECK (punctuality >= 1 AND punctuality <= 5),
  friendliness INTEGER CHECK (friendliness >= 1 AND friendliness <= 5),
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- スタッフ目標設定
CREATE TABLE IF NOT EXISTS staff_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  target_type VARCHAR(50) NOT NULL,
  target_value DECIMAL(10, 2) NOT NULL,
  current_value DECIMAL(10, 2) DEFAULT 0,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'achieved', 'failed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_staff_permissions_tenant_staff ON staff_permissions(tenant_id, staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_schedules_tenant_staff ON staff_schedules(tenant_id, staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_shifts_tenant_staff ON staff_shifts(tenant_id, staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_shifts_date ON staff_shifts(shift_date);
CREATE INDEX IF NOT EXISTS idx_staff_attendance_tenant_staff ON staff_attendance(tenant_id, staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_attendance_date ON staff_attendance(date);
CREATE INDEX IF NOT EXISTS idx_staff_skills_tenant_staff ON staff_skills(tenant_id, staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_services_tenant_staff ON staff_services(tenant_id, staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_performance_tenant_staff ON staff_performance(tenant_id, staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_performance_period ON staff_performance(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_staff_payroll_tenant_staff ON staff_payroll(tenant_id, staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_payroll_period ON staff_payroll(pay_period_start, pay_period_end);
CREATE INDEX IF NOT EXISTS idx_staff_availability_tenant_staff ON staff_availability(tenant_id, staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_availability_date ON staff_availability(date);
CREATE INDEX IF NOT EXISTS idx_staff_reviews_tenant_staff ON staff_reviews(tenant_id, staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_targets_tenant_staff ON staff_targets(tenant_id, staff_id);

-- RLSを有効化
ALTER TABLE staff_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_payroll ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_targets ENABLE ROW LEVEL SECURITY;

-- RLSポリシー
CREATE POLICY "Users can manage same tenant staff permissions" ON staff_permissions
  FOR ALL USING (tenant_id IN (SELECT id FROM tenants WHERE id = get_user_tenant_id()));

CREATE POLICY "Users can manage same tenant staff shifts" ON staff_shifts
  FOR ALL USING (tenant_id IN (SELECT id FROM tenants WHERE id = get_user_tenant_id()));

CREATE POLICY "Users can manage same tenant staff attendance" ON staff_attendance
  FOR ALL USING (tenant_id IN (SELECT id FROM tenants WHERE id = get_user_tenant_id()));

CREATE POLICY "Users can manage same tenant staff skills" ON staff_skills
  FOR ALL USING (tenant_id IN (SELECT id FROM tenants WHERE id = get_user_tenant_id()));

CREATE POLICY "Users can manage same tenant staff performance" ON staff_performance
  FOR ALL USING (tenant_id IN (SELECT id FROM tenants WHERE id = get_user_tenant_id()));

CREATE POLICY "Users can view same tenant staff payroll" ON staff_payroll
  FOR SELECT USING (tenant_id IN (SELECT id FROM tenants WHERE id = get_user_tenant_id()));

-- Only admin/owner can manage payroll
CREATE POLICY "Admin can manage staff payroll" ON staff_payroll
  FOR INSERT WITH CHECK (tenant_id IN (SELECT id FROM tenants WHERE id = get_user_tenant_id()) AND 
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin')));

CREATE POLICY "Admin can update staff payroll" ON staff_payroll
  FOR UPDATE USING (tenant_id IN (SELECT id FROM tenants WHERE id = get_user_tenant_id()) AND 
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin')));

CREATE POLICY "Users can view same tenant staff reviews" ON staff_reviews
  FOR SELECT USING (tenant_id IN (SELECT id FROM tenants WHERE id = get_user_tenant_id()));

CREATE POLICY "Users can manage same tenant staff targets" ON staff_targets
  FOR ALL USING (tenant_id IN (SELECT id FROM tenants WHERE id = get_user_tenant_id()));

-- トリガー作成（更新日時の自動更新）
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_staff_schedules_updated_at BEFORE UPDATE ON staff_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_staff_shifts_updated_at BEFORE UPDATE ON staff_shifts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_staff_skills_updated_at BEFORE UPDATE ON staff_skills
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_staff_availability_updated_at BEFORE UPDATE ON staff_availability
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_staff_targets_updated_at BEFORE UPDATE ON staff_targets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ストアドプロシージャ：スタッフパフォーマンス統計取得
CREATE OR REPLACE FUNCTION get_staff_performance_stats(
  p_staff_id UUID,
  p_period VARCHAR DEFAULT 'month',
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  total_appointments INTEGER,
  completed_appointments INTEGER,
  cancelled_appointments INTEGER,
  no_show_appointments INTEGER,
  total_revenue DECIMAL(10, 2),
  commission_earned DECIMAL(10, 2),
  average_rating DECIMAL(3, 2),
  customer_reviews_count INTEGER,
  repeat_customer_rate DECIMAL(5, 4),
  punctuality_score DECIMAL(3, 2),
  popular_services JSON
) AS $$
DECLARE
  date_start DATE;
  date_end DATE;
BEGIN
  -- 期間の計算
  IF p_start_date IS NOT NULL AND p_end_date IS NOT NULL THEN
    date_start := p_start_date;
    date_end := p_end_date;
  ELSE
    CASE p_period
      WHEN 'today' THEN
        date_start := CURRENT_DATE;
        date_end := CURRENT_DATE;
      WHEN 'week' THEN
        date_start := DATE_TRUNC('week', CURRENT_DATE);
        date_end := date_start + INTERVAL '6 days';
      WHEN 'month' THEN
        date_start := DATE_TRUNC('month', CURRENT_DATE);
        date_end := date_start + INTERVAL '1 month' - INTERVAL '1 day';
      WHEN 'year' THEN
        date_start := DATE_TRUNC('year', CURRENT_DATE);
        date_end := date_start + INTERVAL '1 year' - INTERVAL '1 day';
      ELSE
        date_start := DATE_TRUNC('month', CURRENT_DATE);
        date_end := date_start + INTERVAL '1 month' - INTERVAL '1 day';
    END CASE;
  END IF;

  RETURN QUERY
  WITH stats AS (
    SELECT
      COUNT(*)::INTEGER as total_appts,
      COUNT(CASE WHEN r.status = 'completed' THEN 1 END)::INTEGER as completed_appts,
      COUNT(CASE WHEN r.status = 'cancelled' THEN 1 END)::INTEGER as cancelled_appts,
      COUNT(CASE WHEN r.status = 'no_show' THEN 1 END)::INTEGER as no_show_appts,
      COALESCE(SUM(CASE WHEN r.status = 'completed' THEN r.price END), 0) as total_rev,
      COALESCE(SUM(CASE WHEN r.status = 'completed' THEN r.price * 0.1 END), 0) as commission -- 仮の10%計算
    FROM reservations r
    WHERE r.staff_id = p_staff_id
      AND DATE(r.start_time) BETWEEN date_start AND date_end
  ),
  reviews AS (
    SELECT
      COALESCE(AVG(sr.rating), 0) as avg_rating,
      COUNT(*)::INTEGER as review_count
    FROM staff_reviews sr
    WHERE sr.staff_id = p_staff_id
      AND DATE(sr.created_at) BETWEEN date_start AND date_end
  ),
  services AS (
    SELECT
      JSON_AGG(
        JSON_BUILD_OBJECT(
          'service_name', s.name,
          'count', service_counts.count,
          'revenue', service_counts.revenue
        )
        ORDER BY service_counts.count DESC
      ) as popular_services_json
    FROM (
      SELECT 
        r.service_id,
        COUNT(*) as count,
        SUM(r.price) as revenue
      FROM reservations r
      WHERE r.staff_id = p_staff_id
        AND DATE(r.start_time) BETWEEN date_start AND date_end
        AND r.status = 'completed'
      GROUP BY r.service_id
      ORDER BY count DESC
      LIMIT 5
    ) service_counts
    JOIN services s ON s.id = service_counts.service_id
  )
  SELECT
    s.total_appts,
    s.completed_appts,
    s.cancelled_appts,
    s.no_show_appts,
    s.total_rev,
    s.commission,
    r.avg_rating::DECIMAL(3,2),
    r.review_count,
    0.00::DECIMAL(5,4) as repeat_rate, -- 複雑な計算のため仮値
    0.00::DECIMAL(3,2) as punct_score, -- 複雑な計算のため仮値
    COALESCE(srv.popular_services_json, '[]'::JSON)
  FROM stats s
  CROSS JOIN reviews r
  LEFT JOIN services srv ON true;
END;
$$ LANGUAGE plpgsql;

-- ストアドプロシージャ：給与計算
CREATE OR REPLACE FUNCTION calculate_staff_payroll(
  p_staff_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  base_hours DECIMAL(6, 2),
  overtime_hours DECIMAL(6, 2),
  base_pay DECIMAL(10, 2),
  overtime_pay DECIMAL(10, 2),
  commission_amount DECIMAL(10, 2),
  gross_pay DECIMAL(10, 2)
) AS $$
DECLARE
  staff_rec RECORD;
  total_hours DECIMAL(6, 2) := 0;
  regular_hours DECIMAL(6, 2) := 0;
  overtime_hrs DECIMAL(6, 2) := 0;
  commission_total DECIMAL(10, 2) := 0;
  base_salary_amount DECIMAL(10, 2) := 0;
  overtime_amount DECIMAL(10, 2) := 0;
BEGIN
  -- スタッフ情報取得
  SELECT * INTO staff_rec FROM staff WHERE id = p_staff_id;

  -- 勤務時間の計算
  SELECT 
    COALESCE(SUM(total_hours), 0),
    COALESCE(SUM(overtime_hours), 0)
  INTO total_hours, overtime_hrs
  FROM staff_attendance
  WHERE staff_id = p_staff_id
    AND date BETWEEN p_start_date AND p_end_date
    AND status = 'present';

  regular_hours := total_hours - overtime_hrs;

  -- 基本給計算
  IF staff_rec.salary_type IN ('hourly', 'mixed') THEN
    base_salary_amount := regular_hours * COALESCE(staff_rec.hourly_rate, 0);
    overtime_amount := overtime_hrs * COALESCE(staff_rec.hourly_rate, 0) * 1.5; -- 時間外1.5倍
  ELSIF staff_rec.salary_type = 'monthly' THEN
    base_salary_amount := COALESCE(staff_rec.base_salary, 0);
  END IF;

  -- コミッション計算
  IF staff_rec.salary_type IN ('commission', 'mixed') THEN
    SELECT COALESCE(SUM(r.price * COALESCE(staff_rec.commission_rate, 0.1)), 0)
    INTO commission_total
    FROM reservations r
    WHERE r.staff_id = p_staff_id
      AND DATE(r.start_time) BETWEEN p_start_date AND p_end_date
      AND r.status = 'completed';
  END IF;

  RETURN QUERY SELECT
    regular_hours,
    overtime_hrs,
    base_salary_amount,
    overtime_amount,
    commission_total,
    base_salary_amount + overtime_amount + commission_total;
END;
$$ LANGUAGE plpgsql;

-- ビュー：スタッフ概要
CREATE OR REPLACE VIEW staff_overview AS
SELECT 
  s.*,
  COUNT(r.id) as total_appointments,
  COUNT(CASE WHEN r.status = 'completed' THEN 1 END) as completed_appointments,
  COALESCE(AVG(sr.rating), 0) as average_rating,
  COUNT(sr.id) as total_reviews
FROM staff s
LEFT JOIN reservations r ON r.staff_id = s.id AND r.created_at >= DATE_TRUNC('month', CURRENT_DATE)
LEFT JOIN staff_reviews sr ON sr.staff_id = s.id
GROUP BY s.id;

-- 初期権限データ
INSERT INTO staff_permissions (tenant_id, staff_id, permission) 
SELECT DISTINCT 
  s.tenant_id,
  s.id,
  CASE 
    WHEN s.role = 'オーナー' THEN 'all'
    WHEN s.role = 'マネージャー' THEN 'manage_staff'
    ELSE 'basic'
  END
FROM staff s
ON CONFLICT (tenant_id, staff_id, permission) DO NOTHING;