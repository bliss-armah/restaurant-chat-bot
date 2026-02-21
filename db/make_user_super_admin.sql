-- ============================================================
-- MAKE USER SUPER ADMIN
-- Changes your user role from RESTAURANT_ADMIN to SUPER_ADMIN
-- ============================================================

-- Update your user role to SUPER_ADMIN
UPDATE user_roles
SET
  role = 'SUPER_ADMIN',
  restaurant_id = NULL,  -- Super admins are not tied to a specific restaurant
  updated_at = NOW()
WHERE user_id = '83b1edb4-66c4-4ae6-9cd6-c7e6ff78a46e';

-- Also update the users table for consistency (if record exists)
UPDATE users
SET
  role = 'SUPER_ADMIN',
  restaurant_id = NULL,
  updated_at = NOW()
WHERE id = '83b1edb4-66c4-4ae6-9cd6-c7e6ff78a46e';

-- Verify the change
SELECT 'UPDATED USER ROLE:' as status;
SELECT user_id, role, restaurant_id, updated_at
FROM user_roles
WHERE user_id = '83b1edb4-66c4-4ae6-9cd6-c7e6ff78a46e';

-- Show what this means
SELECT 'AS SUPER_ADMIN YOU CAN NOW:' as privileges;
SELECT
  'View all restaurants: ' || COUNT(*) || ' restaurants' as access_level
FROM restaurants;

SELECT
  'Manage all menu categories: ' || COUNT(*) || ' categories across all restaurants' as access_level
FROM menu_categories;

SELECT
  'View all orders: ' || COUNT(*) || ' orders across all restaurants' as access_level
FROM orders;