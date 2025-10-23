-- ============================================
-- NFG: Add Recurring Job Fields
-- This adds fields needed for automatic recurring job creation
-- Run this ONCE in your Supabase SQL Editor
-- ============================================

-- Step 1: Add recurrence_pattern column (weekly, monthly, etc.)
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS recurrence_pattern TEXT DEFAULT 'weekly'
CHECK (recurrence_pattern IN ('weekly', 'biweekly', 'monthly'));

-- Step 2: Add recurrence_series_id to link jobs in the same series
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS recurrence_series_id UUID;

-- Step 3: Add next_occurrence_date to track when the next job should be created
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS next_occurrence_date DATE;

-- Step 4: Add is_recurring_template to mark the original recurring job
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS is_recurring_template BOOLEAN DEFAULT FALSE;

-- Step 5: Create index for better performance
CREATE INDEX IF NOT EXISTS idx_jobs_recurrence_series ON jobs(recurrence_series_id);
CREATE INDEX IF NOT EXISTS idx_jobs_frequency ON jobs(frequency);
CREATE INDEX IF NOT EXISTS idx_jobs_next_occurrence ON jobs(next_occurrence_date);

-- Step 6: Verify the schema changes
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'jobs' 
AND column_name IN ('recurrence_pattern', 'recurrence_series_id', 'next_occurrence_date', 'is_recurring_template')
ORDER BY column_name;

SELECT '✅ Recurring job fields added successfully!' as result;
SELECT '🔄 Jobs can now automatically create next instances when completed!' as next_step;

