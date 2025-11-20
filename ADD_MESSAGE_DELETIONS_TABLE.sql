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

-- Helper function to check if user is participant in message's conversation
-- Uses SECURITY DEFINER to bypass RLS when checking participants
CREATE OR REPLACE FUNCTION user_is_participant_in_message_conversation(
  p_message_id UUID
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
  
  -- Check if current user is a participant in the conversation
  -- Use the existing user_is_participant function which already has SECURITY DEFINER
  RETURN user_is_participant(v_conversation_id, auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION user_is_participant_in_message_conversation(UUID) TO authenticated;

-- Users can view their own deletions
CREATE POLICY "Users can view their own deletions"
  ON message_deletions FOR SELECT
  USING (user_id = auth.uid());

-- Users can create deletion records for participants in their conversations
-- Simplified: If user is a participant in the message's conversation, they can create deletion records
CREATE POLICY "Users can create deletions for conversation participants"
  ON message_deletions FOR INSERT
  WITH CHECK (
    -- Check directly in the policy to avoid function call issues
    EXISTS (
      SELECT 1
      FROM messages m
      INNER JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
      WHERE m.id = message_deletions.message_id
        AND cp.user_id = auth.uid()
    )
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

-- Enable Realtime publication for message_deletions
-- This allows real-time updates when messages are deleted
-- Only add if not already in publication (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'message_deletions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE message_deletions;
  END IF;
END $$;

