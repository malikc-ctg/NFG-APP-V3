-- Add timer columns to jobs table for staff time tracking
-- Run this in Supabase SQL Editor

-- Add work_started_at column to track when staff begins work
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS work_started_at TIMESTAMPTZ;

-- Add work_ended_at column to track when staff ends work
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS work_ended_at TIMESTAMPTZ;

-- Add total_duration column to store total time spent (in seconds)
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS total_duration INTEGER DEFAULT 0;

-- Add index for faster queries on work timestamps
CREATE INDEX IF NOT EXISTS idx_jobs_work_started ON jobs(work_started_at);

-- Create a function to calculate job duration
CREATE OR REPLACE FUNCTION calculate_job_duration(job_id UUID)
RETURNS INTEGER AS $$
DECLARE
  duration INTEGER;
BEGIN
  SELECT EXTRACT(EPOCH FROM (work_ended_at - work_started_at))::INTEGER
  INTO duration
  FROM jobs
  WHERE id = job_id;
  
  RETURN COALESCE(duration, 0);
END;
$$ LANGUAGE plpgsql;

SELECT '✅ Job timer columns added successfully!' as result;

