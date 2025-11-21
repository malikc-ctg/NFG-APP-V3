-- =====================================================
-- Fix RLS Policies for Group Conversations
-- =====================================================
-- Issue: 403 Forbidden when creating group conversations
-- Error: "new row violates row-level security policy for table 'conversations'"
-- Problem: RLS policies are too restrictive for group creation
-- =====================================================

-- Step 1: Fix INSERT policy for conversations
-- Drop existing policies first
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON conversations;

-- Create a permissive INSERT policy for conversations
-- This allows authenticated users to create conversations where they are the creator
CREATE POLICY "Users can create conversations"
  ON conversations FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND created_by = auth.uid()
  );

-- Step 2: Fix INSERT policy for conversation_participants
-- Drop existing policy
DROP POLICY IF EXISTS "Users can add participants to conversations they're in" ON conversation_participants;

-- Create a permissive INSERT policy that allows:
-- 1. Users adding themselves
-- 2. Users already in the conversation adding others
-- 3. Conversation creators adding any participants (for group creation)
CREATE POLICY "Users can add participants to conversations they're in"
  ON conversation_participants FOR INSERT
  WITH CHECK (
    -- Allow if user is adding themselves
    user_id = auth.uid()
    OR
    -- Allow if user is already a participant in the conversation
    user_is_participant(conversation_id, auth.uid())
    OR
    -- Allow if user created the conversation (this allows group creation)
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = conversation_participants.conversation_id
      AND conversations.created_by = auth.uid()
    )
  );

-- Step 3: Grant necessary permissions (if not already granted)
GRANT INSERT ON conversations TO authenticated;
GRANT INSERT ON conversation_participants TO authenticated;

-- Step 4: Verify the helper function exists and has proper permissions
-- This function is used by the RLS policies
-- Just recreate it to ensure it exists (CREATE OR REPLACE is safe)
CREATE OR REPLACE FUNCTION user_is_participant(conv_id UUID, user_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM conversation_participants 
    WHERE conversation_id = conv_id 
      AND user_id = user_id_param
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION user_is_participant(UUID, UUID) TO authenticated;
