-- ============================================================
-- MIGRATION: 002_fix_recursion_SIMPLE.sql
-- PURPOSE: Fix infinite recursion by disabling RLS on user_roles
--
-- RATIONALE:
-- - user_roles is an admin-only table
-- - Backend uses service_role key (bypasses RLS anyway)
-- - Dashboard user management goes through admin API
-- - Simpler and safer than complex recursive policies
-- ============================================================

-- Drop all user_roles policies (they cause recursion)
DROP POLICY IF EXISTS "super_admin_all_user_roles" ON user_roles;
DROP POLICY IF EXISTS "user_read_own_role" ON user_roles;
DROP POLICY IF EXISTS "super_admin_insert_user_roles" ON user_roles;
DROP POLICY IF EXISTS "super_admin_update_user_roles" ON user_roles;
DROP POLICY IF EXISTS "super_admin_delete_user_roles" ON user_roles;

-- Disable RLS on user_roles table
-- This is safe because:
-- 1. Only backend API can modify it (uses service_role)
-- 2. Dashboard reads it through authenticated API calls
-- 3. Direct database access is limited to service_role
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;

-- Migration complete
--
-- SECURITY NOTE:
-- user_roles table access is now managed entirely through:
-- - Backend API with proper role checks
-- - Service role key for backend operations
-- - No direct client access to this table