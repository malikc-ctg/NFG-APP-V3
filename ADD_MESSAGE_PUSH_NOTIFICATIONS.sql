-- =====================================================
-- Push Notifications for Messages
-- This creates a database trigger that sends push notifications
-- when new messages are inserted
-- =====================================================

-- ========== OPTION 1: Using pg_net Extension (Recommended) ==========
-- This requires pg_net extension to be enabled in Supabase
-- Enable it via: Dashboard > Database > Extensions > Enable "pg_net"

-- Function to send push notifications when a new message is inserted
CREATE OR REPLACE FUNCTION notify_message_push_notification()
RETURNS TRIGGER AS $$
DECLARE
  recipient_record RECORD;
  sender_profile RECORD;
  notification_title TEXT;
  notification_body TEXT;
  notification_url TEXT;
  supabase_url TEXT;
  service_role_key TEXT;
BEGIN
  -- Only send notifications if message is not deleted
  IF NEW.deleted_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Get Supabase URL and service role key from environment
  -- These should be set as database settings or use hardcoded values
  supabase_url := 'https://zqcbldgheimqrnqmbbed.supabase.co';
  -- Service role key should be stored securely - using a placeholder here
  -- You'll need to set this as a database setting or use Supabase secrets
  service_role_key := current_setting('app.service_role_key', true);
  
  -- If service_role_key is not set, try to get it from a secure location
  -- For now, we'll use a webhook approach instead (see Option 2)

  -- Get sender profile
  SELECT full_name, email INTO sender_profile
  FROM user_profiles
  WHERE id = NEW.sender_id;

  -- Build notification content
  notification_title := COALESCE(sender_profile.full_name, sender_profile.email, 'Someone');
  notification_body := LEFT(NEW.content, 100); -- Truncate to 100 chars
  IF LENGTH(NEW.content) > 100 THEN
    notification_body := notification_body || '...';
  END IF;
  notification_url := '/messages.html';

  -- Send push notification to all conversation participants except the sender
  FOR recipient_record IN
    SELECT DISTINCT cp.user_id
    FROM conversation_participants cp
    WHERE cp.conversation_id = NEW.conversation_id
      AND cp.user_id != NEW.sender_id
  LOOP
    -- Try to call edge function via pg_net (if available)
    BEGIN
      PERFORM
        net.http_post(
          url := supabase_url || '/functions/v1/send-push-notification',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || service_role_key
          ),
          body := jsonb_build_object(
            'user_id', recipient_record.user_id::text,
            'title', notification_title,
            'body', notification_body,
            'url', notification_url
          )
        );
    EXCEPTION
      WHEN OTHERS THEN
        -- If pg_net fails, log and continue (don't fail message insert)
        RAISE WARNING 'Failed to send push notification via pg_net: %', SQLERRM;
    END;
  END LOOP;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the message insert
    RAISE WARNING 'Error in push notification function: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to call the function when a message is inserted
DROP TRIGGER IF EXISTS trigger_notify_message_push ON messages;
CREATE TRIGGER trigger_notify_message_push
  AFTER INSERT ON messages
  FOR EACH ROW
  WHEN (NEW.deleted_at IS NULL)
  EXECUTE FUNCTION notify_message_push_notification();

-- ========== ALTERNATIVE: Webhook-Based Approach ==========
-- If pg_net is not available, you can use Supabase Webhooks:
-- 1. Go to Database > Webhooks in Supabase Dashboard
-- 2. Create a new webhook on the 'messages' table
-- 3. Set it to trigger on INSERT
-- 4. Set the webhook URL to: https://zqcbldgheimqrnqmbbed.supabase.co/functions/v1/send-message-push-notification
-- 5. Use the edge function below instead

-- ========== EDGE FUNCTION: send-message-push-notification ==========
-- This edge function should be created if using webhook approach
-- It will receive the webhook payload and send push notifications

-- ========== SETUP INSTRUCTIONS ==========
-- 1. Enable pg_net extension in Supabase Dashboard:
--    - Go to Database > Extensions
--    - Find "pg_net" and enable it
--
-- 2. Set the service role key as a database setting:
--    - Run: ALTER DATABASE postgres SET app.service_role_key = 'your-service-role-key';
--    - OR store it securely and reference it in the function
--
-- 3. If pg_net is not available, use the webhook approach:
--    - Create webhook in Supabase Dashboard
--    - Point it to the send-message-push-notification edge function
--
-- 4. Test by sending a message and checking if push notification is received

