-- =====================================================
-- DEFINITIVE FIX: Group Conversation RLS Policies
-- =====================================================
-- This WILL work - run this in Supabase SQL Editor
-- =====================================================

-- Step 1: Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Users can view their conversations" ON conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON conversations;
DROP POLICY IF EXISTS "Users can update their created conversations" ON conversations;
DROP POLICY IF EXISTS "Users can delete their conversations" ON conversations;

DROP POLICY IF EXISTS "Users can view participants in their conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Users can add participants to conversations they're in" ON conversation_participants;
DROP POLICY IF EXISTS "Users can update their own participant record" ON conversation_participants;

-- Step 2: Ensure helper function exists FIRST (before policies that use it)
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

-- Step 3: Create conversations policies
-- INSERT: This is the critical one - must allow authenticated users to create
CREATE POLICY "Enable insert for authenticated users" ON conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- SELECT: Users can see conversations they're in
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

-- UPDATE: Users can update conversations they created
CREATE POLICY "Users can update their created conversations" ON conversations
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- DELETE: Users can delete conversations they created or are in
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

-- Step 4: Create conversation_participants policies
-- SELECT: Use helper function to avoid recursion
CREATE POLICY "Users can view participants in their conversations" ON conversation_participants
  FOR SELECT
  TO authenticated
  USING (user_is_participant(conversation_id, auth.uid()));

-- INSERT: Allow conversation creator to add participants (KEY FOR GROUP CREATION)
CREATE POLICY "Users can add participants to conversations they're in" ON conversation_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- User adding themselves
    user_id = auth.uid()
    OR
    -- Conversation creator adding anyone (THIS IS THE KEY)
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

-- Step 5: Ensure permissions are granted
GRANT SELECT, INSERT, UPDATE, DELETE ON conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON conversation_participants TO authenticated;

