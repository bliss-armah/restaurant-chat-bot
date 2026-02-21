-- ============================================================
-- CREATE TEST DATA - SUPER SIMPLE VERSION
-- Uses database defaults, so minimal fields required
-- Run AFTER add_database_defaults.sql
-- ============================================================

-- ============================================
-- 1. CREATE RESTAURANT (only required fields)
-- ============================================

INSERT INTO restaurants (name, phone, momo_number, momo_name)
VALUES ('Demo Restaurant', '+233123456789', '+233123456789', 'Demo Owner')
ON CONFLICT DO NOTHING;

-- ============================================
-- 2. CREATE USER ROLE (minimal fields)
-- ============================================

INSERT INTO user_roles (user_id, role, restaurant_id)
SELECT
  '83b1edb4-66c4-4ae6-9cd6-c7e6ff78a46e'::UUID,
  'RESTAURANT_ADMIN',
  r.id
FROM restaurants r
WHERE r.name = 'Demo Restaurant'
ON CONFLICT (user_id) DO UPDATE SET
  restaurant_id = EXCLUDED.restaurant_id;

-- ============================================
-- 3. CREATE MENU CATEGORIES (minimal fields)
-- ============================================

INSERT INTO menu_categories (restaurant_id, name, description, sort_order)
SELECT r.id, category_data.name, category_data.description, category_data.sort_order
FROM restaurants r,
(VALUES
  ('Appetizers', 'Start your meal right', 1),
  ('Main Dishes', 'Our signature dishes', 2),
  ('Desserts', 'Sweet endings', 3),
  ('Beverages', 'Refreshing drinks', 4)
) AS category_data(name, description, sort_order)
WHERE r.name = 'Demo Restaurant'
ON CONFLICT DO NOTHING;

-- ============================================
-- 4. CREATE MENU ITEMS (minimal fields)
-- ============================================

INSERT INTO menu_items (category_id, name, description, price, sort_order)
SELECT mc.id, item_data.name, item_data.description, item_data.price, item_data.sort_order
FROM menu_categories mc,
(VALUES
  ('Appetizers', 'Spring Rolls', 'Fresh veggie rolls', 12.99, 1),
  ('Appetizers', 'Chicken Wings', '6 spicy wings', 15.99, 2),
  ('Main Dishes', 'Grilled Chicken', 'Herb-seasoned chicken', 24.99, 1),
  ('Main Dishes', 'Beef Stir Fry', 'Tender beef with veggies', 28.99, 2),
  ('Main Dishes', 'Veggie Pasta', 'Fresh pasta with vegetables', 19.99, 3),
  ('Desserts', 'Chocolate Cake', 'Rich chocolate cake', 8.99, 1),
  ('Desserts', 'Fruit Salad', 'Fresh seasonal fruits', 6.99, 2),
  ('Beverages', 'Orange Juice', 'Fresh squeezed', 5.99, 1),
  ('Beverages', 'Iced Coffee', 'Cold brew coffee', 4.99, 2),
  ('Beverages', 'Sparkling Water', 'Refreshing water', 3.99, 3)
) AS item_data(category_name, name, description, price, sort_order)
JOIN restaurants r ON r.name = 'Demo Restaurant'
WHERE mc.name = item_data.category_name
  AND mc.restaurant_id = r.id
ON CONFLICT DO NOTHING;

-- ============================================
-- 5. CREATE CUSTOMERS (minimal fields)
-- ============================================

INSERT INTO customers (restaurant_id, phone, name)
SELECT r.id, customer_data.phone, customer_data.name
FROM restaurants r,
(VALUES
  ('+233123456789', 'John Doe'),
  ('+233987654321', 'Jane Smith'),
  ('+233555666777', 'Mike Johnson')
) AS customer_data(phone, name)
WHERE r.name = 'Demo Restaurant'
ON CONFLICT DO NOTHING;

-- ============================================
-- 6. CREATE ORDERS (minimal fields)
-- ============================================

INSERT INTO orders (order_number, customer_id, restaurant_id, total_amount, status, payment_status, created_at)
SELECT
  'ORD-' || LPAD(ROW_NUMBER() OVER()::text, 4, '0'),
  c.id,
  r.id,
  order_data.total_amount,
  order_data.status::"OrderStatus",
  order_data.payment_status::"PaymentStatus",
  NOW() - (order_data.hours_ago || ' hours')::interval
FROM restaurants r
CROSS JOIN customers c
CROSS JOIN (VALUES
  (45.50, 'PENDING', 'UNPAID', 1),
  (32.99, 'CONFIRMED', 'PENDING_VERIFICATION', 2),
  (67.50, 'PREPARING', 'VERIFIED', 3),
  (28.99, 'READY', 'VERIFIED', 6),
  (89.99, 'COMPLETED', 'VERIFIED', 24)
) AS order_data(total_amount, status, payment_status, hours_ago)
WHERE r.name = 'Demo Restaurant'
  AND c.restaurant_id = r.id
  AND c.phone = '+233123456789' -- Just use first customer for all orders
ON CONFLICT DO NOTHING;

-- ============================================
-- 7. CREATE ORDER ITEMS (minimal fields)
-- ============================================

INSERT INTO order_items (order_id, menu_item_id, item_name, item_price, quantity, subtotal)
SELECT
  o.id,
  mi.id,
  mi.name,
  mi.price,
  1, -- quantity
  mi.price -- subtotal
FROM orders o
JOIN restaurants r ON r.id = o.restaurant_id
JOIN menu_categories mc ON mc.restaurant_id = r.id
JOIN menu_items mi ON mi.category_id = mc.id
WHERE r.name = 'Demo Restaurant'
  AND random() > 0.6  -- Randomly add some items
ON CONFLICT DO NOTHING;

-- ============================================
-- VERIFICATION
-- ============================================

SELECT '=== VERIFICATION: Data Created Successfully ===' as status;

SELECT 'Restaurants:' as table_name, COUNT(*) as count FROM restaurants
WHERE name = 'Demo Restaurant'
UNION ALL
SELECT 'User Roles:', COUNT(*) FROM user_roles
WHERE user_id = '83b1edb4-66c4-4ae6-9cd6-c7e6ff78a46e'
UNION ALL
SELECT 'Categories:', COUNT(*) FROM menu_categories mc
JOIN restaurants r ON r.id = mc.restaurant_id
WHERE r.name = 'Demo Restaurant'
UNION ALL
SELECT 'Menu Items:', COUNT(*) FROM menu_items mi
JOIN menu_categories mc ON mc.id = mi.category_id
JOIN restaurants r ON r.id = mc.restaurant_id
WHERE r.name = 'Demo Restaurant'
UNION ALL
SELECT 'Customers:', COUNT(*) FROM customers c
JOIN restaurants r ON r.id = c.restaurant_id
WHERE r.name = 'Demo Restaurant'
UNION ALL
SELECT 'Orders:', COUNT(*) FROM orders o
JOIN restaurants r ON r.id = o.restaurant_id
WHERE r.name = 'Demo Restaurant'
UNION ALL
SELECT 'Order Items:', COUNT(*) FROM order_items oi
JOIN orders o ON o.id = oi.order_id
JOIN restaurants r ON r.id = o.restaurant_id
WHERE r.name = 'Demo Restaurant';

SELECT '=== Your user role is ready! ===' as status;
SELECT user_id, role, restaurant_id FROM user_roles
WHERE user_id = '83b1edb4-66c4-4ae6-9cd6-c7e6ff78a46e';