-- ============================================
-- Fix Push Notification Trigger
-- Ensures trigger fires and calls edge function correctly
-- ============================================

-- Step 1: Enable pg_net extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Step 2: Recreate trigger function with correct service role key
CREATE OR REPLACE FUNCTION send_notification_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_email TEXT;
  edge_function_url TEXT;
  push_function_url TEXT;
  service_role_key TEXT;
  http_result INTEGER;
  push_payload JSONB;
BEGIN
  -- Log that trigger fired
  RAISE NOTICE '🔔 TRIGGER FIRED for notification: % (type: %)', NEW.id, NEW.type;
  RAISE NOTICE '📱 User ID: %', NEW.user_id;
  
  -- Edge Function URLs
  edge_function_url := 'https://zqcbldgheimqrnqmbbed.supabase.co/functions/v1/send-notification-email';
  push_function_url := 'https://zqcbldgheimqrnqmbbed.supabase.co/functions/v1/send-push-notification';
  
  -- IMPORTANT: Use SERVICE_ROLE key (not anon key) for edge function calls
  -- This key has full permissions and can bypass RLS
  service_role_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxY2JsZGdoZWltcXJucW1iYmVkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDcwMzk2MiwiZXhwIjoyMDc2Mjc5OTYyfQ.qRTk5aTno8CYASO6Eu9VU9GTh6ZyV1FYgmn2r7Uv3E0';

  -- Get user email (for email notifications)
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = NEW.user_id;

  -- Send Email Notification (if email exists)
  IF user_email IS NOT NULL THEN
    RAISE NOTICE '📧 Sending email to: %', user_email;
    BEGIN
      SELECT net.http_post(
        url := edge_function_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || service_role_key
        ),
        body := jsonb_build_object(
          'notification', jsonb_build_object(
            'id', NEW.id::text,
            'user_id', NEW.user_id::text,
            'type', NEW.type,
            'title', NEW.title,
            'message', NEW.message,
            'link', COALESCE(NEW.link, NULL),
            'metadata', COALESCE(NEW.metadata, '{}'::jsonb)
          ),
          'user_email', user_email
        )
      ) INTO http_result;
      
      RAISE NOTICE '✅ Email function called. Request ID: %', http_result;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '❌ Email function error: %', SQLERRM;
    END;
  END IF;

  -- Send Push Notification (ALWAYS try to send, even if email fails)
  RAISE NOTICE '📤 Calling push notification function...';
  
  -- Build push payload
  push_payload := jsonb_build_object(
    'user_id', NEW.user_id::text,
    'title', COALESCE(NEW.title, 'NFG App'),
    'body', COALESCE(NEW.message, 'You have a new notification.'),
    'url', COALESCE(NEW.link, '/dashboard.html')
  );
  
  RAISE NOTICE '📦 Push payload: %', push_payload;
  
  BEGIN
    SELECT net.http_post(
      url := push_function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body := push_payload
    ) INTO http_result;
    
    RAISE NOTICE '✅ Push function called. Request ID: %', http_result;
    RAISE NOTICE '📱 Check Edge Function logs for user_id: %', NEW.user_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '❌ Push function error: %', SQLERRM;
    RAISE WARNING '❌ Error details: SQLSTATE=%, SQLERRM=%', SQLSTATE, SQLERRM;
  END;

  RAISE NOTICE '✅ Trigger completed for notification: %', NEW.id;
  RETURN NEW;
END;
$$;

-- Step 3: Drop and recreate trigger
DROP TRIGGER IF EXISTS trigger_send_notification_email ON notifications;

CREATE TRIGGER trigger_send_notification_email
  AFTER INSERT ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION send_notification_email();

-- Step 4: Verify trigger was created
SELECT 
  'Trigger Status' as check_name,
  tgname AS trigger_name,
  CASE 
    WHEN tgenabled = 'O' THEN '✅ ENABLED'
    WHEN tgenabled = 'D' THEN '❌ DISABLED'
    ELSE '⚠️ UNKNOWN'
  END AS status,
  tgrelid::regclass AS table_name
FROM pg_trigger
WHERE tgname = 'trigger_send_notification_email';

-- Step 5: Test the trigger (creates a test notification)
-- Uncomment the lines below to test:
/*
INSERT INTO notifications (user_id, type, title, message, link, metadata)
VALUES (
  'b6c70905-828b-45f8-8cd8-b5c1d281a21b',
  'system',
  'Trigger Test',
  'Testing if trigger fires and sends push notification',
  '/dashboard.html',
  '{"test": true}'::jsonb
);
*/

SELECT '✅ Trigger function updated with SERVICE_ROLE key. Ready to test!' AS status;

