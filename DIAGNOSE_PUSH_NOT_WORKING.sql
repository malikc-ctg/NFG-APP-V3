-- ============================================
-- Diagnose Why Push Notifications Aren't Working
-- Run this to check everything
-- ============================================

-- 1. Check if notifications are being created
SELECT 
  'Recent Notifications' as check_name,
  id,
  user_id,
  type,
  title,
  message,
  created_at
FROM notifications
WHERE user_id = 'b6c70905-828b-45f8-8cd8-b5c1d281a21b'
ORDER BY created_at DESC
LIMIT 5;

-- 2. Check if trigger exists and is enabled
SELECT 
  'Trigger Status' as check_name,
  tgname AS trigger_name,
  CASE 
    WHEN tgenabled = 'O' THEN '✅ ENABLED'
    WHEN tgenabled = 'D' THEN '❌ DISABLED'
    ELSE '⚠️ UNKNOWN'
  END AS status,
  tgrelid::regclass AS table_name,
  pg_get_triggerdef(oid) AS trigger_definition
FROM pg_trigger
WHERE tgname = 'trigger_send_notification_email';

-- 3. Check if pg_net extension is enabled
SELECT 
  'pg_net Extension' as check_name,
  extname,
  extversion
FROM pg_extension
WHERE extname = 'pg_net';

-- 4. Check push subscriptions for the user
SELECT 
  'Push Subscriptions' as check_name,
  id,
  user_id,
  LEFT(endpoint, 50) as endpoint_preview,
  created_at
FROM push_subscriptions
WHERE user_id = 'b6c70905-828b-45f8-8cd8-b5c1d281a21b';

-- 5. Test creating a notification and see if trigger fires
-- (Run this separately after checking the above)
/*
INSERT INTO notifications (user_id, type, title, message, link, metadata)
VALUES (
  'b6c70905-828b-45f8-8cd8-b5c1d281a21b',
  'site_assigned',
  'Test Push Notification',
  'This is a test notification to check if push works',
  '/sites.html',
  '{"test": true}'::jsonb
);
*/

