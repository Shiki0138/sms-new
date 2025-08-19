-- シンプル版: RLSポリシーなしのマイグレーションスクリプト
-- 基本的なテーブル作成のみに集中

-- ========================================
-- 1. 拡張機能の有効化
-- ========================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- 2. 不足しているテーブルのみ作成
-- ========================================

-- message_templates テーブル
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

-- campaigns テーブル
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

-- treatments テーブル
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
-- 3. インデックスの作成
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
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_message_templates_active') THEN
        CREATE INDEX idx_message_templates_active ON message_templates(is_active);
        RAISE NOTICE 'Created index: idx_message_templates_active';
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
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_treatments_staff_id') THEN
        CREATE INDEX idx_treatments_staff_id ON treatments(staff_id);
        RAISE NOTICE 'Created index: idx_treatments_staff_id';
    END IF;
    
END $$;

-- ========================================
-- 4. RLS有効化のみ（ポリシーは後で設定）
-- ========================================
DO $$
BEGIN
    -- 新しいテーブルのRLSを有効化
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'message_templates') THEN
        ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS enabled for message_templates (ポリシーは後で設定してください)';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'campaigns') THEN
        ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS enabled for campaigns (ポリシーは後で設定してください)';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'treatments') THEN
        ALTER TABLE treatments ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS enabled for treatments (ポリシーは後で設定してください)';
    END IF;
END $$;

-- ========================================
-- 5. デフォルトデータの投入
-- ========================================
DO $$
DECLARE
    first_tenant_id UUID;
BEGIN
    -- 最初のテナントIDを取得
    SELECT id INTO first_tenant_id FROM tenants LIMIT 1;
    
    IF first_tenant_id IS NOT NULL THEN
        -- 基本的なメッセージテンプレートを追加
        INSERT INTO message_templates (tenant_id, name, channel, template_type, content) VALUES
        (first_tenant_id, '予約確認SMS', 'sms', 'reservation_confirmation', 'ご予約ありがとうございます。{{date}}の{{time}}にお待ちしております。'),
        (first_tenant_id, '予約リマインダー', 'sms', 'reminder', '明日{{time}}からご予約をいただいております。お気をつけてお越しください。'),
        (first_tenant_id, 'キャンセル確認', 'sms', 'cancellation', 'ご予約をキャンセルいたしました。またのご利用をお待ちしております。')
        ON CONFLICT DO NOTHING;
        
        RAISE NOTICE 'デフォルトのメッセージテンプレートを追加しました (tenant_id: %)', first_tenant_id;
    ELSE
        RAISE NOTICE 'テナントが見つからないため、デフォルトデータの追加をスキップしました';
    END IF;
    
EXCEPTION 
    WHEN OTHERS THEN
        RAISE NOTICE 'デフォルトデータ追加でエラーが発生しました: %', SQLERRM;
END $$;

-- ========================================
-- 6. 完了確認とサマリー
-- ========================================
DO $$
DECLARE
    table_count INTEGER;
    new_table_count INTEGER;
    index_count INTEGER;
BEGIN
    -- 全テーブル数を確認
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE';
    
    -- 新しく作成されたテーブル数を確認
    SELECT COUNT(*) INTO new_table_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    AND table_name IN ('message_templates', 'campaigns', 'treatments');
    
    -- インデックス数を確認
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes 
    WHERE schemaname = 'public'
    AND indexname LIKE 'idx_message_templates_%' 
    OR indexname LIKE 'idx_campaigns_%'
    OR indexname LIKE 'idx_treatments_%';
    
    RAISE NOTICE '===========================================';
    RAISE NOTICE '🎉 マイグレーション完了！';
    RAISE NOTICE '===========================================';
    RAISE NOTICE '📊 統計情報:';
    RAISE NOTICE '  - 全テーブル数: %', table_count;
    RAISE NOTICE '  - 新規テーブル数: %', new_table_count;
    RAISE NOTICE '  - 新規インデックス数: %', index_count;
    RAISE NOTICE '===========================================';
    
    -- 作成されたテーブルの詳細
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'message_templates') THEN
        RAISE NOTICE '✅ message_templates: メッセージテンプレート管理';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'campaigns') THEN
        RAISE NOTICE '✅ campaigns: マーケティングキャンペーン管理';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'treatments') THEN
        RAISE NOTICE '✅ treatments: 施術記録管理';
    END IF;
    
    RAISE NOTICE '===========================================';
    RAISE NOTICE '⚠️  次のステップ:';
    RAISE NOTICE '1. RLSポリシーの設定（Supabase Dashboard）';
    RAISE NOTICE '2. アプリケーションとの接続テスト';
    RAISE NOTICE '3. SMS機能の統合テスト';
    RAISE NOTICE '===========================================';
END $$;