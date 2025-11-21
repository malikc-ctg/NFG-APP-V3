-- =====================================================
-- WORKING FIX: Group Conversation RLS Policies
-- =====================================================
-- This is a simplified, tested approach that actually works
-- Run this in Supabase SQL Editor
-- =====================================================

-- Step 1: Drop ALL existing policies
DROP POLICY IF EXISTS "Users can view their conversations" ON conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON conversations;
DROP POLICY IF EXISTS "Users can update their created conversations" ON conversations;
DROP POLICY IF EXISTS "Users can delete their conversations" ON conversations;
DROP POLICY IF EXISTS "Users can view participants in their conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Users can add participants to conversations they're in" ON conversation_participants;
DROP POLICY IF EXISTS "Users can update their own participant record" ON conversation_participants;

-- Step 2: Create simple, permissive policies for conversations
-- SELECT: Users can see conversations where they are participants
CREATE POLICY "Users can view their conversations"
  ON conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_participants.conversation_id = conversations.id
      AND conversation_participants.user_id = auth.uid()
    )
  );

-- INSERT: Simple check - user must be authenticated and set themselves as creator
CREATE POLICY "Users can create conversations"
  ON conversations FOR INSERT
  WITH CHECK (created_by = auth.uid());

-- UPDATE: Users can update conversations they created
CREATE POLICY "Users can update their created conversations"
  ON conversations FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- DELETE: Users can delete conversations they created or are in
CREATE POLICY "Users can delete their conversations"
  ON conversations FOR DELETE
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_participants.conversation_id = conversations.id
      AND conversation_participants.user_id = auth.uid()
    )
  );

-- Step 3: Create policies for conversation_participants
-- SELECT: Use helper function to avoid recursion
CREATE POLICY "Users can view participants in their conversations"
  ON conversation_participants FOR SELECT
  USING (user_is_participant(conversation_id, auth.uid()));

-- INSERT: Critical policy - must allow group creation
-- This allows:
-- 1. User adding themselves (user_id = auth.uid())
-- 2. User who created the conversation adding anyone (for group creation)
CREATE POLICY "Users can add participants to conversations they're in"
  ON conversation_participants FOR INSERT
  WITH CHECK (
    -- Allow user to add themselves
    user_id = auth.uid()
    OR
    -- Allow conversation creator to add anyone (this is key for group creation)
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = conversation_participants.conversation_id
      AND conversations.created_by = auth.uid()
    )
  );

-- UPDATE: Users can update their own participant record
CREATE POLICY "Users can update their own participant record"
  ON conversation_participants FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Step 4: Ensure helper function exists and is SECURITY DEFINER
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

-- Step 5: Ensure table permissions are granted
GRANT SELECT, INSERT, UPDATE, DELETE ON conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON conversation_participants TO authenticated;

