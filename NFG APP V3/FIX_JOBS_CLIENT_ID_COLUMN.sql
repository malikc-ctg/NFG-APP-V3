-- ============================================
-- FIX: Add client_id column to jobs table
-- Error: Could not find the 'client_id' column of 'jobs' in the schema cache
-- ============================================

-- Step 1: Check current jobs table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'jobs'
ORDER BY ordinal_position;

-- Step 2: Add client_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'jobs' AND column_name = 'client_id'
    ) THEN
        ALTER TABLE jobs ADD COLUMN client_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
        RAISE NOTICE 'client_id column added to jobs table';
    ELSE
        RAISE NOTICE 'client_id column already exists in jobs table';
    END IF;
END $$;

-- Step 3: Create index for performance
CREATE INDEX IF NOT EXISTS idx_jobs_client ON jobs(client_id);

-- Step 4: Verify the column exists
SELECT 'Verifying client_id column...' as status;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'jobs' AND column_name = 'client_id';

-- Step 5: Check all critical columns exist
SELECT 'Checking all required columns...' as status;
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'jobs' 
AND column_name IN ('id', 'client_id', 'site_id', 'assigned_worker_id', 'title', 'description', 'scheduled_date', 'status', 'frequency')
ORDER BY column_name;

SELECT '✅ Jobs table fixed!' as result;
SELECT '🔄 Now try creating a booking again!' as next_step;

