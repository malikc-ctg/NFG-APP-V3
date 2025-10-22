-- ============================================
-- Verify All Table Schemas for Bookings System
-- Run this to check all required columns exist
-- ============================================

-- Check sites table
SELECT '📍 SITES TABLE' as check_name;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'sites'
AND column_name IN ('id', 'name', 'assigned_worker_id')
ORDER BY column_name;

-- Check jobs table
SELECT '💼 JOBS TABLE' as check_name;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'jobs'
AND column_name IN ('id', 'client_id', 'site_id', 'assigned_worker_id', 'title', 'job_type', 'description', 'scheduled_date', 'status', 'frequency')
ORDER BY column_name;

-- Check job_tasks table
SELECT '✅ JOB_TASKS TABLE' as check_name;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'job_tasks'
AND column_name IN ('id', 'job_id', 'title', 'completed', 'photo_required', 'photo_url', 'completed_at')
ORDER BY column_name;

-- Check bookings table
SELECT '📅 BOOKINGS TABLE' as check_name;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'bookings'
AND column_name IN ('id', 'client_id', 'site_id', 'job_id', 'title', 'description', 'scheduled_date', 'status')
ORDER BY column_name;

-- Check service_categories table
SELECT '🗂️ SERVICE_CATEGORIES TABLE' as check_name;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'service_categories'
AND column_name IN ('id', 'name', 'description', 'display_order')
ORDER BY column_name;

-- Check services table
SELECT '🛠️ SERVICES TABLE' as check_name;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'services'
AND column_name IN ('id', 'category_id', 'name', 'estimated_duration')
ORDER BY column_name;

-- Check booking_services table
SELECT '🔗 BOOKING_SERVICES TABLE' as check_name;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'booking_services'
AND column_name IN ('id', 'booking_id', 'service_id', 'quantity')
ORDER BY column_name;

-- Summary
SELECT '✅ SCHEMA VERIFICATION COMPLETE' as status;
SELECT 'If any tables are missing columns, run the appropriate migration scripts!' as next_step;

