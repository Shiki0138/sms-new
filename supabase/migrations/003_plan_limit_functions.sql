-- プラン制限チェック関数

-- 顧客数制限チェック関数
CREATE OR REPLACE FUNCTION check_customer_limit()
RETURNS TRIGGER AS $$
DECLARE
  tenant_plan TEXT;
  current_count INTEGER;
  max_count INTEGER;
BEGIN
  -- テナントのプランを取得
  SELECT plan INTO tenant_plan FROM tenants WHERE id = NEW.tenant_id;
  
  -- 現在の顧客数を取得
  SELECT COUNT(*) INTO current_count FROM customers WHERE tenant_id = NEW.tenant_id;
  
  -- プランによる制限
  CASE tenant_plan
    WHEN 'light' THEN max_count := 100;
    WHEN 'standard' THEN max_count := 1000;
    WHEN 'premium' THEN max_count := NULL; -- 無制限
  END CASE;
  
  -- 制限チェック
  IF max_count IS NOT NULL AND current_count >= max_count THEN
    RAISE EXCEPTION 'Customer limit reached for % plan (max: %)', tenant_plan, max_count;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 月間予約数制限チェック関数
CREATE OR REPLACE FUNCTION check_reservation_limit()
RETURNS TRIGGER AS $$
DECLARE
  tenant_plan TEXT;
  current_month DATE;
  current_count INTEGER;
  max_count INTEGER;
BEGIN
  -- テナントのプランを取得
  SELECT plan INTO tenant_plan FROM tenants WHERE id = NEW.tenant_id;
  
  -- 現在の月の初日を取得
  current_month := DATE_TRUNC('month', NEW.start_time)::DATE;
  
  -- 現在の月の予約数を取得
  SELECT COUNT(*) INTO current_count 
  FROM reservations 
  WHERE tenant_id = NEW.tenant_id 
    AND DATE_TRUNC('month', start_time)::DATE = current_month
    AND status != 'CANCELLED';
  
  -- プランによる制限
  CASE tenant_plan
    WHEN 'light' THEN max_count := 50;
    WHEN 'standard' THEN max_count := 500;
    WHEN 'premium' THEN max_count := NULL; -- 無制限
  END CASE;
  
  -- 制限チェック
  IF max_count IS NOT NULL AND current_count >= max_count THEN
    RAISE EXCEPTION 'Monthly reservation limit reached for % plan (max: %)', tenant_plan, max_count;
  END IF;
  
  -- plan_usageテーブルを更新
  INSERT INTO plan_usage (tenant_id, month, reservation_count)
  VALUES (NEW.tenant_id, current_month, 1)
  ON CONFLICT (tenant_id, month)
  DO UPDATE SET reservation_count = plan_usage.reservation_count + 1;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 顧客訪問カウント更新関数
CREATE OR REPLACE FUNCTION update_customer_visit_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- 予約が完了になった時
  IF NEW.status = 'COMPLETED' AND (OLD.status IS NULL OR OLD.status != 'COMPLETED') THEN
    UPDATE customers 
    SET 
      visit_count = visit_count + 1,
      last_visit_date = NEW.start_time
    WHERE id = NEW.customer_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- plan_usageの顧客数更新関数
CREATE OR REPLACE FUNCTION update_plan_usage_customer_count()
RETURNS TRIGGER AS $$
DECLARE
  current_month DATE;
  customer_count INTEGER;
BEGIN
  current_month := DATE_TRUNC('month', CURRENT_DATE)::DATE;
  
  -- 顧客追加時
  IF TG_OP = 'INSERT' THEN
    SELECT COUNT(*) INTO customer_count FROM customers WHERE tenant_id = NEW.tenant_id;
    
    INSERT INTO plan_usage (tenant_id, month, customer_count)
    VALUES (NEW.tenant_id, current_month, customer_count)
    ON CONFLICT (tenant_id, month)
    DO UPDATE SET customer_count = customer_count;
  END IF;
  
  -- 顧客削除時
  IF TG_OP = 'DELETE' THEN
    SELECT COUNT(*) INTO customer_count FROM customers WHERE tenant_id = OLD.tenant_id;
    
    UPDATE plan_usage 
    SET customer_count = customer_count
    WHERE tenant_id = OLD.tenant_id AND month = current_month;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガー設定
CREATE TRIGGER check_customer_limit_trigger
  BEFORE INSERT ON customers
  FOR EACH ROW EXECUTE FUNCTION check_customer_limit();

CREATE TRIGGER check_reservation_limit_trigger
  BEFORE INSERT ON reservations
  FOR EACH ROW EXECUTE FUNCTION check_reservation_limit();

CREATE TRIGGER update_customer_visit_stats_trigger
  AFTER INSERT OR UPDATE ON reservations
  FOR EACH ROW EXECUTE FUNCTION update_customer_visit_stats();

CREATE TRIGGER update_plan_usage_customer_count_trigger
  AFTER INSERT OR DELETE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_plan_usage_customer_count();