-- ============================================
-- FIX: Remove/Update Check Constraint for Super Admin
-- ============================================
-- This fixes the error: "violates check constraint user_profiles_role_check"
-- The constraint is preventing super_admin from being set
-- ============================================

BEGIN;

-- Step 1: Check if constraint exists and what it allows
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'user_profiles'::regclass
AND conname LIKE '%role%';

-- Step 2: Drop the check constraint if it exists
ALTER TABLE user_profiles 
DROP CONSTRAINT IF EXISTS user_profiles_role_check;

-- Step 3: Verify the enum type has super_admin
DO $$ 
BEGIN
    -- Check if the type exists
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('admin', 'client', 'staff', 'super_admin');
    ELSE
        -- Add super_admin if it doesn't exist
        BEGIN
            ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'super_admin';
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END;
    END IF;
END $$;

-- Step 4: Since we're using an enum type, we don't need a check constraint
-- The enum itself enforces the valid values
-- But if the column isn't using the enum type, we need to alter it

-- Check if the role column is using the enum type
DO $$
BEGIN
    -- Check if column is using enum type
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'role'
        AND udt_name = 'user_role'
    ) THEN
        -- Column exists but isn't using enum - alter it
        -- First, ensure all existing values are valid
        UPDATE user_profiles
        SET role = 'staff'
        WHERE role NOT IN ('admin', 'client', 'staff', 'super_admin');
        
        -- Alter column to use enum type
        ALTER TABLE user_profiles
        ALTER COLUMN role TYPE user_role USING role::user_role;
    END IF;
END $$;

-- Step 5: Now assign super_admin (should work now)
-- Remove super_admin from all users first
UPDATE user_profiles
SET role = 'admin'
WHERE role = 'super_admin';

-- Assign to the specific user
UPDATE user_profiles
SET role = 'super_admin'
WHERE id = '4c5dc516-e83e-4dba-872e-e344b6ef8916';

COMMIT;

-- Step 6: Verify
SELECT 
  'Super Admin Status' as check_name,
  id,
  email,
  full_name,
  role,
  status
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

-- Verify constraint is gone
SELECT 
  'Constraints Check' as check_name,
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'user_profiles'::regclass
AND conname LIKE '%role%';

SELECT '✅ Constraint fixed! Super admin should now work.' AS status;

