-- ================================
-- SUPER ADMIN SETUP
-- ================================
-- Sets up super_admin role with master control over everything
-- Run this in Supabase SQL Editor

BEGIN;

-- 1. Add super_admin to user_role enum
DO $$ 
BEGIN
    -- Check if the type exists, if not create it
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('admin', 'client', 'staff', 'super_admin');
    ELSE
        -- Add super_admin if it doesn't exist
        BEGIN
            ALTER TYPE user_role ADD VALUE 'super_admin';
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END;
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION is_super_admin() TO authenticated;

COMMIT;

-- ================================
-- UPDATE RLS POLICIES - SUPER ADMIN BYPASS
-- ================================
-- Super admin can see and do EVERYTHING

BEGIN;

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

DROP POLICY IF EXISTS "Users can update profiles" ON user_profiles;
CREATE POLICY "Users can update profiles" ON user_profiles
FOR UPDATE USING (
  is_super_admin() OR user_id = auth.uid()
);

-- INVENTORY (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'inventory_items') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users can view inventory" ON inventory_items';
    EXECUTE 'CREATE POLICY "Users can view inventory" ON inventory_items
    FOR SELECT USING (is_super_admin() OR created_by = auth.uid())';
    
    EXECUTE 'DROP POLICY IF EXISTS "Users can manage inventory" ON inventory_items';
    EXECUTE 'CREATE POLICY "Users can manage inventory" ON inventory_items
    FOR ALL USING (is_super_admin() OR created_by = auth.uid())';
  END IF;
END $$;

-- TIME ENTRIES (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'time_entries') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users can view time entries" ON time_entries';
    EXECUTE 'CREATE POLICY "Users can view time entries" ON time_entries
    FOR SELECT USING (is_super_admin() OR user_id = auth.uid())';
    
    EXECUTE 'DROP POLICY IF EXISTS "Users can manage time entries" ON time_entries';
    EXECUTE 'CREATE POLICY "Users can manage time entries" ON time_entries
    FOR ALL USING (is_super_admin() OR user_id = auth.uid())';
  END IF;
END $$;

COMMIT;

-- ================================
-- VERIFICATION
-- ================================
SELECT 
  email, 
  role, 
  full_name,
  status
FROM user_profiles 
WHERE role = 'super_admin';

-- Success message
DO $$ 
BEGIN
  RAISE NOTICE '✅ Super Admin setup complete!';
  RAISE NOTICE '✅ Malik is now super_admin';
  RAISE NOTICE '✅ RLS policies updated - super admin sees EVERYTHING';
  RAISE NOTICE '✅ is_super_admin() function created';
  RAISE NOTICE '';
  RAISE NOTICE '🔑 Super Admin Powers:';
  RAISE NOTICE '  • View all users data';
  RAISE NOTICE '  • Manage all sites, jobs, bookings';
  RAISE NOTICE '  • Delete anything';
  RAISE NOTICE '  • Bypass all restrictions';
END $$;

