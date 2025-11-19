-- =====================================================
-- Quick Test for Message Push Notifications
-- Run this to diagnose why push notifications aren't working
-- =====================================================

-- 1. Check if push_subscriptions table exists
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'push_subscriptions'
) AS push_subscriptions_table_exists;

-- 2. Check if users have push subscriptions
SELECT 
  u.id,
  u.email,
  u.full_name,
  COUNT(ps.id) as subscription_count,
  MAX(ps.created_at) as last_subscription
FROM user_profiles u
LEFT JOIN push_subscriptions ps ON ps.user_id = u.id
GROUP BY u.id, u.email, u.full_name
ORDER BY subscription_count DESC;

-- 3. Check recent messages (to verify messages are being created)
SELECT 
  id,
  conversation_id,
  sender_id,
  LEFT(content, 50) as content_preview,
  created_at
FROM messages 
ORDER BY created_at DESC 
LIMIT 5;

-- 4. Check conversation participants (to see who should receive notifications)
SELECT 
  cp.conversation_id,
  COUNT(DISTINCT cp.user_id) as participant_count,
  COUNT(DISTINCT ps.user_id) as participants_with_push
FROM conversation_participants cp
LEFT JOIN push_subscriptions ps ON ps.user_id = cp.user_id
GROUP BY cp.conversation_id
ORDER BY cp.conversation_id DESC
LIMIT 10;

-- 5. Check if webhook exists (you'll need to check Dashboard manually)
-- Go to: Database > Webhooks > message-push-notification

-- 6. Manual test: Get a recent message and check if participants have push subscriptions
SELECT 
  m.id as message_id,
  m.conversation_id,
  m.sender_id,
  cp.user_id as recipient_id,
  u.email as recipient_email,
  CASE WHEN ps.id IS NOT NULL THEN 'HAS PUSH' ELSE 'NO PUSH' END as push_status
FROM messages m
INNER JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
LEFT JOIN user_profiles u ON u.id = cp.user_id
LEFT JOIN push_subscriptions ps ON ps.user_id = cp.user_id
WHERE m.sender_id != cp.user_id  -- Exclude sender
  AND m.created_at > NOW() - INTERVAL '1 hour'  -- Last hour
ORDER BY m.created_at DESC
LIMIT 20;

