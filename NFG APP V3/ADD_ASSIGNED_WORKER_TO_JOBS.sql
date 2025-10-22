-- ============================================
-- Add assigned_worker_id column to jobs table
-- This allows jobs to be assigned to staff members
-- ============================================

-- Add assigned_worker_id column if it doesn't exist
DO $$ BEGIN
    ALTER TABLE jobs ADD COLUMN assigned_worker_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_column THEN RAISE NOTICE 'column assigned_worker_id already exists in jobs.';
END $$;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_jobs_assigned_worker ON jobs(assigned_worker_id);

-- Verify the change
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'jobs' AND column_name = 'assigned_worker_id';

SELECT '✅ assigned_worker_id column added to jobs table successfully!' as result;

