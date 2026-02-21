-- ============================================================
-- CREATE TEST ORDER DATA - FIXED
-- FIXED: Added required timestamp fields for all tables
-- ============================================================

-- Get the restaurant ID that our user is associated with
WITH user_restaurant AS (
  SELECT restaurant_id
  FROM user_roles
  WHERE user_id = '83b1edb4-66c4-4ae6-9cd6-c7e6ff78a46e'
),

-- Create test customers
customer_inserts AS (
  INSERT INTO customers (
    restaurant_id,
    phone,
    name,
    created_at,
    updated_at
  )
  SELECT
    ur.restaurant_id,
    customer_data.phone,
    customer_data.name,
    NOW(),
    NOW()
  FROM user_restaurant ur,
  (VALUES
    ('+233123456789', 'John Doe'),
    ('+233987654321', 'Jane Smith'),
    ('+233555666777', 'Mike Johnson')
  ) AS customer_data(phone, name)
  ON CONFLICT (phone, restaurant_id) DO UPDATE SET
    name = EXCLUDED.name,
    updated_at = NOW()
  RETURNING id, phone, name
)

-- Create test orders
INSERT INTO orders (
  order_number,
  customer_id,
  restaurant_id,
  total_amount,
  status,
  payment_status,
  delivery_address,
  customer_notes,
  created_at,
  updated_at
)
SELECT
  'ORD-' || LPAD(generate_series(1, 5)::text, 4, '0'),
  c.id,
  ur.restaurant_id,
  order_data.total_amount,
  order_data.status::"OrderStatus",
  order_data.payment_status::"PaymentStatus",
  order_data.delivery_address,
  order_data.notes,
  NOW() - (order_data.hours_ago || ' hours')::interval,
  NOW() - (order_data.hours_ago || ' hours')::interval
FROM user_restaurant ur,
     customer_inserts c,
(VALUES
  (45.50, 'PENDING', 'UNPAID', '123 Main St, Accra', 'Please ring doorbell', 1),
  (32.99, 'CONFIRMED', 'PENDING_VERIFICATION', '456 Oak Ave, Tema', 'Leave at front door', 2),
  (67.50, 'PREPARING', 'VERIFIED', '789 Pine St, Kumasi', null, 3),
  (28.99, 'READY', 'VERIFIED', '321 Elm St, Cape Coast', 'Call when arrived', 6),
  (89.99, 'COMPLETED', 'VERIFIED', '654 Cedar Rd, Takoradi', null, 24)
) AS order_data(total_amount, status, payment_status, delivery_address, notes, hours_ago)
WHERE c.phone IN ('+233123456789', '+233987654321', '+233555666777')
ON CONFLICT (order_number) DO NOTHING;

-- Add order items to make orders realistic
WITH recent_orders AS (
  SELECT o.id as order_id, o.order_number, o.total_amount
  FROM orders o
  JOIN user_roles ur ON ur.restaurant_id = o.restaurant_id
  WHERE ur.user_id = '83b1edb4-66c4-4ae6-9cd6-c7e6ff78a46e'
  ORDER BY o.created_at DESC
  LIMIT 5
),
menu_items_available AS (
  SELECT mi.id, mi.name, mi.price
  FROM menu_items mi
  JOIN menu_categories mc ON mc.id = mi.category_id
  JOIN user_roles ur ON ur.restaurant_id = mc.restaurant_id
  WHERE ur.user_id = '83b1edb4-66c4-4ae6-9cd6-c7e6ff78a46e'
  LIMIT 3
)

INSERT INTO order_items (
  order_id,
  menu_item_id,
  item_name,
  item_price,
  quantity,
  subtotal,
  created_at
)
SELECT
  ro.order_id,
  mia.id,
  mia.name,
  mia.price,
  (CASE WHEN random() > 0.5 THEN 2 ELSE 1 END),
  mia.price * (CASE WHEN random() > 0.5 THEN 2 ELSE 1 END),
  NOW()
FROM recent_orders ro
CROSS JOIN menu_items_available mia
WHERE random() > 0.3  -- Randomly include some items
ON CONFLICT DO NOTHING;

-- Verification
SELECT 'VERIFICATION - Orders created:' as section;
SELECT
  o.order_number,
  c.name as customer,
  o.total_amount,
  o.status,
  o.payment_status,
  COUNT(oi.id) as item_count,
  o.created_at
FROM orders o
JOIN customers c ON c.id = o.customer_id
LEFT JOIN order_items oi ON oi.order_id = o.id
WHERE o.restaurant_id = (
  SELECT restaurant_id FROM user_roles
  WHERE user_id = '83b1edb4-66c4-4ae6-9cd6-c7e6ff78a46e'
)
GROUP BY o.id, o.order_number, c.name, o.total_amount, o.status, o.payment_status, o.created_at
ORDER BY o.created_at DESC;