-- Check if gateway_oauth_sessions table exists and verify its structure

-- 1. Check if table exists
SELECT 
  EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'gateway_oauth_sessions'
  ) AS table_exists;

-- 2. Check table structure
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'gateway_oauth_sessions'
ORDER BY ordinal_position;

-- 3. Check RLS status
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public' 
AND tablename = 'gateway_oauth_sessions';

-- 4. Check RLS policies
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'gateway_oauth_sessions';

-- 5. If table doesn't exist or is missing columns, run this:
-- (This will be handled by the main schema file)

