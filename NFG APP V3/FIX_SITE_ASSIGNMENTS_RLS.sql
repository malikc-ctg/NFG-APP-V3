-- Fix RLS Policies for Worker Site Assignments
-- This fixes the role mismatch (manager vs client) in the RLS policies

-- Drop existing policies
DROP POLICY IF EXISTS "Admins and managers can view all assignments" ON worker_site_assignments;
DROP POLICY IF EXISTS "Workers can view own assignments" ON worker_site_assignments;
DROP POLICY IF EXISTS "Admins and managers can create assignments" ON worker_site_assignments;
DROP POLICY IF EXISTS "Admins and managers can update assignments" ON worker_site_assignments;
DROP POLICY IF EXISTS "Admins and managers can delete assignments" ON worker_site_assignments;

-- Create new policies with correct role names (client instead of manager)

-- Admins and clients can view all assignments
CREATE POLICY "Admins and clients can view all assignments"
  ON worker_site_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() 
      AND role IN ('admin', 'client')
    )
  );

-- Workers can view their own assignments
CREATE POLICY "Workers can view own assignments"
  ON worker_site_assignments FOR SELECT
  USING (auth.uid() = worker_id);

-- Admins and clients can create assignments
CREATE POLICY "Admins and clients can create assignments"
  ON worker_site_assignments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() 
      AND role IN ('admin', 'client')
    )
  );

-- Admins and clients can update assignments
CREATE POLICY "Admins and clients can update assignments"
  ON worker_site_assignments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() 
      AND role IN ('admin', 'client')
    )
  );

-- Admins and clients can delete assignments
CREATE POLICY "Admins and clients can delete assignments"
  ON worker_site_assignments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() 
      AND role IN ('admin', 'client')
    )
  );

-- Verify the policies were created
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
WHERE tablename = 'worker_site_assignments'
ORDER BY policyname;

-- Success message
SELECT '✅ Site assignments RLS policies fixed! Clients can now view and manage site assignments.' as result;

