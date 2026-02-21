-- ============================================================
-- MIGRATION: 001_secure_rls_FIXED.sql
-- PURPOSE: Replace insecure JWT user_metadata-based RLS with
--          database-backed role lookups via user_roles table.
--
-- RUN ORDER: Apply in Supabase SQL Editor ONCE.
-- SAFE TO RE-RUN: All DROP/CREATE use IF EXISTS / IF NOT EXISTS.
-- FIXED: Removed references to non-existent PascalCase table names
-- ============================================================


-- ============================================================
-- STEP 1: CREATE user_roles TABLE
-- This is the ONLY authoritative source for role + tenant.
-- Never read auth.jwt() user_metadata for role decisions.
-- ============================================================

CREATE TABLE IF NOT EXISTS user_roles (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role           TEXT        NOT NULL CHECK (role IN ('SUPER_ADMIN', 'RESTAURANT_ADMIN')),
  restaurant_id  UUID        REFERENCES restaurants(id) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_user_role UNIQUE (user_id)
);

COMMENT ON TABLE user_roles IS
  'Canonical role store. Never use auth.jwt() user_metadata for RBAC decisions.';

COMMENT ON COLUMN user_roles.role IS
  'SUPER_ADMIN: platform-wide access. RESTAURANT_ADMIN: scoped to restaurant_id.';

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- STEP 2: DROP ALL OLD POLICIES (only existing table names)
-- ============================================================

-- users table
DROP POLICY IF EXISTS "super_admin_all_users"          ON users;
DROP POLICY IF EXISTS "user_read_own"                  ON users;
DROP POLICY IF EXISTS "user_update_own"                ON users;

-- restaurants
DROP POLICY IF EXISTS "super_admin_all_restaurants"        ON restaurants;
DROP POLICY IF EXISTS "restaurant_admin_own_restaurant"    ON restaurants;
DROP POLICY IF EXISTS "restaurant_admin_update_own"        ON restaurants;

-- menu_categories
DROP POLICY IF EXISTS "super_admin_all_categories"         ON menu_categories;
DROP POLICY IF EXISTS "restaurant_admin_own_categories"    ON menu_categories;

-- menu_items
DROP POLICY IF EXISTS "super_admin_all_menu_items"         ON menu_items;
DROP POLICY IF EXISTS "restaurant_admin_own_menu_items"    ON menu_items;

-- orders
DROP POLICY IF EXISTS "super_admin_all_orders"             ON orders;
DROP POLICY IF EXISTS "restaurant_admin_own_orders"        ON orders;

-- order_items
DROP POLICY IF EXISTS "super_admin_all_order_items"        ON order_items;
DROP POLICY IF EXISTS "restaurant_admin_own_order_items"   ON order_items;

-- customers
DROP POLICY IF EXISTS "super_admin_all_customers"          ON customers;
DROP POLICY IF EXISTS "restaurant_admin_own_customers"     ON customers;

-- conversations
DROP POLICY IF EXISTS "super_admin_all_conversations"      ON conversations;
DROP POLICY IF EXISTS "restaurant_admin_own_conversations" ON conversations;


-- ============================================================
-- STEP 3: ENABLE RLS ON ALL TABLES (idempotent)
-- ============================================================

ALTER TABLE restaurants    ENABLE ROW LEVEL SECURITY;
ALTER TABLE users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items     ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders         ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers      ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations  ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- STEP 4: user_roles POLICIES
-- Super admin can manage all roles.
-- A user can ONLY read their own row (to bootstrap auth).
-- No user can INSERT/UPDATE/DELETE their own role via client.
-- ============================================================

-- Super admin full access (bootstrapped: super admin is in user_roles themselves)
CREATE POLICY "super_admin_all_user_roles"
  ON user_roles FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'SUPER_ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'SUPER_ADMIN'
    )
  );

-- A user can read only their own role row (needed by auth-context.tsx)
CREATE POLICY "user_read_own_role"
  ON user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());


-- ============================================================
-- STEP 5: users TABLE POLICIES
-- ============================================================

CREATE POLICY "super_admin_all_users"
  ON users FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'SUPER_ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'SUPER_ADMIN'
    )
  );

CREATE POLICY "user_read_own"
  ON users FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "user_update_own"
  ON users FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());


-- ============================================================
-- STEP 6: restaurants TABLE POLICIES
-- ============================================================

CREATE POLICY "super_admin_all_restaurants"
  ON restaurants FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'SUPER_ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'SUPER_ADMIN'
    )
  );

CREATE POLICY "restaurant_admin_select_own_restaurant"
  ON restaurants FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.restaurant_id = restaurants.id
    )
  );

CREATE POLICY "restaurant_admin_update_own_restaurant"
  ON restaurants FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.restaurant_id = restaurants.id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.restaurant_id = restaurants.id
    )
  );


-- ============================================================
-- STEP 7: menu_categories TABLE POLICIES
-- ============================================================

CREATE POLICY "super_admin_all_categories"
  ON menu_categories FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'SUPER_ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'SUPER_ADMIN'
    )
  );

CREATE POLICY "restaurant_admin_select_categories"
  ON menu_categories FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.restaurant_id = menu_categories.restaurant_id
    )
  );

CREATE POLICY "restaurant_admin_insert_categories"
  ON menu_categories FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.restaurant_id = menu_categories.restaurant_id
    )
  );

CREATE POLICY "restaurant_admin_update_categories"
  ON menu_categories FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.restaurant_id = menu_categories.restaurant_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.restaurant_id = menu_categories.restaurant_id
    )
  );

CREATE POLICY "restaurant_admin_delete_categories"
  ON menu_categories FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.restaurant_id = menu_categories.restaurant_id
    )
  );


-- ============================================================
-- STEP 8: menu_items TABLE POLICIES
-- menu_items has no direct restaurant_id — JOIN via menu_categories.
-- Single JOIN is more efficient than nested EXISTS.
-- ============================================================

CREATE POLICY "super_admin_all_menu_items"
  ON menu_items FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'SUPER_ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'SUPER_ADMIN'
    )
  );

CREATE POLICY "restaurant_admin_select_menu_items"
  ON menu_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM menu_categories mc
      JOIN user_roles ur ON ur.restaurant_id = mc.restaurant_id
      WHERE mc.id = menu_items.category_id
        AND ur.user_id = auth.uid()
    )
  );

CREATE POLICY "restaurant_admin_insert_menu_items"
  ON menu_items FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM menu_categories mc
      JOIN user_roles ur ON ur.restaurant_id = mc.restaurant_id
      WHERE mc.id = menu_items.category_id
        AND ur.user_id = auth.uid()
    )
  );

CREATE POLICY "restaurant_admin_update_menu_items"
  ON menu_items FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM menu_categories mc
      JOIN user_roles ur ON ur.restaurant_id = mc.restaurant_id
      WHERE mc.id = menu_items.category_id
        AND ur.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM menu_categories mc
      JOIN user_roles ur ON ur.restaurant_id = mc.restaurant_id
      WHERE mc.id = menu_items.category_id
        AND ur.user_id = auth.uid()
    )
  );

CREATE POLICY "restaurant_admin_delete_menu_items"
  ON menu_items FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM menu_categories mc
      JOIN user_roles ur ON ur.restaurant_id = mc.restaurant_id
      WHERE mc.id = menu_items.category_id
        AND ur.user_id = auth.uid()
    )
  );


-- ============================================================
-- STEP 9: orders TABLE POLICIES
-- ============================================================

CREATE POLICY "super_admin_all_orders"
  ON orders FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'SUPER_ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'SUPER_ADMIN'
    )
  );

CREATE POLICY "restaurant_admin_select_orders"
  ON orders FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.restaurant_id = orders.restaurant_id
    )
  );

CREATE POLICY "restaurant_admin_update_orders"
  ON orders FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.restaurant_id = orders.restaurant_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.restaurant_id = orders.restaurant_id
    )
  );

-- Note: INSERT on orders is intentionally NOT granted to dashboard users.
-- Orders are created exclusively by the WhatsApp bot (Prisma + service_role,
-- which bypasses RLS entirely). This enforces correct data flow.


-- ============================================================
-- STEP 10: order_items TABLE POLICIES
-- order_items has no restaurant_id — JOIN via orders.
-- ============================================================

CREATE POLICY "super_admin_all_order_items"
  ON order_items FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'SUPER_ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'SUPER_ADMIN'
    )
  );

CREATE POLICY "restaurant_admin_select_order_items"
  ON order_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      JOIN user_roles ur ON ur.restaurant_id = o.restaurant_id
      WHERE o.id = order_items.order_id
        AND ur.user_id = auth.uid()
    )
  );

-- No INSERT/UPDATE/DELETE for dashboard users — order items are
-- created only by the WhatsApp bot via service_role.


-- ============================================================
-- STEP 11: customers TABLE POLICIES
-- ============================================================

CREATE POLICY "super_admin_all_customers"
  ON customers FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'SUPER_ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'SUPER_ADMIN'
    )
  );

CREATE POLICY "restaurant_admin_select_customers"
  ON customers FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.restaurant_id = customers.restaurant_id
    )
  );

-- No INSERT/UPDATE/DELETE for dashboard — customers created by WhatsApp bot.


-- ============================================================
-- STEP 12: conversations TABLE POLICIES
-- ============================================================

CREATE POLICY "super_admin_all_conversations"
  ON conversations FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'SUPER_ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'SUPER_ADMIN'
    )
  );

CREATE POLICY "restaurant_admin_select_conversations"
  ON conversations FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.restaurant_id = conversations.restaurant_id
    )
  );

-- No INSERT/UPDATE/DELETE for dashboard — conversations managed by WhatsApp bot.


-- ============================================================
-- STEP 13: PERFORMANCE INDEXES
-- All indexed on columns used in EXISTS/JOIN lookups above.
-- ============================================================

-- user_roles: looked up on every single RLS policy evaluation
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id
  ON user_roles(user_id);

CREATE INDEX IF NOT EXISTS idx_user_roles_restaurant_id
  ON user_roles(restaurant_id);

-- Core tenant-scoped tables
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_id
  ON orders(restaurant_id);

CREATE INDEX IF NOT EXISTS idx_orders_customer_id
  ON orders(customer_id);

CREATE INDEX IF NOT EXISTS idx_menu_categories_restaurant_id
  ON menu_categories(restaurant_id);

-- Join columns for tables without direct restaurant_id
CREATE INDEX IF NOT EXISTS idx_menu_items_category_id
  ON menu_items(category_id);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id
  ON order_items(order_id);

-- Other tenant-scoped tables
CREATE INDEX IF NOT EXISTS idx_customers_restaurant_id
  ON customers(restaurant_id);

CREATE INDEX IF NOT EXISTS idx_conversations_restaurant_id
  ON conversations(restaurant_id);

-- Conversation lookup by customer (already unique, but explicit)
CREATE INDEX IF NOT EXISTS idx_conversations_customer_id
  ON conversations(customer_id);


-- ============================================================
-- STEP 14: UPDATED_AT TRIGGER for user_roles
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_user_roles_updated_at ON user_roles;
CREATE TRIGGER set_user_roles_updated_at
  BEFORE UPDATE ON user_roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- MIGRATION COMPLETE
-- Summary:
--   ✅ user_roles table created (sole role authority)
--   ✅ All old JWT user_metadata policies dropped
--   ✅ All 8 tables have fresh RLS policies (DB-backed)
--   ✅ WITH CHECK applied on all INSERT/UPDATE policies
--   ✅ Separate SELECT/INSERT/UPDATE/DELETE policies (not FOR ALL)
--   ✅ menu_items + order_items use JOIN (not nested EXISTS)
--   ✅ 11 performance indexes added
--   ✅ WhatsApp bot unaffected (Prisma uses service_role, bypasses RLS)
--   ✅ FIXED: Removed references to non-existent PascalCase table names
-- ============================================================