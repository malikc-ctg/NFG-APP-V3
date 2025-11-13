-- ============================================
-- Check Staff Jobs Assignment
-- ============================================
-- This script helps debug why staff aren't seeing jobs
-- ============================================

-- 1. Check if jobs table has assigned_worker_id column
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'jobs' AND column_name = 'assigned_worker_id';

-- 2. Check total jobs in database
SELECT COUNT(*) as total_jobs FROM jobs;

-- 3. Check jobs with assigned_worker_id
SELECT 
  COUNT(*) as jobs_with_assignments,
  COUNT(DISTINCT assigned_worker_id) as unique_workers
FROM jobs
WHERE assigned_worker_id IS NOT NULL;

-- 4. Check jobs without assigned_worker_id
SELECT COUNT(*) as jobs_without_assignments
FROM jobs
WHERE assigned_worker_id IS NULL;

-- 5. Show sample jobs with their assigned_worker_id
SELECT 
  j.id,
  j.title,
  j.assigned_worker_id,
  j.scheduled_date,
  j.status,
  j.created_by,
  up.email as assigned_worker_email,
  up.full_name as assigned_worker_name,
  up.role as assigned_worker_role
FROM jobs j
LEFT JOIN user_profiles up ON j.assigned_worker_id = up.id
ORDER BY j.scheduled_date DESC
LIMIT 10;

-- 6. Check all staff users
SELECT 
  id,
  email,
  full_name,
  role,
  status
FROM user_profiles
WHERE role = 'staff'
ORDER BY email;

-- 7. Check jobs assigned to each staff member
SELECT 
  up.id as staff_id,
  up.email as staff_email,
  up.full_name as staff_name,
  COUNT(j.id) as assigned_jobs_count
FROM user_profiles up
LEFT JOIN jobs j ON j.assigned_worker_id = up.id
WHERE up.role = 'staff'
GROUP BY up.id, up.email, up.full_name
ORDER BY assigned_jobs_count DESC;

-- 8. Check RLS policies on jobs table
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'jobs'
ORDER BY policyname;

-- ============================================
-- FIX: Assign unassigned jobs to staff
-- ============================================
-- If you want to assign unassigned jobs to staff, run this:
-- (Replace <staff-user-id> with actual staff user ID)
-- 
-- UPDATE jobs
-- SET assigned_worker_id = '<staff-user-id>'
-- WHERE assigned_worker_id IS NULL
-- AND scheduled_date >= CURRENT_DATE;
-- 
-- ============================================

