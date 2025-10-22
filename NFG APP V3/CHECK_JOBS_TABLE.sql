-- Check the jobs table structure
-- Run this to see what columns and types exist

SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'jobs'
ORDER BY ordinal_position;

