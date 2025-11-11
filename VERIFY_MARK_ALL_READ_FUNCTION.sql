-- ============================================
-- Verify mark_all_notifications_read function
-- Run this in Supabase SQL Editor to check
-- ============================================

-- Check if function exists
SELECT 
  p.proname AS function_name,
  pg_get_function_arguments(p.oid) AS arguments,
  pg_get_function_result(p.oid) AS return_type,
  p.prosecdef AS is_security_definer
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname = 'mark_all_notifications_read';

-- Check function permissions
SELECT 
  grantee,
  privilege_type
FROM information_schema.routine_privileges
WHERE routine_name = 'mark_all_notifications_read'
AND routine_schema = 'public';

-- Test the function (replace with your user ID)
-- This will show if the function works
-- SELECT mark_all_notifications_read();

-- Check notifications table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'notifications'
ORDER BY ordinal_position;

-- Check RLS policies on notifications
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
WHERE tablename = 'notifications';

SELECT '✅ Verification complete! Check the results above.' AS status;

