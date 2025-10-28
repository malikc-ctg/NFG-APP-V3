-- ========================================
-- COMPLETE MULTI-TENANCY FIX
-- Run this ENTIRE script in Supabase SQL Editor
-- ========================================

-- Step 1: Add created_by columns
ALTER TABLE sites ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 2: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_sites_created_by ON sites(created_by);
CREATE INDEX IF NOT EXISTS idx_jobs_created_by ON jobs(created_by);
CREATE INDEX IF NOT EXISTS idx_bookings_created_by ON bookings(created_by);

-- Step 3: CRITICAL - Assign existing orphaned data to current user
-- You need to replace 'YOUR_USER_ID_HERE' with your actual user ID from auth.users

-- To find your user ID, run this first:
-- SELECT id, email FROM auth.users;

-- Then uncomment and run these, replacing 'YOUR_USER_ID_HERE':

-- UPDATE sites SET created_by = 'YOUR_USER_ID_HERE' WHERE created_by IS NULL;
-- UPDATE jobs SET created_by = 'YOUR_USER_ID_HERE' WHERE created_by IS NULL;
-- UPDATE bookings SET created_by = 'YOUR_USER_ID_HERE' WHERE created_by IS NULL;

-- ========================================
-- VERIFICATION
-- ========================================

-- Check if columns were added
SELECT 
  table_name, 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_name IN ('sites', 'jobs', 'bookings') 
  AND column_name = 'created_by';

-- Check for orphaned records (created_by is NULL)
SELECT 'sites' as table_name, COUNT(*) as orphaned_count FROM sites WHERE created_by IS NULL
UNION ALL
SELECT 'jobs', COUNT(*) FROM jobs WHERE created_by IS NULL
UNION ALL
SELECT 'bookings', COUNT(*) FROM bookings WHERE created_by IS NULL;

-- Show your user ID
SELECT id, email FROM auth.users WHERE email LIKE '%malik%' OR email LIKE '%northernfacilitiesgroup%';

