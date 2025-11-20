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

-- Users can view their own deletions
CREATE POLICY "Users can view their own deletions"
  ON message_deletions FOR SELECT
  USING (user_id = auth.uid());

-- Users can create their own deletion records
CREATE POLICY "Users can create their own deletions"
  ON message_deletions FOR INSERT
  WITH CHECK (user_id = auth.uid());

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

