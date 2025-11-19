-- =====================================================
-- Fix RLS Policy for message_reads to prevent 403 errors
-- =====================================================

-- The current RLS policy uses EXISTS with a subquery which can be slow
-- and may cause issues with .in() queries. Let's improve it.

-- Drop existing policy
DROP POLICY IF EXISTS "Users can view read receipts in their conversations" ON message_reads;

-- Create improved policy that's more efficient
-- This allows users to view read receipts for messages in conversations they're part of
CREATE POLICY "Users can view read receipts in their conversations"
  ON message_reads FOR SELECT
  USING (
    -- User is a participant in the conversation that contains this message
    EXISTS (
      SELECT 1
      FROM messages m
      INNER JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
      WHERE m.id = message_reads.message_id
        AND cp.user_id = auth.uid()
    )
  );

-- Verify the policy works
-- Test query (should not return 403):
-- SELECT * FROM message_reads WHERE message_id IN (SELECT id FROM messages WHERE conversation_id = 'YOUR_CONVERSATION_ID');

