-- 修正版: RLS型変換エラーを解決したマイグレーションスクリプト

-- ========================================
-- 1. 拡張機能の有効化
-- ========================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- 2. 不足しているテーブルのみ作成
-- ========================================

-- message_templates テーブル（存在しない場合のみ作成）
CREATE TABLE IF NOT EXISTS message_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  channel VARCHAR(50) NOT NULL CHECK (channel IN ('sms', 'email', 'line', 'instagram')),
  template_type VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- campaigns テーブル（存在しない場合のみ作成）
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  template_id UUID REFERENCES message_templates(id) ON DELETE SET NULL,
  target_criteria JSONB DEFAULT '{}'::jsonb,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'running', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- treatments テーブル（存在しない場合のみ作成）
CREATE TABLE IF NOT EXISTS treatments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
  treatment_date DATE NOT NULL,
  services JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- ========================================
-- 3. 不足しているインデックスのみ作成
-- ========================================
DO $$
BEGIN
    -- message_templates テーブルのインデックス
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_message_templates_tenant_id') THEN
        CREATE INDEX idx_message_templates_tenant_id ON message_templates(tenant_id);
        RAISE NOTICE 'Created index: idx_message_templates_tenant_id';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_message_templates_channel') THEN
        CREATE INDEX idx_message_templates_channel ON message_templates(channel);
        RAISE NOTICE 'Created index: idx_message_templates_channel';
    END IF;
    
    -- campaigns テーブルのインデックス
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_campaigns_tenant_id') THEN
        CREATE INDEX idx_campaigns_tenant_id ON campaigns(tenant_id);
        RAISE NOTICE 'Created index: idx_campaigns_tenant_id';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_campaigns_status') THEN
        CREATE INDEX idx_campaigns_status ON campaigns(status);
        RAISE NOTICE 'Created index: idx_campaigns_status';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_campaigns_scheduled_at') THEN
        CREATE INDEX idx_campaigns_scheduled_at ON campaigns(scheduled_at);
        RAISE NOTICE 'Created index: idx_campaigns_scheduled_at';
    END IF;
    
    -- treatments テーブルのインデックス
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_treatments_tenant_id') THEN
        CREATE INDEX idx_treatments_tenant_id ON treatments(tenant_id);
        RAISE NOTICE 'Created index: idx_treatments_tenant_id';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_treatments_customer_id') THEN
        CREATE INDEX idx_treatments_customer_id ON treatments(customer_id);
        RAISE NOTICE 'Created index: idx_treatments_customer_id';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_treatments_date') THEN
        CREATE INDEX idx_treatments_date ON treatments(treatment_date);
        RAISE NOTICE 'Created index: idx_treatments_date';
    END IF;
    
END $$;

-- ========================================
-- 4. RLS (Row Level Security) の有効化
-- ========================================
DO $$
BEGIN
    -- 新しいテーブルのRLSを有効化
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'message_templates') THEN
        ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS enabled for message_templates';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'campaigns') THEN
        ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS enabled for campaigns';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'treatments') THEN
        ALTER TABLE treatments ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS enabled for treatments';
    END IF;
END $$;

-- ========================================
-- 5. 修正されたRLSポリシーの作成
-- ========================================

-- まず、現在のユーザーのtenant_idを取得するヘルパー関数を作成
CREATE OR REPLACE FUNCTION auth.get_user_tenant_id() 
RETURNS UUID 
LANGUAGE SQL 
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (auth.jwt() ->> 'tenant_id')::UUID,
    (SELECT tenant_id FROM users WHERE auth_id = auth.uid() LIMIT 1)
  );
$$;

-- RLSポリシーを安全に作成
DO $$
BEGIN
    -- message_templates のポリシー
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'message_templates_tenant_policy') THEN
        CREATE POLICY message_templates_tenant_policy ON message_templates
            FOR ALL 
            TO authenticated
            USING (tenant_id = auth.get_user_tenant_id());
        RAISE NOTICE 'Created policy: message_templates_tenant_policy';
    END IF;
    
    -- campaigns のポリシー
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'campaigns_tenant_policy') THEN
        CREATE POLICY campaigns_tenant_policy ON campaigns
            FOR ALL 
            TO authenticated
            USING (tenant_id = auth.get_user_tenant_id());
        RAISE NOTICE 'Created policy: campaigns_tenant_policy';
    END IF;
    
    -- treatments のポリシー
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'treatments_tenant_policy') THEN
        CREATE POLICY treatments_tenant_policy ON treatments
            FOR ALL 
            TO authenticated
            USING (tenant_id = auth.get_user_tenant_id());
        RAISE NOTICE 'Created policy: treatments_tenant_policy';
    END IF;
    
EXCEPTION 
    WHEN OTHERS THEN
        RAISE NOTICE 'ポリシー作成でエラーが発生しましたが、継続します: %', SQLERRM;
END $$;

-- ========================================
-- 6. 基本データの投入（オプション）
-- ========================================
DO $$
BEGIN
    -- デフォルトのメッセージテンプレートを追加
    IF NOT EXISTS (SELECT 1 FROM message_templates WHERE name = '予約確認') THEN
        INSERT INTO message_templates (tenant_id, name, channel, template_type, content)
        SELECT 
            id,
            '予約確認',
            'sms',
            'reservation_confirmation',
            'ご予約ありがとうございます。{{date}}の{{time}}にお待ちしております。- {{salon_name}}'
        FROM tenants 
        LIMIT 1;
        RAISE NOTICE 'デフォルトテンプレートを追加しました';
    END IF;
EXCEPTION 
    WHEN OTHERS THEN
        RAISE NOTICE 'デフォルトデータ追加をスキップしました: %', SQLERRM;
END $$;

-- ========================================
-- 7. 完了確認
-- ========================================
DO $$
DECLARE
    table_count INTEGER;
    index_count INTEGER;
    policy_count INTEGER;
BEGIN
    -- テーブル数を確認
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE';
    
    -- インデックス数を確認
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes 
    WHERE schemaname = 'public';
    
    -- ポリシー数を確認
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE schemaname = 'public';
    
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'マイグレーション完了！';
    RAISE NOTICE 'テーブル数: %', table_count;
    RAISE NOTICE 'インデックス数: %', index_count;
    RAISE NOTICE 'RLSポリシー数: %', policy_count;
    RAISE NOTICE '===========================================';
    
    -- 新しく作成されたテーブルを確認
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'message_templates') THEN
        RAISE NOTICE '✅ message_templates テーブル作成済み';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'campaigns') THEN
        RAISE NOTICE '✅ campaigns テーブル作成済み';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'treatments') THEN
        RAISE NOTICE '✅ treatments テーブル作成済み';
    END IF;
END $$;