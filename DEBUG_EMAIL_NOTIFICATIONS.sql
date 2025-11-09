-- ==========================================
-- Debug Email Notifications
-- Run this to check what's happening
-- ==========================================

-- 1. Check if pg_net extension is enabled
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') 
    THEN '✅ pg_net is enabled' 
    ELSE '❌ pg_net is NOT enabled - Run: CREATE EXTENSION IF NOT EXISTS pg_net;'
  END AS pg_net_status;

-- 2. Check if trigger exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.triggers 
      WHERE event_object_table = 'notifications' 
      AND trigger_name = 'trigger_send_notification_email'
    )
    THEN '✅ Trigger exists'
    ELSE '❌ Trigger does NOT exist'
  END AS trigger_status;

-- 3. Check if function exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE proname = 'send_notification_email'
    )
    THEN '✅ Function exists'
    ELSE '❌ Function does NOT exist'
  END AS function_status;

-- 4. Check recent notifications (last 10)
SELECT 
  id,
  user_id,
  type,
  title,
  created_at,
  (SELECT email FROM auth.users WHERE id = notifications.user_id) AS user_email
FROM notifications
ORDER BY created_at DESC
LIMIT 10;

-- 5. Check notification_preferences for a user (replace with actual user_id)
-- This helps verify preferences aren't blocking emails
SELECT 
  up.id,
  up.email,
  np.email_enabled,
  np.job_assigned,
  np.site_assigned,
  np.system
FROM user_profiles up
LEFT JOIN notification_preferences np ON np.user_id = up.id
LIMIT 5;

-- 6. Test: Create a test notification and see if trigger fires
-- Replace USER_ID_HERE with an actual user ID from your system
-- Uncomment to test:
/*
DO $$
DECLARE
  test_user_id UUID;
  test_email TEXT;
BEGIN
  -- Get a real user ID and email
  SELECT id, email INTO test_user_id, test_email
  FROM auth.users
  LIMIT 1;
  
  IF test_user_id IS NULL THEN
    RAISE NOTICE 'No users found in auth.users';
  ELSE
    RAISE NOTICE 'Creating test notification for user: % (email: %)', test_user_id, test_email;
    
    INSERT INTO notifications (user_id, type, title, message, link)
    VALUES (
      test_user_id,
      'system',
      'Test Email Notification',
      'This is a test to see if emails are working',
      'https://nfgone.ca'
    );
    
    RAISE NOTICE '✅ Test notification created! Check Edge Function logs now.';
  END IF;
END $$;
*/

-- 7. Check if there are any errors in pg_net logs
-- (This might not be available, but worth checking)
SELECT * FROM pg_stat_statements 
WHERE query LIKE '%send-notification-email%'
LIMIT 5;

