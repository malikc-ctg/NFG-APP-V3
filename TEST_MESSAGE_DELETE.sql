-- ==========================================
-- TEST: Verify Message Delete Setup
-- ==========================================
-- Run this to check if everything is set up correctly

-- 1. Check if deleted_at column exists
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'messages'
  AND column_name = 'deleted_at';

-- 2. Check all UPDATE policies on messages
SELECT 
  policyname,
  cmd,
  qual as using_clause,
  with_check
FROM pg_policies
WHERE tablename = 'messages'
  AND cmd = 'UPDATE';

-- 3. Check if RLS is enabled
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'messages';

-- 4. Check if authenticated role has UPDATE permission
SELECT 
  grantee,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'messages'
  AND privilege_type = 'UPDATE';

