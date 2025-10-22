-- ============================================
-- SIMPLE FIX: Add assigned_worker_id to jobs table
-- Run this FIRST, then run the bookings setup
-- ============================================

-- Add the column (will fail if it already exists, which is fine)
ALTER TABLE jobs ADD COLUMN assigned_worker_id UUID;

-- Add the foreign key constraint
ALTER TABLE jobs ADD CONSTRAINT fk_jobs_assigned_worker 
  FOREIGN KEY (assigned_worker_id) 
  REFERENCES user_profiles(id) 
  ON DELETE SET NULL;

-- Create index
CREATE INDEX idx_jobs_assigned_worker ON jobs(assigned_worker_id);

-- Verify it was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'jobs' AND column_name = 'assigned_worker_id';

SELECT '✅ assigned_worker_id column added to jobs table!' as result;

