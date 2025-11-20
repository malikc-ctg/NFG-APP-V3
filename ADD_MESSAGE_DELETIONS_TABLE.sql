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

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own deletions" ON message_deletions;
DROP POLICY IF EXISTS "Users can create their own deletions" ON message_deletions;
DROP POLICY IF EXISTS "Users can create deletions for conversation participants" ON message_deletions;
DROP POLICY IF EXISTS "Users can update their own deletions" ON message_deletions;
DROP POLICY IF EXISTS "Users can delete their own deletion records" ON message_deletions;

-- Users can view their own deletions
CREATE POLICY "Users can view their own deletions"
  ON message_deletions FOR SELECT
  USING (user_id = auth.uid());

-- Helper function to check if user can delete message for another participant
CREATE OR REPLACE FUNCTION user_can_delete_for_participant(
  p_message_id UUID,
  p_target_user_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  -- Check if both current user and target user are participants in the message's conversation
  RETURN EXISTS (
    SELECT 1
    FROM messages m
    WHERE m.id = p_message_id
      AND EXISTS (
        SELECT 1 FROM conversation_participants cp1
        WHERE cp1.conversation_id = m.conversation_id
          AND cp1.user_id = auth.uid()
      )
      AND EXISTS (
        SELECT 1 FROM conversation_participants cp2
        WHERE cp2.conversation_id = m.conversation_id
          AND cp2.user_id = p_target_user_id
      )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION user_can_delete_for_participant(UUID, UUID) TO authenticated;

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

