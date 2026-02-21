-- ============================================================
-- MIGRATION: 002_fix_recursion_BETTER.sql
-- PURPOSE: Fix infinite recursion with simple non-recursive policies
--
-- APPROACH:
-- - Allow all authenticated users to READ user_roles (no recursion)
-- - Restrict writes to service_role through application logic
-- - Keeps RLS enabled (satisfies Supabase advisor)
-- ============================================================

-- Drop all existing user_roles policies
DROP POLICY IF EXISTS "super_admin_all_user_roles" ON user_roles;
DROP POLICY IF EXISTS "user_read_own_role" ON user_roles;
DROP POLICY IF EXISTS "super_admin_insert_user_roles" ON user_roles;
DROP POLICY IF EXISTS "super_admin_update_user_roles" ON user_roles;
DROP POLICY IF EXISTS "super_admin_delete_user_roles" ON user_roles;

-- ============================================================
-- SIMPLE NON-RECURSIVE POLICIES for user_roles
-- ============================================================

-- All authenticated users can read user_roles
-- (This is safe - role info is not sensitive, and needed for auth context)
-- NO RECURSION because we don't check user_roles from within this policy
CREATE POLICY "authenticated_read_user_roles"
  ON user_roles FOR SELECT TO authenticated
  USING (true);

-- No INSERT/UPDATE/DELETE policies for regular users
-- These operations are handled exclusively by:
-- 1. Backend API using service_role key (bypasses RLS)
-- 2. Admin controller with proper application-level role checks

-- ============================================================
-- RESULT:
-- ✅ No infinite recursion (SELECT policy doesn't check roles)
-- ✅ RLS stays enabled (satisfies Supabase advisor)
-- ✅ Dashboard can read roles for auth context
-- ✅ Backend manages writes through service_role
-- ============================================================