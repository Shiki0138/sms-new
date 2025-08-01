-- =====================================
-- 高度なレポーティングシステム
-- =====================================

-- 顧客生涯価値（CLV）分析
CREATE TABLE IF NOT EXISTS customer_lifetime_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  total_revenue DECIMAL(10, 2) DEFAULT 0,
  total_visits INTEGER DEFAULT 0,
  average_order_value DECIMAL(10, 2) DEFAULT 0,
  first_visit_date DATE,
  last_visit_date DATE,
  days_since_first_visit INTEGER DEFAULT 0,
  visit_frequency_days DECIMAL(5, 2), -- 平均来店頻度（日数）
  projected_annual_value DECIMAL(10, 2), -- 予測年間価値
  churn_probability DECIMAL(3, 2), -- 離脱確率（0-1）
  customer_segment VARCHAR(50), -- VIP, Regular, New, At-Risk, Lost
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, customer_id)
);

-- サービス人気度分析
CREATE TABLE IF NOT EXISTS service_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  booking_count INTEGER DEFAULT 0,
  revenue DECIMAL(10, 2) DEFAULT 0,
  unique_customers INTEGER DEFAULT 0,
  repeat_rate DECIMAL(3, 2), -- リピート率（0-1）
  average_rating DECIMAL(2, 1), -- 平均評価（1-5）
  cancellation_rate DECIMAL(3, 2), -- キャンセル率（0-1）
  popularity_score INTEGER, -- 人気度スコア（0-100）
  trend VARCHAR(20), -- rising, stable, declining
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, service_id, month)
);

-- スタッフパフォーマンス指標
CREATE TABLE IF NOT EXISTS staff_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  total_appointments INTEGER DEFAULT 0,
  completed_appointments INTEGER DEFAULT 0,
  cancelled_appointments INTEGER DEFAULT 0,
  no_show_appointments INTEGER DEFAULT 0,
  total_revenue DECIMAL(10, 2) DEFAULT 0,
  average_service_time INTEGER, -- 平均施術時間（分）
  utilization_rate DECIMAL(3, 2), -- 稼働率（0-1）
  customer_satisfaction DECIMAL(2, 1), -- 顧客満足度（1-5）
  repeat_customer_rate DECIMAL(3, 2), -- リピート顧客率（0-1）
  new_customer_count INTEGER DEFAULT 0,
  productivity_score INTEGER, -- 生産性スコア（0-100）
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, staff_id, month)
);

-- 収益トレンド分析
CREATE TABLE IF NOT EXISTS revenue_trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  daily_revenue DECIMAL(10, 2) DEFAULT 0,
  appointment_count INTEGER DEFAULT 0,
  new_customer_revenue DECIMAL(10, 2) DEFAULT 0,
  repeat_customer_revenue DECIMAL(10, 2) DEFAULT 0,
  service_revenue DECIMAL(10, 2) DEFAULT 0,
  product_revenue DECIMAL(10, 2) DEFAULT 0,
  average_ticket_size DECIMAL(10, 2) DEFAULT 0,
  day_of_week INTEGER NOT NULL,
  week_of_month INTEGER NOT NULL,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  is_holiday BOOLEAN DEFAULT false,
  weather_impact VARCHAR(20), -- good, neutral, bad
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, date)
);

-- カスタムレポート定義
CREATE TABLE IF NOT EXISTS custom_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  report_type VARCHAR(50) NOT NULL, -- revenue, customer, service, staff, custom
  filters JSONB DEFAULT '{}',
  metrics JSONB DEFAULT '[]',
  chart_type VARCHAR(50), -- line, bar, pie, table
  frequency VARCHAR(20), -- daily, weekly, monthly, quarterly, yearly
  is_active BOOLEAN DEFAULT true,
  last_generated_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- レポート実行履歴
CREATE TABLE IF NOT EXISTS report_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  report_id UUID REFERENCES custom_reports(id),
  report_type VARCHAR(50) NOT NULL,
  execution_time INTEGER, -- 実行時間（ミリ秒）
  status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'failed', 'running')),
  result_data JSONB,
  error_message TEXT,
  generated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX idx_clv_tenant_id ON customer_lifetime_values(tenant_id);
CREATE INDEX idx_clv_customer_id ON customer_lifetime_values(customer_id);
CREATE INDEX idx_clv_segment ON customer_lifetime_values(customer_segment);
CREATE INDEX idx_service_analytics_tenant_id ON service_analytics(tenant_id);
CREATE INDEX idx_service_analytics_service_id ON service_analytics(service_id);
CREATE INDEX idx_service_analytics_month ON service_analytics(month);
CREATE INDEX idx_staff_metrics_tenant_id ON staff_performance_metrics(tenant_id);
CREATE INDEX idx_staff_metrics_staff_id ON staff_performance_metrics(staff_id);
CREATE INDEX idx_staff_metrics_month ON staff_performance_metrics(month);
CREATE INDEX idx_revenue_trends_tenant_id ON revenue_trends(tenant_id);
CREATE INDEX idx_revenue_trends_date ON revenue_trends(date);
CREATE INDEX idx_custom_reports_tenant_id ON custom_reports(tenant_id);
CREATE INDEX idx_report_executions_tenant_id ON report_executions(tenant_id);

-- RLSを有効化
ALTER TABLE customer_lifetime_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_executions ENABLE ROW LEVEL SECURITY;

-- RLSポリシー
CREATE POLICY "Users can view same tenant CLV" ON customer_lifetime_values
  FOR SELECT USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can view same tenant service analytics" ON service_analytics
  FOR SELECT USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can view same tenant staff metrics" ON staff_performance_metrics
  FOR SELECT USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can view same tenant revenue trends" ON revenue_trends
  FOR SELECT USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can manage same tenant custom reports" ON custom_reports
  FOR ALL USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can view same tenant report executions" ON report_executions
  FOR SELECT USING (tenant_id = get_user_tenant_id());

-- トリガー作成
CREATE TRIGGER update_clv_updated_at BEFORE UPDATE ON customer_lifetime_values
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_custom_reports_updated_at BEFORE UPDATE ON custom_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- CLV計算関数
CREATE OR REPLACE FUNCTION calculate_customer_lifetime_value(p_tenant_id UUID, p_customer_id UUID)
RETURNS VOID AS $$
DECLARE
  v_total_revenue DECIMAL(10, 2);
  v_total_visits INTEGER;
  v_first_visit DATE;
  v_last_visit DATE;
  v_days_since_first INTEGER;
  v_visit_frequency DECIMAL(5, 2);
  v_avg_order_value DECIMAL(10, 2);
  v_projected_annual DECIMAL(10, 2);
  v_churn_prob DECIMAL(3, 2);
  v_segment VARCHAR(50);
BEGIN
  -- 集計データを取得
  SELECT 
    COUNT(*) as visits,
    COALESCE(SUM(price), 0) as revenue,
    MIN(start_time::date) as first_visit,
    MAX(start_time::date) as last_visit
  INTO v_total_visits, v_total_revenue, v_first_visit, v_last_visit
  FROM reservations
  WHERE tenant_id = p_tenant_id 
    AND customer_id = p_customer_id
    AND status = 'completed';

  -- 各種指標を計算
  v_days_since_first := COALESCE(EXTRACT(DAY FROM (NOW() - v_first_visit)), 0);
  v_avg_order_value := CASE WHEN v_total_visits > 0 THEN v_total_revenue / v_total_visits ELSE 0 END;
  v_visit_frequency := CASE WHEN v_total_visits > 1 AND v_days_since_first > 0 
    THEN v_days_since_first::DECIMAL / v_total_visits ELSE 0 END;
  
  -- 年間予測価値を計算
  v_projected_annual := CASE WHEN v_visit_frequency > 0 
    THEN (365 / v_visit_frequency) * v_avg_order_value ELSE 0 END;
  
  -- 離脱確率を計算（最終来店からの経過日数ベース）
  v_churn_prob := CASE 
    WHEN v_last_visit IS NULL THEN 1
    WHEN EXTRACT(DAY FROM (NOW() - v_last_visit)) > 180 THEN 0.9
    WHEN EXTRACT(DAY FROM (NOW() - v_last_visit)) > 90 THEN 0.7
    WHEN EXTRACT(DAY FROM (NOW() - v_last_visit)) > 60 THEN 0.5
    WHEN EXTRACT(DAY FROM (NOW() - v_last_visit)) > 30 THEN 0.3
    ELSE 0.1
  END;
  
  -- 顧客セグメントを判定
  v_segment := CASE
    WHEN v_total_revenue > 100000 AND v_churn_prob < 0.3 THEN 'VIP'
    WHEN v_total_visits >= 5 AND v_churn_prob < 0.5 THEN 'Regular'
    WHEN v_total_visits = 1 THEN 'New'
    WHEN v_churn_prob > 0.7 THEN 'Lost'
    WHEN v_churn_prob > 0.5 THEN 'At-Risk'
    ELSE 'Regular'
  END;

  -- 結果を保存
  INSERT INTO customer_lifetime_values (
    tenant_id, customer_id, total_revenue, total_visits, average_order_value,
    first_visit_date, last_visit_date, days_since_first_visit, visit_frequency_days,
    projected_annual_value, churn_probability, customer_segment
  ) VALUES (
    p_tenant_id, p_customer_id, v_total_revenue, v_total_visits, v_avg_order_value,
    v_first_visit, v_last_visit, v_days_since_first, v_visit_frequency,
    v_projected_annual, v_churn_prob, v_segment
  )
  ON CONFLICT (tenant_id, customer_id)
  DO UPDATE SET
    total_revenue = EXCLUDED.total_revenue,
    total_visits = EXCLUDED.total_visits,
    average_order_value = EXCLUDED.average_order_value,
    first_visit_date = EXCLUDED.first_visit_date,
    last_visit_date = EXCLUDED.last_visit_date,
    days_since_first_visit = EXCLUDED.days_since_first_visit,
    visit_frequency_days = EXCLUDED.visit_frequency_days,
    projected_annual_value = EXCLUDED.projected_annual_value,
    churn_probability = EXCLUDED.churn_probability,
    customer_segment = EXCLUDED.customer_segment,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;