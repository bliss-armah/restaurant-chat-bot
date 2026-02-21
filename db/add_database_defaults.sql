-- ============================================================
-- ADD DATABASE-LEVEL DEFAULT VALUES
-- Purpose: Make all NOT NULL fields auto-populate with sensible defaults
-- This allows simple INSERTs without worrying about constraint violations
-- ============================================================

-- ============================================
-- RESTAURANTS TABLE DEFAULTS
-- ============================================

-- UUIDs auto-generate
ALTER TABLE restaurants
ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Timestamps auto-populate
ALTER TABLE restaurants
ALTER COLUMN created_at SET DEFAULT NOW();

ALTER TABLE restaurants
ALTER COLUMN updated_at SET DEFAULT NOW();

-- Boolean defaults
ALTER TABLE restaurants
ALTER COLUMN is_active SET DEFAULT true;

-- String defaults
ALTER TABLE restaurants
ALTER COLUMN subscription_status SET DEFAULT 'TRIAL';

-- ============================================
-- USERS TABLE DEFAULTS
-- ============================================

ALTER TABLE users
ALTER COLUMN id SET DEFAULT gen_random_uuid();

ALTER TABLE users
ALTER COLUMN created_at SET DEFAULT NOW();

ALTER TABLE users
ALTER COLUMN updated_at SET DEFAULT NOW();

ALTER TABLE users
ALTER COLUMN is_active SET DEFAULT true;

ALTER TABLE users
ALTER COLUMN role SET DEFAULT 'RESTAURANT_ADMIN';

-- ============================================
-- USER_ROLES TABLE DEFAULTS
-- ============================================

ALTER TABLE user_roles
ALTER COLUMN id SET DEFAULT gen_random_uuid();

ALTER TABLE user_roles
ALTER COLUMN created_at SET DEFAULT NOW();

ALTER TABLE user_roles
ALTER COLUMN updated_at SET DEFAULT NOW();

-- ============================================
-- CUSTOMERS TABLE DEFAULTS
-- ============================================

ALTER TABLE customers
ALTER COLUMN id SET DEFAULT gen_random_uuid();

ALTER TABLE customers
ALTER COLUMN created_at SET DEFAULT NOW();

ALTER TABLE customers
ALTER COLUMN updated_at SET DEFAULT NOW();

-- ============================================
-- MENU_CATEGORIES TABLE DEFAULTS
-- ============================================

ALTER TABLE menu_categories
ALTER COLUMN id SET DEFAULT gen_random_uuid();

ALTER TABLE menu_categories
ALTER COLUMN created_at SET DEFAULT NOW();

ALTER TABLE menu_categories
ALTER COLUMN updated_at SET DEFAULT NOW();

ALTER TABLE menu_categories
ALTER COLUMN is_active SET DEFAULT true;

ALTER TABLE menu_categories
ALTER COLUMN sort_order SET DEFAULT 0;

-- ============================================
-- MENU_ITEMS TABLE DEFAULTS
-- ============================================

ALTER TABLE menu_items
ALTER COLUMN id SET DEFAULT gen_random_uuid();

ALTER TABLE menu_items
ALTER COLUMN created_at SET DEFAULT NOW();

ALTER TABLE menu_items
ALTER COLUMN updated_at SET DEFAULT NOW();

ALTER TABLE menu_items
ALTER COLUMN is_available SET DEFAULT true;

ALTER TABLE menu_items
ALTER COLUMN sort_order SET DEFAULT 0;

-- ============================================
-- ORDERS TABLE DEFAULTS
-- ============================================

ALTER TABLE orders
ALTER COLUMN id SET DEFAULT gen_random_uuid();

ALTER TABLE orders
ALTER COLUMN created_at SET DEFAULT NOW();

ALTER TABLE orders
ALTER COLUMN updated_at SET DEFAULT NOW();

ALTER TABLE orders
ALTER COLUMN status SET DEFAULT 'PENDING';

ALTER TABLE orders
ALTER COLUMN payment_status SET DEFAULT 'UNPAID';

-- ============================================
-- ORDER_ITEMS TABLE DEFAULTS
-- ============================================

ALTER TABLE order_items
ALTER COLUMN id SET DEFAULT gen_random_uuid();

ALTER TABLE order_items
ALTER COLUMN created_at SET DEFAULT NOW();

-- ============================================
-- CONVERSATIONS TABLE DEFAULTS
-- ============================================

ALTER TABLE conversations
ALTER COLUMN id SET DEFAULT gen_random_uuid();

ALTER TABLE conversations
ALTER COLUMN created_at SET DEFAULT NOW();

ALTER TABLE conversations
ALTER COLUMN updated_at SET DEFAULT NOW();

ALTER TABLE conversations
ALTER COLUMN state SET DEFAULT 'WELCOME';

ALTER TABLE conversations
ALTER COLUMN last_message_at SET DEFAULT NOW();

-- ============================================
-- CREATE UPDATED_AT TRIGGERS
-- For tables with updated_at fields, auto-update on modification
-- ============================================

-- Create or replace the trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to all relevant tables
DROP TRIGGER IF EXISTS set_restaurants_updated_at ON restaurants;
CREATE TRIGGER set_restaurants_updated_at
  BEFORE UPDATE ON restaurants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_users_updated_at ON users;
CREATE TRIGGER set_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- user_roles trigger already exists from previous migration

DROP TRIGGER IF EXISTS set_customers_updated_at ON customers;
CREATE TRIGGER set_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_menu_categories_updated_at ON menu_categories;
CREATE TRIGGER set_menu_categories_updated_at
  BEFORE UPDATE ON menu_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_menu_items_updated_at ON menu_items;
CREATE TRIGGER set_menu_items_updated_at
  BEFORE UPDATE ON menu_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_orders_updated_at ON orders;
CREATE TRIGGER set_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_conversations_updated_at ON conversations;
CREATE TRIGGER set_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- VERIFICATION: Test simple inserts
-- ============================================================

-- Test restaurant insert (only required fields)
INSERT INTO restaurants (name, phone, momo_number, momo_name)
VALUES ('Test Auto Restaurant', '+233999888777', '+233999888777', 'Auto Test Owner')
ON CONFLICT DO NOTHING;

-- Test user_roles insert (only required fields)
-- INSERT INTO user_roles (user_id, role)
-- VALUES ('00000000-0000-0000-0000-000000000001'::UUID, 'SUPER_ADMIN')
-- ON CONFLICT DO NOTHING;

-- Show what got auto-populated
SELECT 'AUTO-POPULATED RESTAURANT:' as test;
SELECT id, name, phone, is_active, subscription_status, created_at, updated_at
FROM restaurants
WHERE name = 'Test Auto Restaurant';

-- ============================================================
-- MIGRATION COMPLETE
--
-- Now you can do simple inserts like:
-- INSERT INTO restaurants (name, phone, momo_number, momo_name)
-- VALUES ('My Restaurant', '+233123456789', '+233123456789', 'Owner');
--
-- And all other fields (id, timestamps, booleans, etc.) will auto-populate!
-- ============================================================