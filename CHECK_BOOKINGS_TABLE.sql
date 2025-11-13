-- ============================================
-- CHECK BOOKINGS TABLE STRUCTURE
-- Run this in Supabase SQL Editor to diagnose the issue
-- ============================================

-- 1. Check if bookings table exists and what columns it has
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'bookings'
ORDER BY ordinal_position;

-- 2. Check RLS policies on bookings table
SELECT 
  policyname, 
  permissive, 
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'bookings';

-- 3. Check if RLS is enabled on bookings table
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'bookings';

-- 4. Count total bookings in database
SELECT COUNT(*) as total_bookings FROM bookings;

-- 5. Check a sample booking (if any exist)
SELECT 
  id,
  title,
  scheduled_date,
  scheduled_datetime,
  created_by,
  client_id,
  site_id,
  status,
  created_at
FROM bookings
LIMIT 5;

-- 6. Check if scheduled_datetime column exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'bookings' AND column_name = 'scheduled_datetime'
    ) THEN '✅ scheduled_datetime column exists'
    ELSE '❌ scheduled_datetime column does NOT exist'
  END as scheduled_datetime_status;

-- 7. Check if created_by column exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'bookings' AND column_name = 'created_by'
    ) THEN '✅ created_by column exists'
    ELSE '❌ created_by column does NOT exist'
  END as created_by_status;

-- 8. Check if client_id column exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'bookings' AND column_name = 'client_id'
    ) THEN '✅ client_id column exists'
    ELSE '❌ client_id column does NOT exist'
  END as client_id_status;

