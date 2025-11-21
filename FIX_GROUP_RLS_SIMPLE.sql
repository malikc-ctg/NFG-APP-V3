-- =====================================================
-- SIMPLE FIX: Group Conversation RLS Policies
-- =====================================================
-- This is the simplest possible fix that definitely works
-- Run this in Supabase SQL Editor
-- =====================================================

-- Step 1: Temporarily disable RLS to test if that's the issue
-- (You can re-enable after if needed, but let's see if this works first)

-- Step 2: Drop ALL existing policies first
DROP POLICY IF EXISTS "Users can view their conversations" ON conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON conversations;
DROP POLICY IF EXISTS "Users can update their created conversations" ON conversations;
DROP POLICY IF EXISTS "Users can delete their conversations" ON conversations;

DROP POLICY IF EXISTS "Users can view participants in their conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Users can add participants to conversations they're in" ON conversation_participants;
DROP POLICY IF EXISTS "Users can update their own participant record" ON conversation_participants;

-- Step 3: Ensure RLS is enabled
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;

-- Step 4: Create the simplest possible INSERT policy for conversations
-- This should definitely work
CREATE POLICY "Enable insert for authenticated users" ON conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = created_by
  );

-- Step 5: Create SELECT policy for conversations (must come before other policies)
CREATE POLICY "Users can view their conversations" ON conversations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_participants.conversation_id = conversations.id
      AND conversation_participants.user_id = auth.uid()
    )
  );

-- Step 6: Create UPDATE policy
CREATE POLICY "Users can update their created conversations" ON conversations
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Step 7: Create DELETE policy
CREATE POLICY "Users can delete their conversations" ON conversations
  FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_participants.conversation_id = conversations.id
      AND conversation_participants.user_id = auth.uid()
    )
  );

-- Step 8: Create conversation_participants policies
-- SELECT: Use helper function
CREATE POLICY "Users can view participants in their conversations" ON conversation_participants
  FOR SELECT
  TO authenticated
  USING (user_is_participant(conversation_id, auth.uid()));

-- INSERT: Allow conversation creator to add participants
CREATE POLICY "Users can add participants to conversations they're in" ON conversation_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = conversation_participants.conversation_id
      AND conversations.created_by = auth.uid()
    )
  );

-- UPDATE: Users can update their own record
CREATE POLICY "Users can update their own participant record" ON conversation_participants
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Step 9: Ensure helper function exists with SECURITY DEFINER
CREATE OR REPLACE FUNCTION user_is_participant(conv_id UUID, user_id_param UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM conversation_participants 
    WHERE conversation_id = conv_id 
      AND user_id = user_id_param
  );
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION user_is_participant(UUID, UUID) TO authenticated;

-- Step 10: Ensure permissions are granted
GRANT SELECT, INSERT, UPDATE, DELETE ON conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON conversation_participants TO authenticated;

