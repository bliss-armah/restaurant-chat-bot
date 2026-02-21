-- ============================================
-- SIMPLE FIX: Add Default UUID Generation
-- ============================================
-- This adds auto-generation for new restaurants
-- without affecting existing data

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Just change the default for new inserts
ALTER TABLE restaurants 
  ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;

-- Verify it works
-- INSERT INTO restaurants (name, phone, momo_number, momo_name) 
-- VALUES ('Test Restaurant', '+233123456789', '0123456789', 'Test Name');

-- ============================================
-- This allows Supabase to auto-generate IDs
-- for new restaurants without breaking existing data!
-- ============================================
