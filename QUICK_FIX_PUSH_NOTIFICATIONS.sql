-- ============================================
-- Quick Fix: Push Notifications Not Working
-- Run this to fix everything at once
-- ============================================

-- 1. Enable pg_net extension
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Add metadata column if missing
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- 3. Fix trigger function with SERVICE_ROLE key
CREATE OR REPLACE FUNCTION send_notification_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  push_function_url TEXT;
  service_role_key TEXT;
  http_result INTEGER;
BEGIN
  -- Log that trigger fired
  RAISE NOTICE '🔔 TRIGGER FIRED: notification_id=%, user_id=%, type=%', NEW.id, NEW.user_id, NEW.type;
  
  -- Edge Function URL
  push_function_url := 'https://zqcbldgheimqrnqmbbed.supabase.co/functions/v1/send-push-notification';
  
  -- USE SERVICE_ROLE KEY (not anon key!)
  service_role_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxY2JsZGdoZWltcXJucW1iYmVkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDcwMzk2MiwiZXhwIjoyMDc2Mjc5OTYyfQ.qRTk5aTno8CYASO6Eu9VU9GTh6ZyV1FYgmn2r7Uv3E0';

  -- Send Push Notification
  RAISE NOTICE '📤 Calling push function for user: %', NEW.user_id;
  
  BEGIN
    SELECT net.http_post(
      url := push_function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body := jsonb_build_object(
        'user_id', NEW.user_id::text,
        'title', COALESCE(NEW.title, 'NFG App'),
        'body', COALESCE(NEW.message, 'You have a new notification.'),
        'url', COALESCE(NEW.link, '/dashboard.html')
      )
    ) INTO http_result;
    
    RAISE NOTICE '✅ Push function called. Request ID: %', http_result;
    RAISE NOTICE '📱 Check Edge Function logs NOW for user_id: %', NEW.user_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '❌ Push function error: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- 4. Recreate trigger
DROP TRIGGER IF EXISTS trigger_send_notification_email ON notifications;

CREATE TRIGGER trigger_send_notification_email
  AFTER INSERT ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION send_notification_email();

-- 5. Verify trigger
SELECT 
  'Trigger Status' as check_name,
  tgname AS trigger_name,
  CASE 
    WHEN tgenabled = 'O' THEN '✅ ENABLED'
    ELSE '❌ DISABLED'
  END AS status
FROM pg_trigger
WHERE tgname = 'trigger_send_notification_email';

-- 6. Check recent notifications
SELECT 
  'Recent Notifications' as check_name,
  id,
  user_id,
  type,
  title,
  created_at
FROM notifications
WHERE user_id = 'b6c70905-828b-45f8-8cd8-b5c1d281a21b'
ORDER BY created_at DESC
LIMIT 3;

-- 7. Check push subscriptions
SELECT 
  'Push Subscriptions' as check_name,
  COUNT(*) as subscription_count
FROM push_subscriptions
WHERE user_id = 'b6c70905-828b-45f8-8cd8-b5c1d281a21b';

SELECT '✅ Setup complete! Now test by assigning a site.' AS status;

