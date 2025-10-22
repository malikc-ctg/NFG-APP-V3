-- Rename priority column to frequency and update values
-- Run this in Supabase SQL Editor

-- Step 1: Drop the check constraint on priority column
ALTER TABLE jobs 
DROP CONSTRAINT IF EXISTS jobs_priority_check;

-- Step 2: Update all existing jobs to have 'single visit' as default
UPDATE jobs 
SET priority = 'single visit' 
WHERE priority IN ('low', 'medium', 'high', 'urgent');

-- Step 3: Rename the column from priority to frequency
ALTER TABLE jobs 
RENAME COLUMN priority TO frequency;

-- Step 4: Add new check constraint for frequency column
ALTER TABLE jobs 
ADD CONSTRAINT jobs_frequency_check 
CHECK (frequency IN ('single visit', 'recurring'));

-- Step 5: Verify the changes
SELECT id, title, frequency FROM jobs LIMIT 5;

SELECT '✅ Priority column renamed to Frequency! All existing jobs set to "single visit"' as result;

