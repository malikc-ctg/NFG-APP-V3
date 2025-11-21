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
-- Fix the INSERT policy to be more explicit
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON conversations;

-- Create a more permissive policy for INSERT
CREATE POLICY "Users can create conversations"
  ON conversations FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND created_by = auth.uid()
  );

-- Also add a fallback policy (if the above doesn't work due to function evaluation)
-- This allows authenticated users to create conversations where they set themselves as creator
CREATE POLICY "Enable insert for authenticated users" ON conversations
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND (
      created_by = auth.uid()
      OR created_by IS NULL  -- Allow null, we'll handle it in the function
    )
  );

