-- ============================================================
-- CREATE TEST MENU DATA - FIXED
-- FIXED: Added required timestamp fields for all tables
-- ============================================================

-- Get the restaurant ID that our user is associated with
WITH user_restaurant AS (
  SELECT restaurant_id
  FROM user_roles
  WHERE user_id = '83b1edb4-66c4-4ae6-9cd6-c7e6ff78a46e'
)

-- Create test categories
INSERT INTO menu_categories (
  restaurant_id,
  name,
  description,
  sort_order,
  is_active,
  created_at,
  updated_at
)
SELECT
  ur.restaurant_id,
  category_data.name,
  category_data.description,
  category_data.sort_order,
  true,
  NOW(),
  NOW()
FROM user_restaurant ur,
(VALUES
  ('Appetizers', 'Start your meal with our delicious appetizers', 1),
  ('Main Dishes', 'Our signature main courses', 2),
  ('Desserts', 'Sweet endings to your meal', 3),
  ('Beverages', 'Refreshing drinks and beverages', 4)
) AS category_data(name, description, sort_order)
ON CONFLICT DO NOTHING;

-- Create test menu items
INSERT INTO menu_items (
  category_id,
  name,
  description,
  price,
  is_available,
  sort_order,
  created_at,
  updated_at
)
SELECT
  mc.id,
  item_data.name,
  item_data.description,
  item_data.price,
  true,
  item_data.sort_order,
  NOW(),
  NOW()
FROM menu_categories mc,
(VALUES
  ('Appetizers', 'Spring Rolls', 'Fresh vegetables wrapped in crispy rolls', 12.99, 1),
  ('Appetizers', 'Chicken Wings', '6 pieces of spicy buffalo wings', 15.99, 2),
  ('Main Dishes', 'Grilled Chicken', 'Herb-seasoned grilled chicken breast', 24.99, 1),
  ('Main Dishes', 'Beef Stir Fry', 'Tender beef with fresh vegetables', 28.99, 2),
  ('Main Dishes', 'Vegetarian Pasta', 'Fresh pasta with seasonal vegetables', 19.99, 3),
  ('Desserts', 'Chocolate Cake', 'Rich chocolate cake with vanilla ice cream', 8.99, 1),
  ('Desserts', 'Fruit Salad', 'Fresh seasonal fruit mix', 6.99, 2),
  ('Beverages', 'Fresh Orange Juice', 'Freshly squeezed orange juice', 5.99, 1),
  ('Beverages', 'Iced Coffee', 'Cold brew coffee with milk', 4.99, 2),
  ('Beverages', 'Sparkling Water', 'Refreshing sparkling mineral water', 3.99, 3)
) AS item_data(category_name, name, description, price, sort_order)
WHERE mc.name = item_data.category_name
  AND mc.restaurant_id = (
    SELECT restaurant_id FROM user_roles
    WHERE user_id = '83b1edb4-66c4-4ae6-9cd6-c7e6ff78a46e'
  )
ON CONFLICT DO NOTHING;

-- Verify what we created
SELECT 'VERIFICATION - Categories created:' as section;
SELECT mc.name, mc.description, COUNT(mi.id) as item_count
FROM menu_categories mc
LEFT JOIN menu_items mi ON mi.category_id = mc.id
WHERE mc.restaurant_id = (
  SELECT restaurant_id FROM user_roles
  WHERE user_id = '83b1edb4-66c4-4ae6-9cd6-c7e6ff78a46e'
)
GROUP BY mc.id, mc.name, mc.description
ORDER BY mc.sort_order;

SELECT 'VERIFICATION - Menu items created:' as section;
SELECT mc.name as category, mi.name as item, mi.price
FROM menu_items mi
JOIN menu_categories mc ON mi.category_id = mc.id
WHERE mc.restaurant_id = (
  SELECT restaurant_id FROM user_roles
  WHERE user_id = '83b1edb4-66c4-4ae6-9cd6-c7e6ff78a46e'
)
ORDER BY mc.sort_order, mi.sort_order;