-- =====================================================
-- Push Notification Trigger for Messages
-- This creates a database trigger that sends push notifications
-- when new messages are inserted via Supabase Webhooks
-- =====================================================

-- ========== CHECK WEBHOOK STATUS ==========
-- First, verify that a webhook is configured:
-- 1. Go to Supabase Dashboard > Database > Webhooks
-- 2. Check if webhook named "message-push-notification" exists
-- 3. If not, create one:
--    - Table: messages
--    - Event: INSERT
--    - URL: https://zqcbldgheimqrnqmbbed.supabase.co/functions/v1/send-message-push-notification
--    - Headers: Authorization: Bearer YOUR_SERVICE_ROLE_KEY

-- ========== VERIFY SETUP ==========
-- Run these queries to check if everything is set up:

-- 1. Check if edge function exists (should return 200):
-- SELECT COUNT(*) FROM pg_proc WHERE proname = 'net_http_post';

-- 2. Check if push_subscriptions table exists:
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'push_subscriptions'
) AS push_subscriptions_table_exists;

-- 3. Check if users have push subscriptions:
SELECT 
  u.email,
  COUNT(ps.id) as subscription_count
FROM user_profiles u
LEFT JOIN push_subscriptions ps ON ps.user_id = u.id
GROUP BY u.id, u.email
ORDER BY subscription_count DESC;

-- ========== MANUAL TRIGGER TEST (Alternative) ==========
-- If webhook isn't working, you can manually trigger push notifications:

CREATE OR REPLACE FUNCTION test_send_message_push(
  message_id_param UUID
)
RETURNS JSON AS $$
DECLARE
  message_record RECORD;
  result JSON;
BEGIN
  -- Get the message
  SELECT * INTO message_record
  FROM messages
  WHERE id = message_id_param;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Message not found');
  END IF;

  -- Manually invoke the edge function via HTTP (if pg_net is enabled)
  -- This is a fallback if webhooks aren't working
  BEGIN
    SELECT content INTO result
    FROM http((
      'POST',
      'https://zqcbldgheimqrnqmbbed.supabase.co/functions/v1/send-message-push-notification',
      ARRAY[
        http_header('Content-Type', 'application/json'),
        http_header('Authorization', 'Bearer ' || current_setting('app.service_role_key', true))
      ],
      'application/json',
      json_build_object(
        'record', json_build_object(
          'id', message_record.id,
          'conversation_id', message_record.conversation_id,
          'sender_id', message_record.sender_id,
          'content', message_record.content
        )
      )::text
    )::http_request);
    
    RETURN result;
  EXCEPTION
    WHEN OTHERS THEN
      -- pg_net or http extension not available
      RETURN json_build_object(
        'error', 'HTTP extension not available',
        'suggestion', 'Please set up webhook in Supabase Dashboard > Database > Webhooks'
      );
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION test_send_message_push(UUID) TO authenticated;

-- ========== WEBHOOK SETUP INSTRUCTIONS ==========
-- 
-- Since webhooks must be created via Supabase Dashboard, follow these steps:
--
-- 1. Deploy Edge Function:
--    ```bash
--    cd "/Users/malikcampbell/NFG APP V3"
--    supabase functions deploy send-message-push-notification
--    ```
--
-- 2. Set Environment Variables (in Supabase Dashboard > Edge Functions > send-message-push-notification):
--    - VAPID_PUBLIC_KEY: (your VAPID public key)
--    - VAPID_PRIVATE_KEY: (your VAPID private key)
--    - SUPABASE_URL: https://zqcbldgheimqrnqmbbed.supabase.co
--    - SUPABASE_SERVICE_ROLE_KEY: (your service role key)
--
-- 3. Create Webhook (Supabase Dashboard > Database > Webhooks):
--    - Name: message-push-notification
--    - Table: messages
--    - Events: INSERT (only)
--    - Type: HTTP Request
--    - Method: POST
--    - URL: https://zqcbldgheimqrnqmbbed.supabase.co/functions/v1/send-message-push-notification
--    - HTTP Headers:
--      Authorization: Bearer YOUR_SERVICE_ROLE_KEY
--      Content-Type: application/json
--    - Enabled: ✅ Yes
--
-- 4. Test:
--    - Send a message in the app
--    - Check Edge Function logs (Dashboard > Edge Functions > send-message-push-notification > Logs)
--    - Check webhook logs (Dashboard > Database > Webhooks > message-push-notification > Logs)
--
-- 5. Verify Push Subscriptions:
--    - Make sure users have enabled push notifications (Settings page)
--    - Check push_subscriptions table has entries for users
--    - Verify VAPID keys match between client and server

