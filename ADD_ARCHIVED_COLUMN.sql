-- Add archived_at column to jobs table for paper trail
-- Run this in Supabase SQL Editor

-- Add the column if it doesn't exist
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Add index for faster queries on archived jobs
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);

-- Create a view for active jobs (optional, for easier querying)
CREATE OR REPLACE VIEW active_jobs AS
SELECT * FROM jobs WHERE status != 'archived';

-- Create a view for archived jobs (optional, for future "View Archived Jobs" page)
CREATE OR REPLACE VIEW archived_jobs AS
SELECT * FROM jobs WHERE status = 'archived';

SELECT '✅ Archive column and views created successfully!' as result;

