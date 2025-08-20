-- Row Level Security (RLS) Policies for SMS System
-- Version: 1.0.0
-- Created: 2025-08-20

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user ID
CREATE OR REPLACE FUNCTION auth.user_id() 
RETURNS UUID AS $$
BEGIN
    RETURN auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION auth.is_admin() 
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
        AND role = 'admin'
        AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is manager or above
CREATE OR REPLACE FUNCTION auth.is_manager_or_above() 
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'manager')
        AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Users table policies
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

CREATE POLICY "Admins can view all users" ON users
    FOR SELECT USING (auth.is_admin());

CREATE POLICY "Admins can manage users" ON users
    FOR ALL USING (auth.is_admin());

-- Subscriptions table policies
CREATE POLICY "Users can view own subscription" ON subscriptions
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all subscriptions" ON subscriptions
    FOR ALL USING (auth.is_admin());

-- Settings table policies
CREATE POLICY "Users can view own settings" ON settings
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own settings" ON settings
    FOR UPDATE USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can insert own settings" ON settings
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Customers table policies
CREATE POLICY "Users can view own customers" ON customers
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own customers" ON customers
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own customers" ON customers
    FOR UPDATE USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own customers" ON customers
    FOR DELETE USING (user_id = auth.uid());

-- Staff table policies
CREATE POLICY "Users can view own staff" ON staff
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Managers can manage staff" ON staff
    FOR ALL USING (
        user_id = auth.uid() AND auth.is_manager_or_above()
    );

-- Services table policies
CREATE POLICY "Users can view own services" ON services
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage own services" ON services
    FOR ALL USING (user_id = auth.uid());

-- Staff services junction table policies
CREATE POLICY "Users can view own staff services" ON staff_services
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM staff s
            WHERE s.id = staff_services.staff_id
            AND s.user_id = auth.uid()
        )
    );

CREATE POLICY "Managers can manage staff services" ON staff_services
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM staff s
            WHERE s.id = staff_services.staff_id
            AND s.user_id = auth.uid()
            AND auth.is_manager_or_above()
        )
    );

-- Appointments table policies
CREATE POLICY "Users can view own appointments" ON appointments
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage own appointments" ON appointments
    FOR ALL USING (user_id = auth.uid());

-- Sales table policies
CREATE POLICY "Users can view own sales" ON sales
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage own sales" ON sales
    FOR ALL USING (user_id = auth.uid());

-- Message templates table policies
CREATE POLICY "Users can view own templates" ON message_templates
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage own templates" ON message_templates
    FOR ALL USING (user_id = auth.uid());

-- Messages table policies
CREATE POLICY "Users can view own messages" ON messages
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can send messages" ON messages
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own messages" ON messages
    FOR UPDATE USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Campaigns table policies
CREATE POLICY "Users can view own campaigns" ON campaigns
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage own campaigns" ON campaigns
    FOR ALL USING (user_id = auth.uid());

-- Analytics table policies
CREATE POLICY "Users can view own analytics" ON analytics
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can insert analytics" ON analytics
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Audit logs table policies
CREATE POLICY "Users can view own audit logs" ON audit_logs
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view all audit logs" ON audit_logs
    FOR SELECT USING (auth.is_admin());

CREATE POLICY "System can insert audit logs" ON audit_logs
    FOR INSERT WITH CHECK (true);

-- Create RLS bypass for service role
CREATE POLICY "Service role bypass" ON users
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role bypass" ON subscriptions
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role bypass" ON settings
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role bypass" ON customers
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role bypass" ON staff
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role bypass" ON services
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role bypass" ON staff_services
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role bypass" ON appointments
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role bypass" ON sales
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role bypass" ON message_templates
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role bypass" ON messages
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role bypass" ON campaigns
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role bypass" ON analytics
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role bypass" ON audit_logs
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Function to log actions to audit_logs
CREATE OR REPLACE FUNCTION log_action()
RETURNS TRIGGER AS $$
DECLARE
    user_id_val UUID;
    old_data JSONB;
    new_data JSONB;
BEGIN
    -- Get user ID from auth context
    user_id_val := auth.uid();
    
    -- Prepare old and new data
    IF TG_OP = 'DELETE' THEN
        old_data := to_jsonb(OLD);
        new_data := NULL;
    ELSIF TG_OP = 'UPDATE' THEN
        old_data := to_jsonb(OLD);
        new_data := to_jsonb(NEW);
    ELSE
        old_data := NULL;
        new_data := to_jsonb(NEW);
    END IF;
    
    -- Insert audit log
    INSERT INTO audit_logs (
        user_id,
        action,
        entity_type,
        entity_id,
        old_values,
        new_values,
        metadata
    ) VALUES (
        user_id_val,
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        old_data,
        new_data,
        jsonb_build_object(
            'schema', TG_TABLE_SCHEMA,
            'table', TG_TABLE_NAME,
            'operation', TG_OP
        )
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit triggers for important tables
CREATE TRIGGER audit_customers_changes
    AFTER INSERT OR UPDATE OR DELETE ON customers
    FOR EACH ROW EXECUTE FUNCTION log_action();

CREATE TRIGGER audit_appointments_changes
    AFTER INSERT OR UPDATE OR DELETE ON appointments
    FOR EACH ROW EXECUTE FUNCTION log_action();

CREATE TRIGGER audit_sales_changes
    AFTER INSERT OR UPDATE OR DELETE ON sales
    FOR EACH ROW EXECUTE FUNCTION log_action();

CREATE TRIGGER audit_messages_changes
    AFTER INSERT OR UPDATE OR DELETE ON messages
    FOR EACH ROW EXECUTE FUNCTION log_action();

CREATE TRIGGER audit_campaigns_changes
    AFTER INSERT OR UPDATE OR DELETE ON campaigns
    FOR EACH ROW EXECUTE FUNCTION log_action();

-- Function to check subscription limits
CREATE OR REPLACE FUNCTION check_plan_limit(
    p_user_id UUID,
    p_resource_type TEXT,
    p_current_count INTEGER DEFAULT 0
) RETURNS BOOLEAN AS $$
DECLARE
    v_plan subscription_plan;
    v_limit INTEGER;
BEGIN
    -- Get user's current plan
    SELECT plan INTO v_plan
    FROM subscriptions
    WHERE user_id = p_user_id
    AND status = 'active';
    
    -- Define limits based on plan and resource type
    CASE p_resource_type
        WHEN 'customers' THEN
            CASE v_plan
                WHEN 'light' THEN v_limit := 100;
                WHEN 'standard' THEN v_limit := 1000;
                WHEN 'premium' THEN v_limit := NULL; -- Unlimited
            END CASE;
        WHEN 'messages_per_month' THEN
            CASE v_plan
                WHEN 'light' THEN v_limit := 500;
                WHEN 'standard' THEN v_limit := 5000;
                WHEN 'premium' THEN v_limit := NULL; -- Unlimited
            END CASE;
        WHEN 'staff' THEN
            CASE v_plan
                WHEN 'light' THEN v_limit := 3;
                WHEN 'standard' THEN v_limit := 10;
                WHEN 'premium' THEN v_limit := NULL; -- Unlimited
            END CASE;
        ELSE
            v_limit := NULL;
    END CASE;
    
    -- Check if within limit
    IF v_limit IS NULL THEN
        RETURN TRUE; -- No limit
    ELSE
        RETURN p_current_count < v_limit;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to enforce plan limits on customers
CREATE OR REPLACE FUNCTION enforce_customer_limit()
RETURNS TRIGGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Count existing customers
    SELECT COUNT(*) INTO v_count
    FROM customers
    WHERE user_id = NEW.user_id;
    
    -- Check if within plan limit
    IF NOT check_plan_limit(NEW.user_id, 'customers', v_count) THEN
        RAISE EXCEPTION 'Customer limit exceeded for your subscription plan';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_customer_limit_before_insert
    BEFORE INSERT ON customers
    FOR EACH ROW EXECUTE FUNCTION enforce_customer_limit();

-- Trigger to enforce plan limits on messages
CREATE OR REPLACE FUNCTION enforce_message_limit()
RETURNS TRIGGER AS $$
DECLARE
    v_count INTEGER;
    v_month_start DATE;
BEGIN
    -- Get start of current month
    v_month_start := DATE_TRUNC('month', CURRENT_DATE);
    
    -- Count messages sent this month
    SELECT COUNT(*) INTO v_count
    FROM messages
    WHERE user_id = NEW.user_id
    AND created_at >= v_month_start;
    
    -- Check if within plan limit
    IF NOT check_plan_limit(NEW.user_id, 'messages_per_month', v_count) THEN
        RAISE EXCEPTION 'Monthly message limit exceeded for your subscription plan';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_message_limit_before_insert
    BEFORE INSERT ON messages
    FOR EACH ROW EXECUTE FUNCTION enforce_message_limit();

-- Trigger to enforce plan limits on staff
CREATE OR REPLACE FUNCTION enforce_staff_limit()
RETURNS TRIGGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Count existing active staff
    SELECT COUNT(*) INTO v_count
    FROM staff
    WHERE user_id = NEW.user_id
    AND is_active = true;
    
    -- Check if within plan limit (only for new active staff)
    IF NEW.is_active = true AND NOT check_plan_limit(NEW.user_id, 'staff', v_count) THEN
        RAISE EXCEPTION 'Staff limit exceeded for your subscription plan';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_staff_limit_before_insert
    BEFORE INSERT ON staff
    FOR EACH ROW EXECUTE FUNCTION enforce_staff_limit();

CREATE TRIGGER check_staff_limit_before_update
    BEFORE UPDATE ON staff
    FOR EACH ROW 
    WHEN (OLD.is_active = false AND NEW.is_active = true)
    EXECUTE FUNCTION enforce_staff_limit();