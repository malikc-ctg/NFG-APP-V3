-- Add cancelled_at column to jobs table
-- Run this in Supabase SQL Editor

-- Add the column if it doesn't exist
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_jobs_cancelled_at ON jobs(cancelled_at);

SELECT '✅ cancelled_at column added to jobs table!' as result;

