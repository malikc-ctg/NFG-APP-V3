-- ============================================
-- Phase 3: Auto Job Creation & Site Worker Assignment
-- ============================================

-- Step 1: Add assigned_worker_id to sites table
ALTER TABLE sites ADD COLUMN IF NOT EXISTS assigned_worker_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_sites_assigned_worker ON sites(assigned_worker_id);

-- Step 2: Verify columns exist
SELECT 'Sites now has assigned_worker_id' as result;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'sites' AND column_name = 'assigned_worker_id';

SELECT 'Jobs has assigned_worker_id' as result;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'jobs' AND column_name = 'assigned_worker_id';

SELECT 'Bookings has job_id' as result;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'bookings' AND column_name = 'job_id';

SELECT '✅ Phase 3 Database Ready!' as status;
SELECT '🔄 Now update bookings.html to auto-create jobs!' as next_step;

