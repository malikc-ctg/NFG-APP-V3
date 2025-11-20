-- ==========================================
-- Add Message Deletions Table
-- ==========================================
-- This table tracks which users have deleted which messages
-- This allows per-user deletion without RLS conflicts on the messages table

-- Create message_deletions table
CREATE TABLE IF NOT EXISTS message_deletions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  deleted_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(message_id, user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_message_deletions_message_id ON message_deletions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_deletions_user_id ON message_deletions(user_id);
CREATE INDEX IF NOT EXISTS idx_message_deletions_user_message ON message_deletions(user_id, message_id);

-- Enable RLS
ALTER TABLE message_deletions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for message_deletions

-- Drop existing policies first (they depend on the function)
DROP POLICY IF EXISTS "Users can view their own deletions" ON message_deletions;
DROP POLICY IF EXISTS "Users can create their own deletions" ON message_deletions;
DROP POLICY IF EXISTS "Users can create deletions for conversation participants" ON message_deletions;
DROP POLICY IF EXISTS "Users can update their own deletions" ON message_deletions;
DROP POLICY IF EXISTS "Users can delete their own deletion records" ON message_deletions;

-- Drop existing function after policies are dropped
DROP FUNCTION IF EXISTS user_can_delete_for_participant(UUID, UUID);

-- Helper function to check if user can delete message for another participant
-- Uses SECURITY DEFINER to bypass RLS when checking participants
-- Uses the existing user_is_participant function which is already working
CREATE OR REPLACE FUNCTION user_can_delete_for_participant(
  p_message_id UUID,
  p_target_user_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_conversation_id UUID;
BEGIN
  -- Get the conversation_id for the message
  SELECT conversation_id INTO v_conversation_id
  FROM messages
  WHERE id = p_message_id;
  
  -- If message not found, deny
  IF v_conversation_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check if both current user and target user are participants
  -- Use the existing user_is_participant function which already has SECURITY DEFINER
  RETURN user_is_participant(v_conversation_id, auth.uid())
    AND user_is_participant(v_conversation_id, p_target_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION user_can_delete_for_participant(UUID, UUID) TO authenticated;

-- Users can view their own deletions
CREATE POLICY "Users can view their own deletions"
  ON message_deletions FOR SELECT
  USING (user_id = auth.uid());

-- Users can create deletion records for participants in their conversations
CREATE POLICY "Users can create deletions for conversation participants"
  ON message_deletions FOR INSERT
  WITH CHECK (
    -- Allow if user is creating their own deletion
    user_id = auth.uid()
    OR
    -- OR allow if user is a participant and target user is also a participant in the same conversation
    user_can_delete_for_participant(message_id, user_id)
  );

-- Users can update their own deletion records (in case we want to undo)
CREATE POLICY "Users can update their own deletions"
  ON message_deletions FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own deletion records (to "undelete")
CREATE POLICY "Users can delete their own deletion records"
  ON message_deletions FOR DELETE
  USING (user_id = auth.uid());

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON message_deletions TO authenticated;

