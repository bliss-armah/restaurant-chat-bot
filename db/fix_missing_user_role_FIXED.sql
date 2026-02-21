-- ============================================================
-- FIX: Create missing user_roles record for your auth user
-- FIXED: Added missing updated_at value for restaurants table
-- ============================================================

-- First, let's check what exists
SELECT 'Current auth users:' as info;
SELECT id, email, created_at FROM auth.users;

SELECT 'Current user_roles:' as info;
SELECT user_id, role, restaurant_id FROM user_roles;

SELECT 'Current restaurants:' as info;
SELECT id, name FROM restaurants;

-- Check if the specific user exists
SELECT 'Checking user 83b1edb4-66c4-4ae6-9cd6-c7e6ff78a46e:' as info;
SELECT id, email FROM auth.users WHERE id = '83b1edb4-66c4-4ae6-9cd6-c7e6ff78a46e';

-- Create a test restaurant if none exists
-- FIXED: Added created_at and updated_at values
INSERT INTO restaurants (
  id,
  name,
  description,
  phone,
  email,
  momo_number,
  momo_name,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  'Demo Restaurant',
  'Demo restaurant for testing',
  '+233123456789',
  'demo@restaurant.com',
  '+233123456789',
  'Demo Owner',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM restaurants LIMIT 1);

-- Now create the missing user_roles record
-- This uses the first available restaurant
INSERT INTO user_roles (user_id, role, restaurant_id, created_at, updated_at)
SELECT
  '83b1edb4-66c4-4ae6-9cd6-c7e6ff78a46e'::UUID,
  'RESTAURANT_ADMIN',
  r.id,
  NOW(),
  NOW()
FROM restaurants r
LIMIT 1
ON CONFLICT (user_id) DO UPDATE SET
  role = 'RESTAURANT_ADMIN',
  restaurant_id = EXCLUDED.restaurant_id,
  updated_at = NOW();

-- Verify the fix
SELECT 'FIXED - User roles after insert:' as info;
SELECT user_id, role, restaurant_id FROM user_roles
WHERE user_id = '83b1edb4-66c4-4ae6-9cd6-c7e6ff78a46e';

-- Also create a users table record if needed (for consistency)
INSERT INTO users (
  id,
  email,
  password,
  name,
  role,
  restaurant_id,
  created_at,
  updated_at
)
SELECT
  '83b1edb4-66c4-4ae6-9cd6-c7e6ff78a46e'::UUID,
  au.email,
  'placeholder_hash',
  COALESCE(au.raw_user_meta_data->>'name', 'Dashboard User'),
  'RESTAURANT_ADMIN',
  ur.restaurant_id,
  NOW(),
  NOW()
FROM auth.users au
JOIN user_roles ur ON ur.user_id = au.id
WHERE au.id = '83b1edb4-66c4-4ae6-9cd6-c7e6ff78a46e'
ON CONFLICT (id) DO UPDATE SET
  restaurant_id = EXCLUDED.restaurant_id,
  role = EXCLUDED.role,
  updated_at = NOW();