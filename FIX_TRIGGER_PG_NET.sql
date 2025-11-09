-- ==========================================
-- Fix Trigger - Make Sure pg_net Actually Calls Edge Function
-- ==========================================

-- Recreate the function with better error handling
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
BEGIN
  -- Log that trigger fired
  RAISE NOTICE '🔔 TRIGGER FIRED for notification: %', NEW.id;
  
  -- Get user email
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = NEW.user_id;

  RAISE NOTICE '📧 User email: %', COALESCE(user_email, 'NOT FOUND');

  -- Edge Function URLs
  edge_function_url := 'https://zqcbldgheimqrnqmbbed.supabase.co/functions/v1/send-notification-email';
  push_function_url := 'https://zqcbldgheimqrnqmbbed.supabase.co/functions/v1/send-push-notification';
  service_role_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxY2JsZGdoZWltcXJucW1iYmVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3MDM5NjIsImV4cCI6MjA3NjI3OTk2Mn0.UYlnTQeCjNLed6g9oNRLQIXD69OgzRrXupl3LXUvh4I';

  -- Send Email Notification (if email exists)
  IF user_email IS NOT NULL THEN
    RAISE NOTICE '📤 Calling Email Edge Function: %', edge_function_url;
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
      
      RAISE NOTICE '✅ Email function invoked. Request ID: %', http_result;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '❌ ERROR calling email function: %', SQLERRM;
      RAISE WARNING '❌ Error details: SQLSTATE=%, SQLERRM=%', SQLSTATE, SQLERRM;
    END;
  ELSE
    RAISE WARNING '⚠️ No email found for user: %, skipping email send', NEW.user_id;
  END IF;

  -- Send Push Notification (best effort)
  RAISE NOTICE '📤 Calling Push Edge Function: %', push_function_url;
  BEGIN
    SELECT net.http_post(
      url := push_function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body := jsonb_build_object(
        'user_id', NEW.user_id,
        'title', COALESCE(NEW.title, 'NFG App'),
        'body', COALESCE(NEW.message, 'You have a new notification.'),
        'url', COALESCE(NEW.link, '/dashboard.html')
      )
    ) INTO http_result;
    
    RAISE NOTICE '✅ Push function invoked. Request ID: %', http_result;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '❌ ERROR calling push function: %', SQLERRM;
    RAISE WARNING '❌ Error details: SQLSTATE=%, SQLERRM=%', SQLSTATE, SQLERRM;
  END;

  RAISE NOTICE '✅ Trigger completed for notification: %', NEW.id;
  RETURN NEW;
END;
$$;

-- Recreate trigger to ensure it's active
DROP TRIGGER IF EXISTS trigger_send_notification_email ON notifications;

CREATE TRIGGER trigger_send_notification_email
  AFTER INSERT ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION send_notification_email();

-- Verify trigger was created
SELECT 
  tgname AS trigger_name,
  CASE 
    WHEN tgenabled = 'O' THEN '✅ ENABLED'
    WHEN tgenabled = 'D' THEN '❌ DISABLED'
    ELSE '⚠️ UNKNOWN'
  END AS status,
  tgrelid::regclass AS table_name
FROM pg_trigger
WHERE tgname = 'trigger_send_notification_email';

SELECT '✅ Trigger function updated with enhanced logging. Test now!' AS status;

