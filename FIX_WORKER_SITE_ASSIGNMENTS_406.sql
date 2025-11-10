-- ============================================
-- Fix 406 Error for worker_site_assignments
-- Ensures RLS policies allow proper queries
-- ============================================

-- Verify table exists
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'worker_site_assignments'
ORDER BY ordinal_position;

-- Check current RLS policies
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
WHERE tablename = 'worker_site_assignments';

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Admins and managers can view all assignments" ON worker_site_assignments;
DROP POLICY IF EXISTS "Admins and clients can view all assignments" ON worker_site_assignments;
DROP POLICY IF EXISTS "Workers can view own assignments" ON worker_site_assignments;
DROP POLICY IF EXISTS "Admins and managers can create assignments" ON worker_site_assignments;
DROP POLICY IF EXISTS "Admins and clients can create assignments" ON worker_site_assignments;
DROP POLICY IF EXISTS "Admins and managers can update assignments" ON worker_site_assignments;
DROP POLICY IF EXISTS "Admins and clients can update assignments" ON worker_site_assignments;
DROP POLICY IF EXISTS "Admins and managers can delete assignments" ON worker_site_assignments;
DROP POLICY IF EXISTS "Admins and clients can delete assignments" ON worker_site_assignments;

-- Create policies that allow admins and clients to manage assignments
-- Admins and clients can view all assignments
CREATE POLICY "Admins and clients can view all assignments"
  ON worker_site_assignments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() 
      AND role IN ('admin', 'client')
    )
    OR auth.uid() = worker_id
  );

-- Admins and clients can create assignments
CREATE POLICY "Admins and clients can create assignments"
  ON worker_site_assignments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() 
      AND role IN ('admin', 'client')
    )
  );

-- Admins and clients can update assignments
CREATE POLICY "Admins and clients can update assignments"
  ON worker_site_assignments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() 
      AND role IN ('admin', 'client')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() 
      AND role IN ('admin', 'client')
    )
  );

-- Admins and clients can delete assignments
CREATE POLICY "Admins and clients can delete assignments"
  ON worker_site_assignments
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() 
      AND role IN ('admin', 'client')
    )
  );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON worker_site_assignments TO authenticated;
-- Note: No sequence needed - table uses UUID (gen_random_uuid()) for primary key

-- Verify policies were created
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'worker_site_assignments'
ORDER BY policyname;

