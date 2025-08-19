-- Add Standard Plan Features Tables

-- Smart Upselling Feature Tables
CREATE TABLE IF NOT EXISTS upselling_suggestions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    service_id INT NOT NULL,
    suggestion_reason TEXT,
    potential_revenue DECIMAL(10, 2),
    confidence_score DECIMAL(3, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
    INDEX idx_customer_status (customer_id, status),
    INDEX idx_created_at (created_at)
);

CREATE TABLE IF NOT EXISTS customer_purchase_analysis (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    service_category VARCHAR(100),
    frequency INT DEFAULT 0,
    avg_spending DECIMAL(10, 2),
    last_purchase_date DATE,
    preference_score DECIMAL(3, 2),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    UNIQUE KEY unique_customer_category (customer_id, service_category)
);

-- Membership Management Tables
CREATE TABLE IF NOT EXISTS membership_tiers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    monthly_price DECIMAL(10, 2) NOT NULL,
    benefits JSON,
    discount_percentage DECIMAL(5, 2) DEFAULT 0,
    priority_booking BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customer_memberships (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    tier_id INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    auto_renew BOOLEAN DEFAULT TRUE,
    status ENUM('active', 'cancelled', 'expired', 'pending') DEFAULT 'active',
    payment_method VARCHAR(50),
    next_billing_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (tier_id) REFERENCES membership_tiers(id) ON DELETE RESTRICT,
    INDEX idx_customer_status (customer_id, status),
    INDEX idx_next_billing (next_billing_date, status)
);

CREATE TABLE IF NOT EXISTS membership_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    membership_id INT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    transaction_type ENUM('subscription', 'renewal', 'refund') NOT NULL,
    payment_status ENUM('success', 'failed', 'pending') DEFAULT 'success',
    payment_reference VARCHAR(255),
    FOREIGN KEY (membership_id) REFERENCES customer_memberships(id) ON DELETE CASCADE,
    INDEX idx_membership_date (membership_id, transaction_date)
);

-- Referral Tracking Tables
CREATE TABLE IF NOT EXISTS referrals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    referrer_id INT NOT NULL,
    referred_customer_id INT,
    referral_code VARCHAR(50) UNIQUE NOT NULL,
    referred_name VARCHAR(255),
    referred_phone VARCHAR(20),
    referred_email VARCHAR(255),
    status ENUM('pending', 'converted', 'expired') DEFAULT 'pending',
    conversion_date TIMESTAMP NULL,
    reward_type ENUM('discount', 'credit', 'service') DEFAULT 'discount',
    reward_value DECIMAL(10, 2),
    reward_status ENUM('pending', 'issued', 'used') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,
    FOREIGN KEY (referrer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (referred_customer_id) REFERENCES customers(id) ON DELETE SET NULL,
    INDEX idx_referrer (referrer_id),
    INDEX idx_code (referral_code),
    INDEX idx_status (status)
);

CREATE TABLE IF NOT EXISTS referral_rewards (
    id INT AUTO_INCREMENT PRIMARY KEY,
    referral_id INT NOT NULL,
    customer_id INT NOT NULL,
    reward_type ENUM('discount', 'credit', 'service') NOT NULL,
    reward_value DECIMAL(10, 2) NOT NULL,
    used_date TIMESTAMP NULL,
    expires_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (referral_id) REFERENCES referrals(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    INDEX idx_customer_reward (customer_id, used_date)
);

-- Basic Inventory Management Tables
CREATE TABLE IF NOT EXISTS product_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    parent_category_id INT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_category_id) REFERENCES product_categories(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category_id INT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    sku VARCHAR(100) UNIQUE,
    barcode VARCHAR(100),
    unit_price DECIMAL(10, 2) NOT NULL,
    cost_price DECIMAL(10, 2),
    current_stock INT DEFAULT 0,
    min_stock_level INT DEFAULT 10,
    max_stock_level INT DEFAULT 100,
    unit_of_measure VARCHAR(50) DEFAULT 'piece',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES product_categories(id) ON DELETE SET NULL,
    INDEX idx_sku (sku),
    INDEX idx_barcode (barcode),
    INDEX idx_stock_level (current_stock, min_stock_level)
);

CREATE TABLE IF NOT EXISTS inventory_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    transaction_type ENUM('purchase', 'sale', 'adjustment', 'return') NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10, 2),
    total_amount DECIMAL(10, 2),
    reference_type ENUM('appointment', 'pos', 'manual', 'supplier') DEFAULT 'manual',
    reference_id INT,
    notes TEXT,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_product_date (product_id, created_at),
    INDEX idx_type (transaction_type)
);

CREATE TABLE IF NOT EXISTS product_suppliers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    supplier_name VARCHAR(255) NOT NULL,
    supplier_contact VARCHAR(255),
    supplier_email VARCHAR(255),
    lead_time_days INT DEFAULT 7,
    min_order_quantity INT DEFAULT 1,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_product_supplier (product_id, is_primary)
);

-- Add plan features configuration
CREATE TABLE IF NOT EXISTS plan_features (
    id INT AUTO_INCREMENT PRIMARY KEY,
    plan_name ENUM('light', 'standard', 'premium') NOT NULL,
    feature_name VARCHAR(100) NOT NULL,
    is_enabled BOOLEAN DEFAULT TRUE,
    feature_limit INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_plan_feature (plan_name, feature_name)
);

-- Insert default plan features
INSERT INTO plan_features (plan_name, feature_name, is_enabled, feature_limit) VALUES
-- Light Plan Features
('light', 'basic_booking', TRUE, NULL),
('light', 'customer_management', TRUE, NULL),
('light', 'basic_messaging', TRUE, 100),
('light', 'basic_analytics', TRUE, NULL),
-- Standard Plan Features (includes all Light features)
('standard', 'basic_booking', TRUE, NULL),
('standard', 'customer_management', TRUE, NULL),
('standard', 'basic_messaging', TRUE, 500),
('standard', 'basic_analytics', TRUE, NULL),
('standard', 'smart_upselling', TRUE, NULL),
('standard', 'membership_management', TRUE, NULL),
('standard', 'referral_tracking', TRUE, NULL),
('standard', 'inventory_management', TRUE, NULL),
-- Premium Plan Features (includes all Standard features)
('premium', 'basic_booking', TRUE, NULL),
('premium', 'customer_management', TRUE, NULL),
('premium', 'basic_messaging', TRUE, NULL),
('premium', 'basic_analytics', TRUE, NULL),
('premium', 'smart_upselling', TRUE, NULL),
('premium', 'membership_management', TRUE, NULL),
('premium', 'referral_tracking', TRUE, NULL),
('premium', 'inventory_management', TRUE, NULL),
('premium', 'advanced_analytics', TRUE, NULL),
('premium', 'api_access', TRUE, NULL),
('premium', 'white_label', TRUE, NULL),
('premium', 'priority_support', TRUE, NULL);

-- Add indexes for performance
CREATE INDEX idx_upselling_created ON upselling_suggestions(created_at);
CREATE INDEX idx_membership_customer ON customer_memberships(customer_id);
CREATE INDEX idx_referral_expires ON referrals(expires_at);
CREATE INDEX idx_inventory_stock ON products(current_stock);