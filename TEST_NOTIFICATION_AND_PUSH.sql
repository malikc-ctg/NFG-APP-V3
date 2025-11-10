-- ============================================
-- Test Notification Creation and Push Trigger
-- This will create a notification and trigger push
-- ============================================

-- Create a test notification
-- The trigger should automatically fire and send a push notification
INSERT INTO notifications (user_id, type, title, message, link, metadata)
VALUES (
  'b6c70905-828b-45f8-8cd8-b5c1d281a21b',
  'site_assigned',
  'Test Push Notification',
  'This is a test notification - did you receive a push?',
  '/sites.html',
  '{"test": true, "site_id": 999}'::jsonb
)
RETURNING id, user_id, type, title, created_at;

-- Check if notification was created
SELECT 
  'Notification Created' as status,
  id,
  user_id,
  type,
  title,
  created_at
FROM notifications
WHERE user_id = 'b6c70905-828b-45f8-8cd8-b5c1d281a21b'
ORDER BY created_at DESC
LIMIT 1;

-- Note: After running this, check:
-- 1. Supabase Dashboard → Edge Functions → send-push-notification → Logs
-- 2. Your phone/device for the push notification
-- 3. Browser console for service worker logs

