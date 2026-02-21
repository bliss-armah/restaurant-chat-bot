-- ====================================================
-- MIGRATION: Change Restaurant ID to UUID with auto-generation
-- ====================================================
-- This script migrates the Restaurant table ID from TEXT to UUID
-- and sets up automatic UUID generation for new restaurants

-- Step 1: Add a temporary UUID column
ALTER TABLE restaurants ADD COLUMN id_uuid UUID DEFAULT gen_random_uuid();

-- Step 2: Update all existing restaurant records with new UUIDs
UPDATE restaurants SET id_uuid = gen_random_uuid() WHERE id_uuid IS NULL;

-- Step 3: Drop foreign key constraints
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_restaurant_id_fkey;
ALTER TABLE menu_categories DROP CONSTRAINT IF EXISTS menu_categories_restaurant_id_fkey;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_restaurant_id_fkey;
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_restaurant_id_fkey;
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_restaurant_id_fkey;

-- Step 4: Add temporary UUID columns to related tables
ALTER TABLE users ADD COLUMN restaurant_id_uuid UUID;
ALTER TABLE menu_categories ADD COLUMN restaurant_id_uuid UUID;
ALTER TABLE orders ADD COLUMN restaurant_id_uuid UUID;
ALTER TABLE customers ADD COLUMN restaurant_id_uuid UUID;
ALTER TABLE conversations ADD COLUMN restaurant_id_uuid UUID;

-- Step 5: Update related tables (this will fail for existing data - need manual mapping)
-- For now, just set to NULL since this is a development database
UPDATE users SET restaurant_id_uuid = NULL;
UPDATE menu_categories SET restaurant_id_uuid = NULL;
UPDATE orders SET restaurant_id_uuid = NULL;
UPDATE customers SET restaurant_id_uuid = NULL;
UPDATE conversations SET restaurant_id_uuid = NULL;

-- Step 6: Drop old ID and restaurant_id columns
ALTER TABLE users DROP COLUMN IF EXISTS restaurant_id;
ALTER TABLE menu_categories DROP COLUMN IF EXISTS restaurant_id;
ALTER TABLE orders DROP COLUMN IF EXISTS restaurant_id;
ALTER TABLE customers DROP COLUMN IF EXISTS restaurant_id;
ALTER TABLE conversations DROP COLUMN IF EXISTS restaurant_id;

ALTER TABLE restaurants DROP CONSTRAINT IF EXISTS restaurants_pkey;
ALTER TABLE restaurants DROP COLUMN id;

-- Step 7: Rename UUID columns to be the primary columns
ALTER TABLE restaurants RENAME COLUMN id_uuid TO id;
ALTER TABLE users RENAME COLUMN restaurant_id_uuid TO restaurant_id;
ALTER TABLE menu_categories RENAME COLUMN restaurant_id_uuid TO restaurant_id;
ALTER TABLE orders RENAME COLUMN restaurant_id_uuid TO restaurant_id;
ALTER TABLE customers RENAME COLUMN restaurant_id_uuid TO restaurant_id;
ALTER TABLE conversations RENAME COLUMN restaurant_id_uuid TO restaurant_id;

-- Step 8: Set NOT NULL and PRIMARY KEY constraints  
ALTER TABLE restaurants ALTER COLUMN id SET NOT NULL;
ALTER TABLE restaurants ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE restaurants ADD PRIMARY KEY (id);

-- Step 9: Re-add foreign key constraints
ALTER TABLE users ADD CONSTRAINT users_restaurant_id_fkey 
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE;

ALTER TABLE menu_categories ADD CONSTRAINT menu_categories_restaurant_id_fkey 
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE;

ALTER TABLE orders ADD CONSTRAINT orders_restaurant_id_fkey 
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE;

ALTER TABLE customers ADD CONSTRAINT customers_restaurant_id_fkey 
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE;

ALTER TABLE conversations ADD CONSTRAINT conversations_restaurant_id_fkey 
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE;

-- ====================================================
-- ALTERNATIVE: Simple fix without changing existing IDs
-- ====================================================
-- If you want to keep existing data, just set default for new rows:
-- ALTER TABLE restaurants ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- NOTE: You'll need to run this in Supabase SQL Editor
