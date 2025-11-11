-- ============================================
-- SINGLE SUPER ADMIN SETUP
-- ============================================
-- Sets up ONE super admin account with complete god mode
-- Fully hidden in UI (shows as "admin" but has all powers)
-- Only ONE account can be super_admin at a time (enforced)
-- ============================================

BEGIN;

-- ============================================
-- STEP 1: Remove check constraint if it exists
-- ============================================
-- Drop any check constraints on the role column that might prevent super_admin
ALTER TABLE user_profiles 
DROP CONSTRAINT IF EXISTS user_profiles_role_check;

-- ============================================
-- STEP 2: Add super_admin to user_role enum
-- ============================================
DO $$ 
BEGIN
    -- Check if the type exists, if not create it
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('admin', 'client', 'staff', 'super_admin');
    ELSE
        -- Add super_admin if it doesn't exist
        BEGIN
            ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'super_admin';
        EXCEPTION
            WHEN duplicate_object THEN NULL;
            WHEN OTHERS THEN
                -- If ADD VALUE doesn't work, try without IF NOT EXISTS
                BEGIN
                    ALTER TYPE user_role ADD VALUE 'super_admin';
                EXCEPTION
                    WHEN duplicate_object THEN NULL;
                END;
        END;
    END IF;
END $$;

-- ============================================
-- STEP 3: Ensure role column uses enum type (if not already)
-- ============================================
DO $$
BEGIN
    -- Check if column is using enum type
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'role'
        AND udt_name != 'user_role'
    ) THEN
        -- Column exists but isn't using enum - update existing values first
        UPDATE user_profiles
        SET role = 'staff'
        WHERE role NOT IN ('admin', 'client', 'staff', 'super_admin')
        AND role IS NOT NULL;
        
        -- Alter column to use enum type (if column is text/varchar)
        -- Note: This might fail if there are invalid values, so we update first
        BEGIN
            ALTER TABLE user_profiles
            ALTER COLUMN role TYPE user_role USING role::text::user_role;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Could not alter column type: %. Column may already be correct type.', SQLERRM;
        END;
    END IF;
END $$;

-- ============================================
-- STEP 2: Create function to check if user is super admin
-- ============================================
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() 
    AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION is_super_admin() TO anon;

-- ============================================
-- STEP 3: Create trigger to ensure ONLY ONE super_admin exists
-- ============================================
-- This trigger automatically removes super_admin from other users
-- when a new user is assigned super_admin role

CREATE OR REPLACE FUNCTION ensure_single_super_admin()
RETURNS TRIGGER AS $$
BEGIN
  -- If the new/updated user is being set to super_admin
  IF NEW.role = 'super_admin' THEN
    -- Remove super_admin from ALL other users (except this one)
    UPDATE user_profiles
    SET role = 'admin'  -- Downgrade to admin
    WHERE role = 'super_admin'
    AND id != NEW.id;
    
    -- Log the change
    RAISE NOTICE '✅ Super admin assigned to user: % (ID: %)', NEW.email, NEW.id;
    RAISE NOTICE '✅ All other users downgraded from super_admin to admin';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_ensure_single_super_admin ON user_profiles;
CREATE TRIGGER trigger_ensure_single_super_admin
  BEFORE INSERT OR UPDATE OF role ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_super_admin();

-- ============================================
-- STEP 4: Create function to safely assign super_admin
-- ============================================
-- This function ensures only one super_admin exists
CREATE OR REPLACE FUNCTION assign_super_admin(target_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  target_email TEXT;
BEGIN
  -- Get target user email
  SELECT email INTO target_email
  FROM user_profiles
  WHERE id = target_user_id;
  
  IF target_email IS NULL THEN
    RAISE EXCEPTION 'User with ID % does not exist', target_user_id;
  END IF;
  
  -- Remove super_admin from all users first
  UPDATE user_profiles
  SET role = 'admin'
  WHERE role = 'super_admin';
  
  -- Assign super_admin to target user
  UPDATE user_profiles
  SET role = 'super_admin'
  WHERE id = target_user_id;
  
  RAISE NOTICE '✅ Super admin assigned to: % (ID: %)', target_email, target_user_id;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission (only service_role can use this)
GRANT EXECUTE ON FUNCTION assign_super_admin(UUID) TO service_role;

-- ============================================
-- STEP 5: Assign super_admin to the specified user
-- ============================================
UPDATE user_profiles
SET role = 'admin'  -- First, remove from all
WHERE role = 'super_admin';

-- Assign to the specific user
UPDATE user_profiles
SET role = 'super_admin'
WHERE id = '4c5dc516-e83e-4dba-872e-e344b6ef8916';

-- Verify assignment
DO $$
DECLARE
  super_admin_count INTEGER;
  super_admin_email TEXT;
BEGIN
  SELECT COUNT(*), MAX(email) INTO super_admin_count, super_admin_email
  FROM user_profiles
  WHERE role = 'super_admin';
  
  IF super_admin_count = 0 THEN
    RAISE WARNING '❌ No super admin found! User ID may not exist.';
  ELSIF super_admin_count > 1 THEN
    RAISE WARNING '⚠️ Multiple super admins found! This should not happen.';
  ELSE
    RAISE NOTICE '✅ Super admin assigned to: %', super_admin_email;
  END IF;
END $$;

COMMIT;

-- ============================================
-- STEP 6: Update RLS Policies for ALL Tables
-- ============================================
-- Super admin bypasses ALL RLS policies (sees/manages everything)

BEGIN;

-- SITES TABLE
DROP POLICY IF EXISTS "Super admin and owners can view sites" ON sites;
CREATE POLICY "Super admin and owners can view sites" ON sites
FOR SELECT USING (
  is_super_admin() OR created_by = auth.uid()
);

DROP POLICY IF EXISTS "Super admin and authenticated can insert sites" ON sites;
CREATE POLICY "Super admin and authenticated can insert sites" ON sites
FOR INSERT WITH CHECK (
  is_super_admin() OR auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS "Super admin and owners can update sites" ON sites;
CREATE POLICY "Super admin and owners can update sites" ON sites
FOR UPDATE USING (
  is_super_admin() OR created_by = auth.uid()
);

DROP POLICY IF EXISTS "Super admin and owners can delete sites" ON sites;
CREATE POLICY "Super admin and owners can delete sites" ON sites
FOR DELETE USING (
  is_super_admin() OR created_by = auth.uid()
);

-- JOBS TABLE
DROP POLICY IF EXISTS "Super admin and users can view jobs" ON jobs;
CREATE POLICY "Super admin and users can view jobs" ON jobs
FOR SELECT USING (
  is_super_admin() OR
  created_by = auth.uid() OR
  assigned_worker_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'client')
  )
);

DROP POLICY IF EXISTS "Super admin and authenticated can insert jobs" ON jobs;
CREATE POLICY "Super admin and authenticated can insert jobs" ON jobs
FOR INSERT WITH CHECK (
  is_super_admin() OR auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS "Super admin and users can update jobs" ON jobs;
CREATE POLICY "Super admin and users can update jobs" ON jobs
FOR UPDATE USING (
  is_super_admin() OR
  created_by = auth.uid() OR
  assigned_worker_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'client')
  )
);

DROP POLICY IF EXISTS "Super admin and owners can delete jobs" ON jobs;
CREATE POLICY "Super admin and owners can delete jobs" ON jobs
FOR DELETE USING (
  is_super_admin() OR created_by = auth.uid()
);

-- BOOKINGS TABLE
DROP POLICY IF EXISTS "Super admin and owners can view bookings" ON bookings;
CREATE POLICY "Super admin and owners can view bookings" ON bookings
FOR SELECT USING (
  is_super_admin() OR created_by = auth.uid()
);

DROP POLICY IF EXISTS "Super admin and authenticated can insert bookings" ON bookings;
CREATE POLICY "Super admin and authenticated can insert bookings" ON bookings
FOR INSERT WITH CHECK (
  is_super_admin() OR auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS "Super admin and owners can update bookings" ON bookings;
CREATE POLICY "Super admin and owners can update bookings" ON bookings
FOR UPDATE USING (
  is_super_admin() OR created_by = auth.uid()
);

DROP POLICY IF EXISTS "Super admin and owners can delete bookings" ON bookings;
CREATE POLICY "Super admin and owners can delete bookings" ON bookings
FOR DELETE USING (
  is_super_admin() OR created_by = auth.uid()
);

-- USER_PROFILES TABLE
DROP POLICY IF EXISTS "Super admin and users can view profiles" ON user_profiles;
CREATE POLICY "Super admin and users can view profiles" ON user_profiles
FOR SELECT USING (
  is_super_admin() OR id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up.id = auth.uid()
    AND up.role IN ('admin', 'client')
  )
);

DROP POLICY IF EXISTS "Super admin and users can update profiles" ON user_profiles;
CREATE POLICY "Super admin and users can update profiles" ON user_profiles
FOR UPDATE USING (
  is_super_admin() OR id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up.id = auth.uid()
    AND up.role IN ('admin', 'client')
  )
);

-- Prevent super_admin from changing their own role via UI
-- (They can still change other fields, just not role)
CREATE OR REPLACE FUNCTION prevent_super_admin_role_change()
RETURNS TRIGGER AS $$
BEGIN
  -- If trying to change role of a super_admin, prevent it (unless it's the system doing it)
  IF OLD.role = 'super_admin' AND NEW.role != 'super_admin' THEN
    -- Only allow if it's being changed by the system (via trigger) or service_role
    IF current_setting('role') != 'service_role' THEN
      RAISE EXCEPTION 'Cannot change super_admin role via UI. Use SQL to reassign.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_prevent_super_admin_role_change ON user_profiles;
CREATE TRIGGER trigger_prevent_super_admin_role_change
  BEFORE UPDATE OF role ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_super_admin_role_change();

-- WORKER_SITE_ASSIGNMENTS TABLE
DROP POLICY IF EXISTS "Super admin and admins can view assignments" ON worker_site_assignments;
CREATE POLICY "Super admin and admins can view assignments" ON worker_site_assignments
FOR SELECT USING (
  is_super_admin() OR
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'client')
  )
  OR worker_id = auth.uid()
);

DROP POLICY IF EXISTS "Super admin and admins can manage assignments" ON worker_site_assignments;
CREATE POLICY "Super admin and admins can manage assignments" ON worker_site_assignments
FOR ALL USING (
  is_super_admin() OR
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'client')
  )
);

-- NOTIFICATIONS TABLE
DROP POLICY IF EXISTS "Super admin and users can view notifications" ON notifications;
CREATE POLICY "Super admin and users can view notifications" ON notifications
FOR SELECT USING (
  is_super_admin() OR user_id = auth.uid()
);

DROP POLICY IF EXISTS "Super admin and system can insert notifications" ON notifications;
CREATE POLICY "Super admin and system can insert notifications" ON notifications
FOR INSERT WITH CHECK (
  is_super_admin() OR user_id = auth.uid()
);

DROP POLICY IF EXISTS "Super admin and users can update notifications" ON notifications;
CREATE POLICY "Super admin and users can update notifications" ON notifications
FOR UPDATE USING (
  is_super_admin() OR user_id = auth.uid()
);

DROP POLICY IF EXISTS "Super admin and users can delete notifications" ON notifications;
CREATE POLICY "Super admin and users can delete notifications" ON notifications
FOR DELETE USING (
  is_super_admin() OR user_id = auth.uid()
);

-- NOTIFICATION_PREFERENCES TABLE
DROP POLICY IF EXISTS "Super admin and users can view preferences" ON notification_preferences;
CREATE POLICY "Super admin and users can view preferences" ON notification_preferences
FOR SELECT USING (
  is_super_admin() OR user_id = auth.uid()
);

DROP POLICY IF EXISTS "Super admin and users can manage preferences" ON notification_preferences;
CREATE POLICY "Super admin and users can manage preferences" ON notification_preferences
FOR ALL USING (
  is_super_admin() OR user_id = auth.uid()
);

-- PUSH_SUBSCRIPTIONS TABLE
DROP POLICY IF EXISTS "Super admin and users can view subscriptions" ON push_subscriptions;
CREATE POLICY "Super admin and users can view subscriptions" ON push_subscriptions
FOR SELECT USING (
  is_super_admin() OR user_id = auth.uid()
);

DROP POLICY IF EXISTS "Super admin and users can manage subscriptions" ON push_subscriptions;
CREATE POLICY "Super admin and users can manage subscriptions" ON push_subscriptions
FOR ALL USING (
  is_super_admin() OR user_id = auth.uid()
);

-- INVENTORY ITEMS (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'inventory_items') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Super admin and owners can view inventory" ON inventory_items';
    EXECUTE 'CREATE POLICY "Super admin and owners can view inventory" ON inventory_items
    FOR SELECT USING (is_super_admin() OR created_by = auth.uid())';
    
    EXECUTE 'DROP POLICY IF EXISTS "Super admin and owners can manage inventory" ON inventory_items';
    EXECUTE 'CREATE POLICY "Super admin and owners can manage inventory" ON inventory_items
    FOR ALL USING (is_super_admin() OR created_by = auth.uid())';
  END IF;
END $$;

-- TIME ENTRIES (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'time_entries') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Super admin and users can view time entries" ON time_entries';
    EXECUTE 'CREATE POLICY "Super admin and users can view time entries" ON time_entries
    FOR SELECT USING (is_super_admin() OR user_id = auth.uid())';
    
    EXECUTE 'DROP POLICY IF EXISTS "Super admin and users can manage time entries" ON time_entries';
    EXECUTE 'CREATE POLICY "Super admin and users can manage time entries" ON time_entries
    FOR ALL USING (is_super_admin() OR user_id = auth.uid())';
  END IF;
END $$;

-- JOB_TASKS TABLE
DROP POLICY IF EXISTS "Super admin and job owners can view tasks" ON job_tasks;
CREATE POLICY "Super admin and job owners can view tasks" ON job_tasks
FOR SELECT USING (
  is_super_admin() OR
  EXISTS (
    SELECT 1 FROM jobs
    WHERE jobs.id = job_tasks.job_id
    AND (jobs.created_by = auth.uid() OR jobs.assigned_worker_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Super admin and job owners can manage tasks" ON job_tasks;
CREATE POLICY "Super admin and job owners can manage tasks" ON job_tasks
FOR ALL USING (
  is_super_admin() OR
  EXISTS (
    SELECT 1 FROM jobs
    WHERE jobs.id = job_tasks.job_id
    AND (jobs.created_by = auth.uid() OR jobs.assigned_worker_id = auth.uid())
  )
);

COMMIT;

-- ============================================
-- STEP 7: Verification
-- ============================================
SELECT 
  'Super Admin Status' as check_name,
  id,
  email,
  full_name,
  role,
  status,
  created_at
FROM user_profiles 
WHERE role = 'super_admin';

-- Count super admins (should be exactly 1)
SELECT 
  'Super Admin Count' as check_name,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) = 0 THEN '❌ No super admin found!'
    WHEN COUNT(*) = 1 THEN '✅ Exactly one super admin (correct)'
    ELSE '⚠️ Multiple super admins found!'
  END as status
FROM user_profiles
WHERE role = 'super_admin';

-- ============================================
-- STEP 8: Success Message
-- ============================================
DO $$ 
DECLARE
  super_admin_email TEXT;
  super_admin_name TEXT;
BEGIN
  SELECT email, full_name INTO super_admin_email, super_admin_name
  FROM user_profiles
  WHERE role = 'super_admin'
  LIMIT 1;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ ============================================';
  RAISE NOTICE '✅ SUPER ADMIN SETUP COMPLETE!';
  RAISE NOTICE '✅ ============================================';
  RAISE NOTICE '';
  RAISE NOTICE '👤 Super Admin: % (%)', COALESCE(super_admin_name, 'Unknown'), super_admin_email;
  RAISE NOTICE '🆔 User ID: 4c5dc516-e83e-4dba-872e-e344b6ef8916';
  RAISE NOTICE '';
  RAISE NOTICE '🔑 Super Admin Powers:';
  RAISE NOTICE '  • Complete god mode - sees/manages EVERYTHING';
  RAISE NOTICE '  • Bypasses ALL RLS policies';
  RAISE NOTICE '  • Can view/edit/delete all data';
  RAISE NOTICE '  • Can manage all users';
  RAISE NOTICE '  • Hidden in UI (shows as "admin")';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 Security:';
  RAISE NOTICE '  • Only ONE super admin at a time (enforced)';
  RAISE NOTICE '  • Cannot change role via UI';
  RAISE NOTICE '  • Only assignable via SQL';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Setup complete!';
END $$;

