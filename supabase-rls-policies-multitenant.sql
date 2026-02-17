-- ============================================
-- MULTI-TENANT ROW-LEVEL SECURITY POLICIES
-- ============================================
-- Run this SQL in Supabase SQL Editor

-- Enable RLS on all tables
ALTER TABLE "restaurants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "menu_categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "menu_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "order_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "customers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "conversations" ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RESTAURANT POLICIES
-- ============================================

-- Super admin can see all restaurants
CREATE POLICY "super_admin_all_restaurants"
  ON "restaurants"
  FOR ALL
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'SUPER_ADMIN'
  );

-- Restaurant admin can see only their restaurant
CREATE POLICY "restaurant_admin_own_restaurant"
  ON "restaurants"
  FOR SELECT
  TO authenticated
  USING (
    id = (auth.jwt() -> 'user_metadata' ->> 'restaurantId')
  );

-- Restaurant admin can update own restaurant
CREATE POLICY "restaurant_admin_update_own"
  ON "restaurants"
  FOR UPDATE
  TO authenticated
  USING (
    id = (auth.jwt() -> 'user_metadata' ->> 'restaurantId')
  );

-- ============================================
-- MENU CATEGORY POLICIES
-- ============================================

-- Super admin sees all categories
CREATE POLICY "super_admin_all_categories"
  ON "menu_categories"
  FOR ALL
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'SUPER_ADMIN'
  );

-- Restaurant admin manages own categories
CREATE POLICY "restaurant_admin_own_categories"
  ON "menu_categories"
  FOR ALL
  TO authenticated
  USING (
    restaurant_id = (auth.jwt() -> 'user_metadata' ->> 'restaurantId')
  );

-- ============================================
-- MENU ITEM POLICIES
-- ============================================

-- Super admin sees all menu items  
CREATE POLICY "super_admin_all_menu_items"
  ON "menu_items"
  FOR ALL
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'SUPER_ADMIN'
  );

-- Restaurant admin manages own menu items (via category)
CREATE POLICY "restaurant_admin_own_menu_items"
  ON "menu_items"
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "menu_categories"
      WHERE "menu_categories".id = "menu_items".category_id
      AND "menu_categories".restaurant_id = (auth.jwt() -> 'user_metadata' ->> 'restaurantId')
    )
  );

-- ============================================
-- ORDER POLICIES
-- ============================================

-- Super admin sees all orders
CREATE POLICY "super_admin_all_orders"
  ON "orders"
  FOR ALL
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'SUPER_ADMIN'
  );

-- Restaurant admin sees only their orders
CREATE POLICY "restaurant_admin_own_orders"
  ON "orders"
  FOR ALL
  TO authenticated
  USING (
    restaurant_id = (auth.jwt() -> 'user_metadata' ->> 'restaurantId')
  );

-- ============================================
-- ORDER ITEM POLICIES
-- ============================================

-- Super admin sees all order items
CREATE POLICY "super_admin_all_order_items"
  ON "order_items"
  FOR ALL
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'SUPER_ADMIN'
  );

-- Restaurant admin sees own order items (via order)
CREATE POLICY "restaurant_admin_own_order_items"
  ON "order_items"
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "orders"
      WHERE "orders".id = "order_items".order_id
      AND "orders".restaurant_id = (auth.jwt() -> 'user_metadata' ->> 'restaurantId')
    )
  );

-- ============================================
-- CUSTOMER POLICIES
-- ============================================

-- Super admin sees all customers
CREATE POLICY "super_admin_all_customers"
  ON "customers"
  FOR ALL
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'SUPER_ADMIN'
  );

-- Restaurant admin sees only their customers
CREATE POLICY "restaurant_admin_own_customers"
  ON "customers"
  FOR ALL
  TO authenticated
  USING (
    restaurant_id = (auth.jwt() -> 'user_metadata' ->> 'restaurantId')
  );

-- ============================================
-- CONVERSATION POLICIES
-- ============================================

-- Super admin sees all conversations
CREATE POLICY "super_admin_all_conversations"
  ON "conversations"
  FOR ALL
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'SUPER_ADMIN'
  );

-- Restaurant admin sees own conversations
CREATE POLICY "restaurant_admin_own_conversations"
  ON "conversations"
  FOR ALL
  TO authenticated
  USING (
    restaurant_id = (auth.jwt() -> 'user_metadata' ->> 'restaurantId')
  );

-- ============================================
-- NOTE: Backend uses service_role key which bypasses RLS
-- These policies only affect dashboard Supabase client queries
-- ============================================
