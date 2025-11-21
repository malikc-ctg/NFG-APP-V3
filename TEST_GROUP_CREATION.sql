-- =====================================================
-- TEST: Verify RLS policies work for group creation
-- =====================================================
-- Run this to test if the policies are working
-- =====================================================

-- Check current policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('conversations', 'conversation_participants')
ORDER BY tablename, policyname;

-- Check if RLS is enabled
SELECT 
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename IN ('conversations', 'conversation_participants');

-- Check current user (run this as the authenticated user)
SELECT auth.uid() as current_user_id;

-- Check if helper function exists
SELECT 
  proname,
  prosecdef,
  proconfig
FROM pg_proc
WHERE proname = 'user_is_participant';

