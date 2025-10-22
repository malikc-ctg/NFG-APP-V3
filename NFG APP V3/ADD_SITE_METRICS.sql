-- Add metrics columns to sites table
-- Run this in Supabase SQL Editor

-- Step 1: Add the metrics columns if they don't exist
ALTER TABLE sites ADD COLUMN IF NOT EXISTS jobs_completed INTEGER DEFAULT 0;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS upcoming_bookings INTEGER DEFAULT 0;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS rating DECIMAL(3,2) DEFAULT 0.00;

-- Step 2: Calculate current jobs_completed for all sites
UPDATE sites 
SET jobs_completed = (
  SELECT COUNT(*) 
  FROM jobs 
  WHERE jobs.site_id = sites.id 
  AND jobs.status = 'completed'
);

-- Step 3: Calculate upcoming_bookings (you can modify this based on your bookings table structure)
-- For now, setting to 0 as the bookings table structure is unknown
UPDATE sites 
SET upcoming_bookings = 0;

-- Step 4: Set default rating
UPDATE sites 
SET rating = 0.00 
WHERE rating IS NULL;

-- Step 5: Create a function to update job count when a job is completed
CREATE OR REPLACE FUNCTION update_site_job_count()
RETURNS TRIGGER AS $$
BEGIN
  -- When job is updated to completed status
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE sites 
    SET jobs_completed = jobs_completed + 1 
    WHERE id = NEW.site_id;
  END IF;
  
  -- When job status changes from completed to something else
  IF OLD.status = 'completed' AND NEW.status != 'completed' THEN
    UPDATE sites 
    SET jobs_completed = GREATEST(jobs_completed - 1, 0)
    WHERE id = NEW.site_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create trigger to automatically update job counts
DROP TRIGGER IF EXISTS update_site_metrics_on_job_status ON jobs;
CREATE TRIGGER update_site_metrics_on_job_status
  AFTER UPDATE OF status ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_site_job_count();

-- Step 7: Verify the changes
SELECT id, name, jobs_completed, upcoming_bookings, rating FROM sites LIMIT 5;

SELECT '✅ Site metrics columns added and calculated!' as result;

