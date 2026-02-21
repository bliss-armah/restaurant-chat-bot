-- ============================================================
-- AUTO-GENERATE ALL DATABASE DEFAULTS
-- ============================================================
-- This script enables PostgreSQL to auto-generate:
-- 1. UUIDs for all IDs
-- 2. Timestamps for created_at
-- 3. Timestamps for updated_at
--
-- USAGE: Run this in Supabase SQL Editor
-- ============================================================

-- Step 1: Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- RESTAURANTS TABLE
-- ============================================================
ALTER TABLE restaurants 
  ALTER COLUMN id SET DEFAULT gen_random_uuid()::text,
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET DEFAULT now();

-- Trigger for auto-updating updated_at on restaurants
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_restaurants_updated_at ON restaurants;
CREATE TRIGGER update_restaurants_updated_at
  BEFORE UPDATE ON restaurants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- USERS TABLE
-- ============================================================
ALTER TABLE users 
  ALTER COLUMN id SET DEFAULT gen_random_uuid()::text,
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET DEFAULT now();

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- CUSTOMERS TABLE
-- ============================================================
ALTER TABLE customers 
  ALTER COLUMN id SET DEFAULT gen_random_uuid()::text,
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET DEFAULT now();

DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- MENU_CATEGORIES TABLE
-- ============================================================
ALTER TABLE menu_categories 
  ALTER COLUMN id SET DEFAULT gen_random_uuid()::text,
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET DEFAULT now();

DROP TRIGGER IF EXISTS update_menu_categories_updated_at ON menu_categories;
CREATE TRIGGER update_menu_categories_updated_at
  BEFORE UPDATE ON menu_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- MENU_ITEMS TABLE
-- ============================================================
ALTER TABLE menu_items 
  ALTER COLUMN id SET DEFAULT gen_random_uuid()::text,
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET DEFAULT now();

DROP TRIGGER IF EXISTS update_menu_items_updated_at ON menu_items;
CREATE TRIGGER update_menu_items_updated_at
  BEFORE UPDATE ON menu_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- ORDERS TABLE
-- ============================================================
ALTER TABLE orders 
  ALTER COLUMN id SET DEFAULT gen_random_uuid()::text,
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET DEFAULT now();

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- ORDER_ITEMS TABLE
-- ============================================================
ALTER TABLE order_items 
  ALTER COLUMN id SET DEFAULT gen_random_uuid()::text,
  ALTER COLUMN created_at SET DEFAULT now();

-- Note: order_items doesn't have updated_at in schema

-- ============================================================
-- CONVERSATIONS TABLE
-- ============================================================
ALTER TABLE conversations 
  ALTER COLUMN id SET DEFAULT gen_random_uuid()::text,
  ALTER COLUMN last_message_at SET DEFAULT now(),
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET DEFAULT now();

DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- VERIFICATION: Check that defaults are set
-- ============================================================
SELECT 
  table_name,
  column_name,
  column_default
FROM information_schema.columns
WHERE 
  table_schema = 'public' 
  AND (column_name IN ('id', 'created_at', 'updated_at', 'last_message_at'))
  AND table_name IN (
    'restaurants', 'users', 'customers', 
    'menu_categories', 'menu_items', 
    'orders', 'order_items', 'conversations'
  )
ORDER BY table_name, column_name;

-- ============================================================
-- TEST: Try inserting without specifying auto fields
-- ============================================================
/*
-- Test restaurant creation (no id, created_at, updated_at needed!)
INSERT INTO restaurants (name, phone, momo_number, momo_name) 
VALUES ('Test Restaurant', '+233999999999', '0999999999', 'Test Name');

-- Verify auto-generated fields
SELECT id, name, created_at, updated_at 
FROM restaurants 
WHERE name = 'Test Restaurant';

-- Clean up
DELETE FROM restaurants WHERE name = 'Test Restaurant';
*/

-- ============================================================
-- DONE! ✅
-- ============================================================
-- All tables now auto-generate:
-- ✅ id (UUID)
-- ✅ created_at (current timestamp)
-- ✅ updated_at (current timestamp, auto-updates on changes)
-- ✅ last_message_at (for conversations)
--
-- No need to specify these fields in INSERT or UPDATE!
-- ============================================================
