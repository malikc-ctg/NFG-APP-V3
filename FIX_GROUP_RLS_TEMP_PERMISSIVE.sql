-- =====================================================
-- TEMPORARY PERMISSIVE FIX: Test if RLS is the issue
-- =====================================================
-- This temporarily makes policies very permissive to test
-- Run this FIRST to see if group creation works
-- Then we can tighten the policies
-- =====================================================

-- Step 1: Drop ALL existing policies
DROP POLICY IF EXISTS "Users can view their conversations" ON conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON conversations;
DROP POLICY IF EXISTS "Users can update their created conversations" ON conversations;
DROP POLICY IF EXISTS "Users can delete their conversations" ON conversations;

DROP POLICY IF EXISTS "Users can view participants in their conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Users can add participants to conversations they're in" ON conversation_participants;
DROP POLICY IF EXISTS "Users can update their own participant record" ON conversation_participants;

-- Step 2: Create VERY permissive policies (for testing only)
-- INSERT: Allow any authenticated user to create conversations
CREATE POLICY "Allow authenticated users to create conversations" ON conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);  -- Allow all inserts from authenticated users

-- SELECT: Allow users to see conversations they're participants in
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

-- UPDATE: Allow users to update conversations they created
CREATE POLICY "Users can update their created conversations" ON conversations
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- DELETE: Allow users to delete conversations they created or are in
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

-- Step 3: Create conversation_participants policies
-- SELECT: Use helper function to avoid recursion
CREATE POLICY "Users can view participants in their conversations" ON conversation_participants
  FOR SELECT
  TO authenticated
  USING (user_is_participant(conversation_id, auth.uid()));

-- INSERT: Very permissive - allow authenticated users to add participants
CREATE POLICY "Allow authenticated users to add participants" ON conversation_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (true);  -- Allow all inserts from authenticated users

-- UPDATE: Users can update their own record
CREATE POLICY "Users can update their own participant record" ON conversation_participants
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Step 4: Ensure helper function exists
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

-- Step 5: Ensure permissions are granted
GRANT SELECT, INSERT, UPDATE, DELETE ON conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON conversation_participants TO authenticated;

