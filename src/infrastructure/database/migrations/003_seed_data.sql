-- =============================================
-- Migration: 003_seed_data
-- Description: Sample data for development and testing
-- WARNING: Do NOT run in production!
-- =============================================

-- =============================================
-- 1. USERS (Sample accounts)
-- =============================================
-- Password for all users: Test@123456
-- Hash generated with bcrypt (you may need to regenerate based on your hashing method)

INSERT INTO users (id, email, password_hash, first_name, last_name, role, is_active, is_email_verified, created_at)
VALUES 
    -- Super Admin
    ('a47ac10b-58cc-4372-a567-0e02b2c3d001', 'admin@example.com', 
     '$2b$10$rQZ8K8Y8Y8Y8Y8Y8Y8Y8YOxJxJxJxJxJxJxJxJxJxJxJxJxJxJxJx', 
     'Super', 'Admin', 'SUPER_ADMIN', TRUE, TRUE, NOW()),
    
    -- Admin
    ('a47ac10b-58cc-4372-a567-0e02b2c3d002', 'admin2@example.com', 
     '$2b$10$rQZ8K8Y8Y8Y8Y8Y8Y8Y8YOxJxJxJxJxJxJxJxJxJxJxJxJxJxJxJx', 
     'John', 'Admin', 'ADMIN', TRUE, TRUE, NOW()),
    
    -- Manager
    ('a47ac10b-58cc-4372-a567-0e02b2c3d003', 'manager@example.com', 
     '$2b$10$rQZ8K8Y8Y8Y8Y8Y8Y8Y8YOxJxJxJxJxJxJxJxJxJxJxJxJxJxJxJx', 
     'Jane', 'Manager', 'MANAGER', TRUE, TRUE, NOW()),
    
    -- Staff
    ('a47ac10b-58cc-4372-a567-0e02b2c3d004', 'staff@example.com', 
     '$2b$10$rQZ8K8Y8Y8Y8Y8Y8Y8Y8YOxJxJxJxJxJxJxJxJxJxJxJxJxJxJxJx', 
     'Bob', 'Staff', 'STAFF', TRUE, TRUE, NOW()),
    
    -- Customers
    ('c47ac10b-58cc-4372-a567-0e02b2c3d001', 'customer1@example.com', 
     '$2b$10$rQZ8K8Y8Y8Y8Y8Y8Y8Y8YOxJxJxJxJxJxJxJxJxJxJxJxJxJxJxJx', 
     'Alice', 'Customer', 'CUSTOMER', TRUE, TRUE, NOW()),
    
    ('c47ac10b-58cc-4372-a567-0e02b2c3d002', 'customer2@example.com', 
     '$2b$10$rQZ8K8Y8Y8Y8Y8Y8Y8Y8YOxJxJxJxJxJxJxJxJxJxJxJxJxJxJxJx', 
     'Charlie', 'Brown', 'CUSTOMER', TRUE, TRUE, NOW()),
    
    ('c47ac10b-58cc-4372-a567-0e02b2c3d003', 'customer3@example.com', 
     '$2b$10$rQZ8K8Y8Y8Y8Y8Y8Y8Y8YOxJxJxJxJxJxJxJxJxJxJxJxJxJxJxJx', 
     'Diana', 'Prince', 'CUSTOMER', TRUE, FALSE, NOW())

ON CONFLICT (email) DO NOTHING;

-- =============================================
-- 2. PRODUCTS TABLE (if not exists)
-- =============================================

CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    category VARCHAR(100),
    sku VARCHAR(50) UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);

-- Sample Products
INSERT INTO products (id, name, description, price, stock_quantity, category, sku)
VALUES 
    ('f47ac10b-58cc-4372-a567-0e02b2c3d001', 'Laptop Pro 15', 'High-performance laptop with 15" display', 1299.99, 50, 'Electronics', 'LAPTOP-001'),
    ('f47ac10b-58cc-4372-a567-0e02b2c3d002', 'Wireless Mouse', 'Ergonomic wireless mouse', 29.99, 200, 'Electronics', 'MOUSE-001'),
    ('f47ac10b-58cc-4372-a567-0e02b2c3d003', 'USB-C Hub', '7-in-1 USB-C Hub', 49.99, 150, 'Electronics', 'HUB-001'),
    ('f47ac10b-58cc-4372-a567-0e02b2c3d004', 'Mechanical Keyboard', 'RGB Mechanical Gaming Keyboard', 89.99, 100, 'Electronics', 'KB-001'),
    ('f47ac10b-58cc-4372-a567-0e02b2c3d005', 'Monitor 27"', '4K IPS Monitor', 399.99, 30, 'Electronics', 'MON-001'),
    ('f47ac10b-58cc-4372-a567-0e02b2c3d006', 'Webcam HD', '1080p HD Webcam', 59.99, 80, 'Electronics', 'CAM-001'),
    ('f47ac10b-58cc-4372-a567-0e02b2c3d007', 'Headphones', 'Noise-cancelling Wireless Headphones', 199.99, 60, 'Audio', 'HEAD-001'),
    ('f47ac10b-58cc-4372-a567-0e02b2c3d008', 'Bluetooth Speaker', 'Portable Bluetooth Speaker', 79.99, 120, 'Audio', 'SPK-001'),
    ('f47ac10b-58cc-4372-a567-0e02b2c3d009', 'Phone Stand', 'Adjustable Phone Stand', 19.99, 300, 'Accessories', 'STAND-001'),
    ('f47ac10b-58cc-4372-a567-0e02b2c3d010', 'Laptop Bag', '15" Laptop Backpack', 49.99, 100, 'Accessories', 'BAG-001')
ON CONFLICT (sku) DO NOTHING;

-- =============================================
-- 3. ORDERS TABLE (if not exists)
-- =============================================

CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    order_number VARCHAR(50) NOT NULL UNIQUE,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    total_amount DECIMAL(12, 2) NOT NULL,
    shipping_address TEXT,
    billing_address TEXT,
    payment_method VARCHAR(50),
    payment_status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT orders_status_check CHECK (status IN ('PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED')),
    CONSTRAINT orders_payment_status_check CHECK (payment_status IN ('PENDING', 'PAID', 'FAILED', 'REFUNDED'))
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);

-- Sample Orders
INSERT INTO orders (id, user_id, order_number, status, total_amount, shipping_address, payment_method, payment_status, created_at)
VALUES 
    ('d47ac10b-58cc-4372-a567-0e02b2c3d001', 'c47ac10b-58cc-4372-a567-0e02b2c3d001', 'ORD-2024-0001', 'DELIVERED', 1329.98, '123 Main St, Bangkok 10100', 'CREDIT_CARD', 'PAID', NOW() - INTERVAL '30 days'),
    ('d47ac10b-58cc-4372-a567-0e02b2c3d002', 'c47ac10b-58cc-4372-a567-0e02b2c3d001', 'ORD-2024-0002', 'SHIPPED', 89.99, '123 Main St, Bangkok 10100', 'CREDIT_CARD', 'PAID', NOW() - INTERVAL '7 days'),
    ('d47ac10b-58cc-4372-a567-0e02b2c3d003', 'c47ac10b-58cc-4372-a567-0e02b2c3d002', 'ORD-2024-0003', 'PROCESSING', 449.98, '456 Oak Ave, Chiang Mai 50000', 'BANK_TRANSFER', 'PAID', NOW() - INTERVAL '3 days'),
    ('d47ac10b-58cc-4372-a567-0e02b2c3d004', 'c47ac10b-58cc-4372-a567-0e02b2c3d002', 'ORD-2024-0004', 'PENDING', 199.99, '456 Oak Ave, Chiang Mai 50000', 'CREDIT_CARD', 'PENDING', NOW() - INTERVAL '1 day'),
    ('d47ac10b-58cc-4372-a567-0e02b2c3d005', 'c47ac10b-58cc-4372-a567-0e02b2c3d003', 'ORD-2024-0005', 'CANCELLED', 79.99, '789 Pine Rd, Phuket 83000', 'PROMPTPAY', 'REFUNDED', NOW() - INTERVAL '14 days')
ON CONFLICT (order_number) DO NOTHING;

-- =============================================
-- 4. ORDER ITEMS TABLE (if not exists)
-- =============================================

CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    product_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

-- Sample Order Items
INSERT INTO order_items (id, order_id, product_id, product_name, quantity, unit_price, total_price)
VALUES 
    -- Order 1 items
    ('e47ac10b-58cc-4372-a567-0e02b2c3d001', 'd47ac10b-58cc-4372-a567-0e02b2c3d001', 'f47ac10b-58cc-4372-a567-0e02b2c3d001', 'Laptop Pro 15', 1, 1299.99, 1299.99),
    ('e47ac10b-58cc-4372-a567-0e02b2c3d002', 'd47ac10b-58cc-4372-a567-0e02b2c3d001', 'f47ac10b-58cc-4372-a567-0e02b2c3d002', 'Wireless Mouse', 1, 29.99, 29.99),
    
    -- Order 2 items
    ('e47ac10b-58cc-4372-a567-0e02b2c3d003', 'd47ac10b-58cc-4372-a567-0e02b2c3d002', 'f47ac10b-58cc-4372-a567-0e02b2c3d004', 'Mechanical Keyboard', 1, 89.99, 89.99),
    
    -- Order 3 items
    ('e47ac10b-58cc-4372-a567-0e02b2c3d004', 'd47ac10b-58cc-4372-a567-0e02b2c3d003', 'f47ac10b-58cc-4372-a567-0e02b2c3d005', 'Monitor 27"', 1, 399.99, 399.99),
    ('e47ac10b-58cc-4372-a567-0e02b2c3d005', 'd47ac10b-58cc-4372-a567-0e02b2c3d003', 'f47ac10b-58cc-4372-a567-0e02b2c3d003', 'USB-C Hub', 1, 49.99, 49.99),
    
    -- Order 4 items
    ('e47ac10b-58cc-4372-a567-0e02b2c3d006', 'd47ac10b-58cc-4372-a567-0e02b2c3d004', 'f47ac10b-58cc-4372-a567-0e02b2c3d007', 'Headphones', 1, 199.99, 199.99),
    
    -- Order 5 items
    ('e47ac10b-58cc-4372-a567-0e02b2c3d007', 'd47ac10b-58cc-4372-a567-0e02b2c3d005', 'f47ac10b-58cc-4372-a567-0e02b2c3d008', 'Bluetooth Speaker', 1, 79.99, 79.99)
ON CONFLICT DO NOTHING;

-- =============================================
-- 5. SAMPLE AUDIT LOGS
-- =============================================

INSERT INTO audit_logs (id, user_id, user_email, action, severity, resource, resource_id, description, ip_address, success, created_at)
VALUES 
    ('b47ac10b-58cc-4372-a567-0e02b2c3d001', 'a47ac10b-58cc-4372-a567-0e02b2c3d001', 'admin@example.com', 'LOGIN_SUCCESS', 'INFO', 'auth', NULL, 'Admin logged in successfully', '127.0.0.1', TRUE, NOW() - INTERVAL '1 hour'),
    ('b47ac10b-58cc-4372-a567-0e02b2c3d002', 'c47ac10b-58cc-4372-a567-0e02b2c3d001', 'customer1@example.com', 'ORDER_CREATED', 'INFO', 'orders', 'd47ac10b-58cc-4372-a567-0e02b2c3d001', 'Order ORD-2024-0001 created', '192.168.1.100', TRUE, NOW() - INTERVAL '30 days'),
    ('b47ac10b-58cc-4372-a567-0e02b2c3d003', 'c47ac10b-58cc-4372-a567-0e02b2c3d001', 'customer1@example.com', 'PAYMENT_PROCESSED', 'INFO', 'payments', 'd47ac10b-58cc-4372-a567-0e02b2c3d001', 'Payment processed for order ORD-2024-0001', '192.168.1.100', TRUE, NOW() - INTERVAL '30 days'),
    ('b47ac10b-58cc-4372-a567-0e02b2c3d004', NULL, 'unknown@hacker.com', 'LOGIN_FAILED', 'WARNING', 'auth', NULL, 'Failed login attempt', '10.0.0.1', FALSE, NOW() - INTERVAL '2 hours'),
    ('b47ac10b-58cc-4372-a567-0e02b2c3d005', 'a47ac10b-58cc-4372-a567-0e02b2c3d002', 'admin2@example.com', 'USER_CREATED', 'INFO', 'users', 'c47ac10b-58cc-4372-a567-0e02b2c3d003', 'New customer account created', '127.0.0.1', TRUE, NOW() - INTERVAL '7 days')
ON CONFLICT DO NOTHING;

-- =============================================
-- 6. SUMMARY
-- =============================================
-- Users: 7 (1 Super Admin, 1 Admin, 1 Manager, 1 Staff, 3 Customers)
-- Products: 10
-- Orders: 5
-- Order Items: 7
-- Audit Logs: 5

-- Test accounts:
-- admin@example.com (SUPER_ADMIN)
-- admin2@example.com (ADMIN)
-- manager@example.com (MANAGER)
-- staff@example.com (STAFF)
-- customer1@example.com (CUSTOMER)
-- customer2@example.com (CUSTOMER)
-- customer3@example.com (CUSTOMER - not verified)
