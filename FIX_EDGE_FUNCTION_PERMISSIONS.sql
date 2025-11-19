-- =====================================================
-- Fix Edge Function Permission Issue
-- Edge Function can't access conversation_participants table
-- Error: "permission denied for table conversation_participants"
-- =====================================================

-- The Edge Function uses service_role key but still gets blocked
-- Solution: Grant service_role explicit access to all needed tables

-- Grant service_role full access to tables needed by Edge Function
GRANT ALL ON conversation_participants TO service_role;
GRANT ALL ON messages TO service_role;
GRANT ALL ON user_profiles TO service_role;
GRANT ALL ON push_subscriptions TO service_role;
GRANT ALL ON conversations TO service_role;

-- Verify grants
SELECT 
  table_name,
  privilege_type,
  grantee
FROM information_schema.table_privileges
WHERE table_schema = 'public'
  AND table_name IN ('conversation_participants', 'messages', 'user_profiles', 'push_subscriptions', 'conversations')
  AND grantee = 'service_role'
ORDER BY table_name;

-- After running this, test by sending a message
-- Edge Function logs should show:
-- ✅ "[Push Notification] Participants found: 1" (or more)
-- ❌ NOT "permission denied for table conversation_participants"
