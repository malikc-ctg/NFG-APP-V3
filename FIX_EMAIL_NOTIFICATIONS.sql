-- ==========================================
-- Fix Email Notifications - Complete Setup
-- ==========================================
-- Run this in Supabase SQL Editor to ensure everything is set up

-- Step 1: Enable pg_net extension (REQUIRED for calling Edge Functions)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Step 2: Verify extension is enabled
SELECT extname, extversion 
FROM pg_extension 
WHERE extname = 'pg_net';

-- Step 3: Create/Update the function to send notification emails
CREATE OR REPLACE FUNCTION send_notification_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_email TEXT;
  edge_function_url TEXT;
  service_role_key TEXT;
BEGIN
  -- Get user email
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = NEW.user_id;

  -- Only send if we have email
  IF user_email IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get Edge Function URL
  edge_function_url := 'https://zqcbldgheimqrnqmbbed.supabase.co/functions/v1/send-notification-email';
  
  -- Use service role key from secrets (or anon key as fallback)
  -- The Edge Function will use RESEND_API_KEY from Supabase secrets
  service_role_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxY2JsZGdoZWltcXJucW1iYmVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3MDM5NjIsImV4cCI6MjA3NjI3OTk2Mn0.UYlnTQeCjNLed6g9oNRLQIXD69OgzRrXupl3LXUvh4I';

  -- Call Edge Function asynchronously using pg_net
  BEGIN
    PERFORM net.http_post(
      url := edge_function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body := jsonb_build_object(
        'notification', jsonb_build_object(
          'id', NEW.id,
          'user_id', NEW.user_id,
          'type', NEW.type,
          'title', NEW.title,
          'message', NEW.message,
          'link', COALESCE(NEW.link, NULL),
          'metadata', COALESCE(NEW.metadata, '{}'::jsonb)
        ),
        'user_email', user_email
      )
    );
  EXCEPTION WHEN OTHERS THEN
    -- If pg_net fails, log warning but don't fail the notification creation
    RAISE WARNING 'Failed to send notification email: %. Notification was still created.', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- Step 4: Drop trigger if it exists
DROP TRIGGER IF EXISTS trigger_send_notification_email ON notifications;

-- Step 5: Create trigger to automatically send emails when notification is created
CREATE TRIGGER trigger_send_notification_email
  AFTER INSERT ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION send_notification_email();

-- Step 6: Verify trigger was created
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'notifications'
AND trigger_name = 'trigger_send_notification_email';

-- Success message
SELECT '✅ Email notification trigger is now set up!' AS status;
SELECT '📧 Emails will be sent automatically when notifications are created' AS note;

