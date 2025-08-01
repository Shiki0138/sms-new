-- =====================================
-- API統合テストステータス追加
-- =====================================

-- api_integrationsテーブルに接続テストステータスカラムを追加
ALTER TABLE api_integrations 
ADD COLUMN IF NOT EXISTS last_test_status VARCHAR(20) CHECK (last_test_status IN ('success', 'failed', 'pending')),
ADD COLUMN IF NOT EXISTS last_test_message TEXT;

-- デフォルト値を設定
UPDATE api_integrations 
SET last_test_status = 'pending' 
WHERE last_test_status IS NULL;