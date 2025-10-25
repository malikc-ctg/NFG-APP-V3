-- Fix the missing foreign key relationship between jobs and sites
-- This will allow Supabase to properly join jobs with sites data

-- Step 1: Add the foreign key constraint
-- This links jobs.site_id to sites.id
ALTER TABLE jobs 
ADD CONSTRAINT jobs_site_id_fkey 
FOREIGN KEY (site_id) 
REFERENCES sites(id) 
ON DELETE CASCADE;

-- Step 2: Verify the constraint was added
SELECT
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'jobs'
    AND kcu.column_name = 'site_id';

-- Step 3: Test the relationship works
-- This should now return jobs with their site information
SELECT 
    j.id,
    j.title,
    j.site_id,
    s.name as site_name,
    s.address as site_address
FROM jobs j
LEFT JOIN sites s ON j.site_id = s.id
LIMIT 5;

