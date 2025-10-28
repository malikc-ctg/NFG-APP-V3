-- ================================
-- SUPER ADMIN & MASTER CONTROL SETUP
-- ================================
-- This script sets up a super_admin role with full access to everything
-- and updates all RLS policies to allow super admin bypass

BEGIN;

-- 1. Add super_admin to user_role enum if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('admin', 'client', 'staff', 'super_admin');
    ELSE
        ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'super_admin';
    END IF;
END $$;

-- 2. Set Malik as super_admin
UPDATE user_profiles 
SET role = 'super_admin' 
WHERE email = 'malikjcampbell05@gmail.com';

-- 3. Create helper function to check if current user is super admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================
-- UPDATE RLS POLICIES FOR ALL TABLES
-- Super admin can see/do EVERYTHING
-- ================================

-- SITES TABLE
DROP POLICY IF EXISTS "Users can view sites" ON sites;
CREATE POLICY "Users can view sites" ON sites
FOR SELECT USING (
  is_super_admin() OR created_by = auth.uid()
);

DROP POLICY IF EXISTS "Users can insert sites" ON sites;
CREATE POLICY "Users can insert sites" ON sites
FOR INSERT WITH CHECK (
  is_super_admin() OR auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS "Users can update sites" ON sites;
CREATE POLICY "Users can update sites" ON sites
FOR UPDATE USING (
  is_super_admin() OR created_by = auth.uid()
);

DROP POLICY IF EXISTS "Users can delete sites" ON sites;
CREATE POLICY "Users can delete sites" ON sites
FOR DELETE USING (
  is_super_admin() OR created_by = auth.uid()
);

-- JOBS TABLE
DROP POLICY IF EXISTS "Users can view jobs" ON jobs;
CREATE POLICY "Users can view jobs" ON jobs
FOR SELECT USING (
  is_super_admin() OR 
  created_by = auth.uid() OR
  assigned_to = auth.uid()
);

DROP POLICY IF EXISTS "Users can insert jobs" ON jobs;
CREATE POLICY "Users can insert jobs" ON jobs
FOR INSERT WITH CHECK (
  is_super_admin() OR auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS "Users can update jobs" ON jobs;
CREATE POLICY "Users can update jobs" ON jobs
FOR UPDATE USING (
  is_super_admin() OR 
  created_by = auth.uid() OR 
  assigned_to = auth.uid()
);

DROP POLICY IF EXISTS "Users can delete jobs" ON jobs;
CREATE POLICY "Users can delete jobs" ON jobs
FOR DELETE USING (
  is_super_admin() OR created_by = auth.uid()
);

-- BOOKINGS TABLE
DROP POLICY IF EXISTS "Users can view bookings" ON bookings;
CREATE POLICY "Users can view bookings" ON bookings
FOR SELECT USING (
  is_super_admin() OR created_by = auth.uid()
);

DROP POLICY IF EXISTS "Users can insert bookings" ON bookings;
CREATE POLICY "Users can insert bookings" ON bookings
FOR INSERT WITH CHECK (
  is_super_admin() OR auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS "Users can update bookings" ON bookings;
CREATE POLICY "Users can update bookings" ON bookings
FOR UPDATE USING (
  is_super_admin() OR created_by = auth.uid()
);

DROP POLICY IF EXISTS "Users can delete bookings" ON bookings;
CREATE POLICY "Users can delete bookings" ON bookings
FOR DELETE USING (
  is_super_admin() OR created_by = auth.uid()
);

-- USER_PROFILES TABLE
DROP POLICY IF EXISTS "Users can view profiles" ON user_profiles;
CREATE POLICY "Users can view profiles" ON user_profiles
FOR SELECT USING (
  is_super_admin() OR user_id = auth.uid()
);

DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile" ON user_profiles
FOR UPDATE USING (
  is_super_admin() OR user_id = auth.uid()
);

-- Super admin can update ANY profile
CREATE POLICY "Super admin can update any profile" ON user_profiles
FOR UPDATE USING (is_super_admin());

-- INVENTORY TABLES (if they exist)
DO $$ 
BEGIN
  -- Inventory Items
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'inventory_items') THEN
    DROP POLICY IF EXISTS "Users can view inventory" ON inventory_items;
    EXECUTE 'CREATE POLICY "Users can view inventory" ON inventory_items
    FOR SELECT USING (is_super_admin() OR created_by = auth.uid())';
    
    DROP POLICY IF EXISTS "Users can manage inventory" ON inventory_items;
    EXECUTE 'CREATE POLICY "Users can manage inventory" ON inventory_items
    FOR ALL USING (is_super_admin() OR created_by = auth.uid())';
  END IF;

  -- Time Entries
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'time_entries') THEN
    DROP POLICY IF EXISTS "Users can view time entries" ON time_entries;
    EXECUTE 'CREATE POLICY "Users can view time entries" ON time_entries
    FOR SELECT USING (is_super_admin() OR user_id = auth.uid())';
    
    DROP POLICY IF EXISTS "Users can manage time entries" ON time_entries;
    EXECUTE 'CREATE POLICY "Users can manage time entries" ON time_entries
    FOR ALL USING (is_super_admin() OR user_id = auth.uid())';
  END IF;
END $$;

-- ================================
-- CREATE IMPERSONATION TABLE
-- ================================
CREATE TABLE IF NOT EXISTS user_impersonation (
  id BIGSERIAL PRIMARY KEY,
  super_admin_id UUID NOT NULL REFERENCES auth.users(id),
  impersonated_user_id UUID NOT NULL REFERENCES auth.users(id),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  reason TEXT,
  CONSTRAINT active_impersonation_unique UNIQUE (super_admin_id, ended_at)
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_impersonation_active 
ON user_impersonation(super_admin_id) 
WHERE ended_at IS NULL;

-- RLS for impersonation table
ALTER TABLE user_impersonation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin can manage impersonation" ON user_impersonation
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role = 'super_admin'
  )
);

-- ================================
-- CREATE FUNCTION TO GET EFFECTIVE USER
-- ================================
-- This returns either the real user or impersonated user
CREATE OR REPLACE FUNCTION get_effective_user_id()
RETURNS UUID AS $$
DECLARE
  impersonated_id UUID;
BEGIN
  -- Check if current user is impersonating someone
  SELECT impersonated_user_id INTO impersonated_id
  FROM user_impersonation
  WHERE super_admin_id = auth.uid()
  AND ended_at IS NULL
  LIMIT 1;
  
  -- Return impersonated user if active, otherwise return real user
  RETURN COALESCE(impersonated_id, auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================
-- GRANT PERMISSIONS
-- ================================
GRANT EXECUTE ON FUNCTION is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION get_effective_user_id() TO authenticated;

COMMIT;

-- ================================
-- VERIFICATION
-- ================================
-- Check super admin setup
SELECT 
  email, 
  role, 
  full_name 
FROM user_profiles 
WHERE role = 'super_admin';

-- Success message
DO $$ 
BEGIN
  RAISE NOTICE '✅ Super Admin setup complete!';
  RAISE NOTICE '✅ RLS policies updated for master control';
  RAISE NOTICE '✅ Impersonation system ready';
END $$;

