-- ============================================
-- ADD SCHEDULED TIME SUPPORT
-- Change scheduled_date from DATE to TIMESTAMPTZ
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Add new scheduled_datetime column to jobs table
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS scheduled_datetime TIMESTAMPTZ;

-- Step 2: Migrate existing scheduled_date data to scheduled_datetime
-- Set existing dates to 9:00 AM local time (or adjust timezone as needed)
UPDATE jobs
SET scheduled_datetime = (scheduled_date::text || ' 09:00:00')::timestamp
WHERE scheduled_date IS NOT NULL 
  AND scheduled_datetime IS NULL;

-- Step 3: Add new scheduled_datetime column to bookings table
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS scheduled_datetime TIMESTAMPTZ;

-- Step 4: Migrate existing scheduled_date data to scheduled_datetime
UPDATE bookings
SET scheduled_datetime = (scheduled_date::text || ' 09:00:00')::timestamp
WHERE scheduled_date IS NOT NULL 
  AND scheduled_datetime IS NULL;

-- Step 5: Create index on scheduled_datetime for better query performance
CREATE INDEX IF NOT EXISTS idx_jobs_scheduled_datetime ON jobs(scheduled_datetime);
CREATE INDEX IF NOT EXISTS idx_bookings_scheduled_datetime ON bookings(scheduled_datetime);

-- Step 6: Add is_all_day boolean column to track all-day events
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS is_all_day BOOLEAN DEFAULT false;

ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS is_all_day BOOLEAN DEFAULT false;

-- Step 7: Set is_all_day to true for existing migrated records (since they were originally date-only)
UPDATE jobs
SET is_all_day = true
WHERE scheduled_datetime IS NOT NULL;

UPDATE bookings
SET is_all_day = true
WHERE scheduled_datetime IS NOT NULL;

-- Note: scheduled_date column is kept for backward compatibility
-- You can drop it later after confirming everything works:
-- ALTER TABLE jobs DROP COLUMN IF EXISTS scheduled_date;
-- ALTER TABLE bookings DROP COLUMN IF EXISTS scheduled_date;

