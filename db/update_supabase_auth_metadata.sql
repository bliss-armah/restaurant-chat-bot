-- ============================================================
-- UPDATE SUPABASE AUTH USER METADATA
-- Updates both the user_roles table AND the Supabase Auth metadata
-- for complete consistency
-- ============================================================

-- 1. Update the user_roles table (this is what your dashboard actually uses)
UPDATE user_roles
SET
  role = 'SUPER_ADMIN',
  restaurant_id = NULL,
  updated_at = NOW()
WHERE user_id = '83b1edb4-66c4-4ae6-9cd6-c7e6ff78a46e';

-- 2. Update the users table for consistency
UPDATE users
SET
  role = 'SUPER_ADMIN',
  restaurant_id = NULL,
  updated_at = NOW()
WHERE id = '83b1edb4-66c4-4ae6-9cd6-c7e6ff78a46e';

-- 3. Update the Supabase Auth user metadata (for consistency)
-- This updates the auth.users.raw_user_meta_data field
UPDATE auth.users
SET
  raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) ||
    jsonb_build_object(
      'role', 'SUPER_ADMIN',
      'restaurantId', null
    ),
  updated_at = NOW()
WHERE id = '83b1edb4-66c4-4ae6-9cd6-c7e6ff78a46e';

-- 4. Verification - Check all three places
SELECT '=== USER_ROLES TABLE (THIS IS WHAT DASHBOARD USES) ===' as source;
SELECT user_id, role, restaurant_id, updated_at
FROM user_roles
WHERE user_id = '83b1edb4-66c4-4ae6-9cd6-c7e6ff78a46e';

SELECT '=== USERS TABLE ===' as source;
SELECT id, role, restaurant_id, updated_at
FROM users
WHERE id = '83b1edb4-66c4-4ae6-9cd6-c7e6ff78a46e';

SELECT '=== SUPABASE AUTH METADATA ===' as source;
SELECT
  id,
  email,
  raw_user_meta_data->>'role' as metadata_role,
  raw_user_meta_data->>'restaurantId' as metadata_restaurant_id,
  updated_at
FROM auth.users
WHERE id = '83b1edb4-66c4-4ae6-9cd6-c7e6ff78a46e';