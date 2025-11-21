-- =====================================================
-- Fix RLS Policies for Group Conversations
-- =====================================================
-- Issue: 403 Forbidden when creating group conversations
-- Problem: conversation_participants INSERT policy doesn't allow
--          adding participants to a new conversation that doesn't exist yet
-- =====================================================

-- Fix INSERT policy for conversation_participants
-- Allow users to add participants when they created the conversation
DROP POLICY IF EXISTS "Users can add participants to conversations they're in" ON conversation_participants;

CREATE POLICY "Users can add participants to conversations they're in"
  ON conversation_participants FOR INSERT
  WITH CHECK (
    -- Allow if user is adding themselves
    user_id = auth.uid()
    OR
    -- Allow if user is a participant in the conversation
    user_is_participant(conversation_id, auth.uid())
    OR
    -- Allow if user created the conversation (for group creation)
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = conversation_participants.conversation_id
      AND conversations.created_by = auth.uid()
    )
  );

-- Also ensure users can insert into conversations they create
-- (This should already exist, but let's make sure)
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;

CREATE POLICY "Users can create conversations"
  ON conversations FOR INSERT
  WITH CHECK (created_by = auth.uid());

