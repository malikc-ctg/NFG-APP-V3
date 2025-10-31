-- ==========================================
-- Add Email Notification Support
-- Creates database trigger to send emails automatically
-- ==========================================

-- Create function to send notification emails via Edge Function
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
  
  -- Get service role key (try to get from settings, fallback to anon key)
  -- Note: Edge Function uses service role from env vars internally, so anon key is fine here
  BEGIN
    service_role_key := current_setting('app.settings.service_role_key', true);
  EXCEPTION WHEN OTHERS THEN
    service_role_key := NULL;
  END;

  -- If service_role_key setting is not available, use anon key
  -- The Edge Function uses service role internally from env vars anyway
  IF service_role_key IS NULL OR service_role_key = '' THEN
    service_role_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxY2JsZGdoZWltcXJucW1iYmVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3MDM5NjIsImV4cCI6MjA3NjI3OTk2Mn0.UYlnTQeCjNLed6g9oNRLQIXD69OgzRrXupl3LXUvh4I';
  END IF;

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
          'link', NEW.link,
          'metadata', COALESCE(NEW.metadata, '{}'::jsonb)
        ),
        'user_email', user_email
      )
    );
  EXCEPTION WHEN OTHERS THEN
    -- If pg_net is not available or fails, log warning but don't fail the notification creation
    RAISE WARNING 'Failed to send notification email: %. Notification was still created.', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- Create trigger to automatically send emails when notification is created
DROP TRIGGER IF EXISTS trigger_send_notification_email ON notifications;
CREATE TRIGGER trigger_send_notification_email
  AFTER INSERT ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION send_notification_email();

-- Alternative: If pg_net extension is not available, use http extension
-- Uncomment below if pg_net doesn't work

/*
CREATE OR REPLACE FUNCTION send_notification_email_sms_http()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_email TEXT;
  user_phone TEXT;
  edge_function_url TEXT;
  http_request_id INTEGER;
BEGIN
  SELECT email INTO user_email FROM auth.users WHERE id = NEW.user_id;
  SELECT phone INTO user_phone FROM user_profiles WHERE id = NEW.user_id;

  IF user_email IS NULL AND user_phone IS NULL THEN
    RETURN NEW;
  END IF;

  edge_function_url := 'https://zqcbldgheimqrnqmbbed.supabase.co/functions/v1/send-notification-email-sms';

  -- Use http extension
  SELECT http_post(
    edge_function_url,
    jsonb_build_object(
      'notification', jsonb_build_object(
        'id', NEW.id,
        'user_id', NEW.user_id,
        'type', NEW.type,
        'title', NEW.title,
        'message', NEW.message,
        'link', NEW.link,
        'metadata', NEW.metadata
      ),
      'user_email', user_email,
      'user_phone', user_phone
    )::text,
    'application/json'
  ) INTO http_request_id;

  RETURN NEW;
END;
$$;
*/

COMMENT ON FUNCTION send_notification_email() IS 'Automatically sends email notifications when a notification is created';

SELECT '✅ Email Notification Support Added!' AS status;
SELECT '📝 Next: Enable pg_net extension and set up Edge Function secrets (RESEND_API_KEY)' AS note;

