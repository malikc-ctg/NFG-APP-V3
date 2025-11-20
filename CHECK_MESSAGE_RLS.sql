-- ==========================================
-- Check Current Message RLS Policies
-- ==========================================
-- Run this to see what UPDATE policies currently exist on messages table

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
WHERE tablename = 'messages'
  AND cmd = 'UPDATE'
ORDER BY policyname;

-- Also check if RLS is enabled
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'messages';

