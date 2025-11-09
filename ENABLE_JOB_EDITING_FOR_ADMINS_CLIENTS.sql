-- ============================================
-- Enable Job Editing for Admins and Clients
-- ============================================
-- This updates RLS policies to allow admins and clients to edit jobs
-- Run this in Supabase SQL Editor
-- ============================================

-- Helper function to check if current user is admin or client
CREATE OR REPLACE FUNCTION is_admin_or_client()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() 
    AND role IN ('admin', 'client')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION is_admin_or_client() TO authenticated;

-- Update the jobs UPDATE policy to allow admins and clients to edit any job
-- (Also allows super_admin, created_by, and assigned_worker_id as before)
DROP POLICY IF EXISTS "Users can update jobs" ON jobs;

CREATE POLICY "Users can update jobs" ON jobs
FOR UPDATE USING (
  -- Super admin check (if function exists)
  (EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_super_admin') AND is_super_admin()) OR 
  -- Owner or assigned worker
  created_by = auth.uid() OR 
  assigned_worker_id = auth.uid() OR
  -- Admin or client role
  is_admin_or_client()
);

-- Also update the SELECT policy to ensure admins and clients can view all jobs
-- (This might already be covered, but let's make sure)
DROP POLICY IF EXISTS "Users can view jobs" ON jobs;

CREATE POLICY "Users can view jobs" ON jobs
FOR SELECT USING (
  -- Super admin check (if function exists)
  (EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_super_admin') AND is_super_admin()) OR 
  -- Owner or assigned worker
  created_by = auth.uid() OR
  assigned_worker_id = auth.uid() OR
  -- Admin or client role
  is_admin_or_client()
);

-- Verify the policies
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
WHERE tablename = 'jobs'
ORDER BY policyname;

SELECT '✅ Job editing enabled for admins and clients!' as result;
SELECT '📝 Admins and clients can now edit any job' as message;

