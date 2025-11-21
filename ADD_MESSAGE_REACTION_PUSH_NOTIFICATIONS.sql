-- =====================================================
-- Push Notifications for Message Reactions
-- This creates a database trigger that sends push notifications
-- when reactions are added to messages
-- =====================================================

-- Function to send push notifications when a reaction is added
CREATE OR REPLACE FUNCTION notify_reaction_push_notification()
RETURNS TRIGGER AS $$
DECLARE
  message_record RECORD;
  reactor_profile RECORD;
  message_owner RECORD;
  notification_title TEXT;
  notification_body TEXT;
  notification_url TEXT;
  conversation_participants_array UUID[];
BEGIN
  -- Get the message details
  SELECT 
    m.id,
    m.conversation_id,
    m.sender_id,
    m.content,
    LEFT(m.content, 50) as preview
  INTO message_record
  FROM messages m
  WHERE m.id = NEW.message_id;

  -- If message doesn't exist or is deleted, skip
  IF message_record IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get reactor profile (person who added the reaction)
  SELECT full_name, email INTO reactor_profile
  FROM user_profiles
  WHERE id = NEW.user_id;

  -- Get message owner profile
  SELECT full_name, email INTO message_owner
  FROM user_profiles
  WHERE id = message_record.sender_id;

  -- Build notification content
  notification_title := 'New Reaction';
  notification_body := COALESCE(reactor_profile.full_name, reactor_profile.email, 'Someone');
  notification_body := notification_body || ' reacted ' || NEW.emoji || ' to your message';
  
  -- Truncate if message preview is long
  IF LENGTH(message_record.preview) > 30 THEN
    notification_body := notification_body || ': "' || LEFT(message_record.preview, 30) || '..."';
  ELSE
    notification_body := notification_body || ': "' || message_record.preview || '"';
  END IF;
  
  notification_url := '/messages.html?conversation=' || message_record.conversation_id::text;

  -- Only notify the message owner (don't notify if they're reacting to their own message)
  IF NEW.user_id != message_record.sender_id THEN
    -- Insert notification for message owner
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      link,
      metadata
    ) VALUES (
      message_record.sender_id, -- Notify the message owner
      'message_reaction',
      notification_title,
      notification_body,
      notification_url,
      jsonb_build_object(
        'message_id', message_record.id,
        'conversation_id', message_record.conversation_id,
        'reaction_id', NEW.id,
        'emoji', NEW.emoji,
        'reactor_id', NEW.user_id,
        'reactor_name', COALESCE(reactor_profile.full_name, reactor_profile.email, 'Unknown')
      )
    );
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the reaction insert
    RAISE WARNING 'Error in reaction push notification function: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to call the function when a reaction is inserted
DROP TRIGGER IF EXISTS trigger_notify_reaction_push ON message_reactions;
CREATE TRIGGER trigger_notify_reaction_push
  AFTER INSERT ON message_reactions
  FOR EACH ROW
  EXECUTE FUNCTION notify_reaction_push_notification();

-- ========== SETUP INSTRUCTIONS ==========
-- 1. This trigger will automatically create notifications when reactions are added
-- 2. The notification system will then send push notifications (if enabled)
-- 3. Notifications are created in the 'notifications' table
-- 4. Push notifications are sent via the existing push notification system
-- 5. Users only get notified if someone reacts to THEIR message (not their own reactions)

-- ========== TESTING ==========
-- Test by:
-- 1. User A sends a message
-- 2. User B reacts to User A's message
-- 3. User A should receive a push notification
-- 4. Check the notifications table to verify notification was created

SELECT '✅ Reaction push notification trigger created successfully!' as result;

