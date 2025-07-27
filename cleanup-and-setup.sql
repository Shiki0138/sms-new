-- 美容サロン管理システム - データベースクリーンアップと再セットアップ
-- このスクリプトは既存のテーブルを削除して新しく作り直します

-- 1. 既存のテーブルを削除（依存関係の順序で削除）
DROP TABLE IF EXISTS plan_usage CASCADE;
DROP TABLE IF EXISTS business_settings CASCADE;
DROP TABLE IF EXISTS reservations CASCADE;
DROP TABLE IF EXISTS service_menus CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS user_tenant_mapping CASCADE;
DROP TABLE IF EXISTS tenants CASCADE;

-- 2. 既存の関数を削除
DROP FUNCTION IF EXISTS generate_ulid() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- 3. 新しいスキーマを適用（database-schema.sqlの内容）

-- ULID生成関数（PostgreSQL用）
CREATE OR REPLACE FUNCTION generate_ulid() RETURNS TEXT AS $$
DECLARE
    timestamp_part BIGINT;
    random_part TEXT;
BEGIN
    -- 現在時刻をミリ秒で取得
    timestamp_part := EXTRACT(EPOCH FROM NOW()) * 1000;
    
    -- ランダム部分を生成（簡易版）
    random_part := LPAD(TO_HEX((RANDOM() * 4294967295)::BIGINT), 8, '0') ||
                   LPAD(TO_HEX((RANDOM() * 4294967295)::BIGINT), 8, '0') ||
                   LPAD(TO_HEX((RANDOM() * 65535)::BIGINT), 4, '0');
    
    RETURN LPAD(TO_HEX(timestamp_part), 12, '0') || UPPER(random_part);
END;
$$ LANGUAGE plpgsql;

-- 1. テナント（サロン）テーブル
CREATE TABLE tenants (
    id TEXT PRIMARY KEY DEFAULT generate_ulid(),
    name TEXT NOT NULL,
    plan TEXT DEFAULT 'light' CHECK (plan IN ('light', 'standard', 'premium')),
    phone_number TEXT,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. ユーザー・テナント関連テーブル
CREATE TABLE user_tenant_mapping (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'owner' CHECK (role IN ('owner', 'staff')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, tenant_id)
);

-- 3. 顧客テーブル
CREATE TABLE customers (
    id TEXT PRIMARY KEY DEFAULT generate_ulid(),
    tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone_number TEXT,
    email TEXT,
    notes TEXT,
    visit_count INTEGER DEFAULT 0,
    last_visit_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. サービスメニューテーブル
CREATE TABLE service_menus (
    id TEXT PRIMARY KEY DEFAULT generate_ulid(),
    tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT,
    duration INTEGER NOT NULL, -- 分単位
    price DECIMAL(10,2) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. 予約テーブル
CREATE TABLE reservations (
    id TEXT PRIMARY KEY DEFAULT generate_ulid(),
    tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id TEXT REFERENCES customers(id) ON DELETE CASCADE,
    staff_id TEXT, -- ライトプランでは1名のみなので外部キー制約なし
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    menu_content TEXT NOT NULL,
    status TEXT DEFAULT 'TENTATIVE' CHECK (
        status IN ('TENTATIVE', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW')
    ),
    price DECIMAL(10,2),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. 営業設定テーブル
CREATE TABLE business_settings (
    id TEXT PRIMARY KEY DEFAULT generate_ulid(),
    tenant_id TEXT UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
    business_hours JSONB NOT NULL DEFAULT '{}', -- 曜日別営業時間
    weekly_closed_days INTEGER[] DEFAULT '{}', -- 定休日 [0-6] (日曜=0)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. プラン使用状況テーブル
CREATE TABLE plan_usage (
    id TEXT PRIMARY KEY DEFAULT generate_ulid(),
    tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
    month DATE NOT NULL, -- YYYY-MM-01形式
    customer_count INTEGER DEFAULT 0,
    reservation_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, month)
);

-- インデックス作成
CREATE INDEX idx_reservations_tenant_date ON reservations(tenant_id, start_time);
CREATE INDEX idx_customers_tenant_name ON customers(tenant_id, name);
CREATE INDEX idx_reservations_status ON reservations(tenant_id, status);
CREATE INDEX idx_user_tenant_mapping_user ON user_tenant_mapping(user_id);
CREATE INDEX idx_service_menus_tenant_active ON service_menus(tenant_id, is_active);

-- Row Level Security (RLS) 有効化
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_usage ENABLE ROW LEVEL SECURITY;

-- RLS ポリシー作成
-- テナントアクセスポリシー
CREATE POLICY "Users can only access their tenant" ON tenants
    FOR ALL USING (
        id IN (
            SELECT tenant_id FROM user_tenant_mapping 
            WHERE user_id = auth.uid()
        )
    );

-- 顧客アクセスポリシー
CREATE POLICY "Users can only access their tenant's customers" ON customers
    FOR ALL USING (
        tenant_id IN (
            SELECT tenant_id FROM user_tenant_mapping 
            WHERE user_id = auth.uid()
        )
    );

-- 予約アクセスポリシー
CREATE POLICY "Users can only access their tenant's reservations" ON reservations
    FOR ALL USING (
        tenant_id IN (
            SELECT tenant_id FROM user_tenant_mapping 
            WHERE user_id = auth.uid()
        )
    );

-- サービスメニューアクセスポリシー
CREATE POLICY "Users can only access their tenant's menus" ON service_menus
    FOR ALL USING (
        tenant_id IN (
            SELECT tenant_id FROM user_tenant_mapping 
            WHERE user_id = auth.uid()
        )
    );

-- 営業設定アクセスポリシー
CREATE POLICY "Users can only access their tenant's settings" ON business_settings
    FOR ALL USING (
        tenant_id IN (
            SELECT tenant_id FROM user_tenant_mapping 
            WHERE user_id = auth.uid()
        )
    );

-- プラン使用状況アクセスポリシー
CREATE POLICY "Users can only access their tenant's usage" ON plan_usage
    FOR ALL USING (
        tenant_id IN (
            SELECT tenant_id FROM user_tenant_mapping 
            WHERE user_id = auth.uid()
        )
    );

-- 更新時刻自動更新のトリガー関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 更新時刻自動更新トリガー
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_service_menus_updated_at BEFORE UPDATE ON service_menus
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reservations_updated_at BEFORE UPDATE ON reservations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_business_settings_updated_at BEFORE UPDATE ON business_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- テーブルへのコメント追加
COMMENT ON TABLE tenants IS 'サロン（テナント）情報';
COMMENT ON TABLE user_tenant_mapping IS 'ユーザーとテナントの関連';
COMMENT ON TABLE customers IS '顧客情報';
COMMENT ON TABLE service_menus IS 'サービスメニュー';
COMMENT ON TABLE reservations IS '予約情報';
COMMENT ON TABLE business_settings IS '営業設定';
COMMENT ON TABLE plan_usage IS 'プラン使用状況';

-- 完了メッセージ
DO $$
BEGIN
    RAISE NOTICE 'データベースのクリーンアップと再セットアップが完了しました。';
END $$;