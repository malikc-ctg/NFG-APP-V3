-- ============================================
-- COMPLETE FIX FOR SITES AND PERMISSIONS
-- Run this ENTIRE script in Supabase SQL Editor
-- ============================================

-- 1. CREATE SITES TABLE (if doesn't exist)
-- ============================================

CREATE TABLE IF NOT EXISTS sites (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  status TEXT DEFAULT 'Active',
  square_footage INTEGER,
  contact_phone TEXT,
  contact_email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. DISABLE RLS ON ALL TABLES
-- ============================================

ALTER TABLE sites DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_invitations DISABLE ROW LEVEL SECURITY;
ALTER TABLE worker_site_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE jobs DISABLE ROW LEVEL SECURITY;
ALTER TABLE job_tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE job_employees DISABLE ROW LEVEL SECURITY;

-- 3. GRANT FULL PERMISSIONS
-- ============================================

-- Sites
GRANT ALL ON sites TO authenticated;
GRANT ALL ON sites TO anon;

-- User management tables
GRANT ALL ON user_profiles TO authenticated;
GRANT ALL ON user_profiles TO anon;
GRANT ALL ON user_invitations TO authenticated;
GRANT ALL ON user_invitations TO anon;
GRANT ALL ON worker_site_assignments TO authenticated;
GRANT ALL ON worker_site_assignments TO anon;

-- Jobs tables
GRANT ALL ON jobs TO authenticated;
GRANT ALL ON jobs TO anon;
GRANT ALL ON job_tasks TO authenticated;
GRANT ALL ON job_tasks TO anon;
GRANT ALL ON job_employees TO authenticated;
GRANT ALL ON job_employees TO anon;

-- Sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

-- 4. INSERT TEST DATA
-- ============================================

-- Insert a test site (ONLY if table is empty)
INSERT INTO sites (name, address, status, square_footage, contact_phone, contact_email, notes)
SELECT 
  'NFG Headquarters',
  '123 Main Street, Toronto, ON M5H 2N2',
  'Active',
  10000,
  '416-555-0100',
  'info@northernfacilitiesgroup.ca',
  'Main office and warehouse facility'
WHERE NOT EXISTS (SELECT 1 FROM sites);

-- 5. VERIFY EVERYTHING
-- ============================================

-- Check sites table
SELECT 'SITES TABLE:' as info;
SELECT * FROM sites;

-- Check if permissions are granted
SELECT 'PERMISSIONS:' as info;
SELECT 
  table_name,
  grantee,
  privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public' 
  AND table_name IN ('sites', 'user_profiles', 'worker_site_assignments', 'jobs')
  AND grantee IN ('authenticated', 'anon')
ORDER BY table_name, grantee;

-- Check RLS status
SELECT 'RLS STATUS:' as info;
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('sites', 'user_profiles', 'worker_site_assignments', 'jobs')
ORDER BY tablename;

-- Success message
SELECT '✅ SETUP COMPLETE! Your sites table is ready.' as result;

