-- ==========================================
-- Phase 3.1: Message Reactions
-- ==========================================
-- This creates a table to store emoji reactions on messages
-- Run this in Supabase SQL Editor
-- ==========================================

-- Create message_reactions table
CREATE TABLE IF NOT EXISTS message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  emoji VARCHAR(10) NOT NULL, -- Emoji character (e.g., '👍', '❤️', '😂')
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(message_id, user_id, emoji) -- One reaction per user per emoji per message
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user_id ON message_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_emoji ON message_reactions(emoji);

-- Enable RLS
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can view reactions on messages in their conversations
CREATE POLICY "Users can view reactions in their conversations"
  ON message_reactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM messages m
      JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
      WHERE m.id = message_reactions.message_id
        AND cp.user_id = auth.uid()
    )
  );

-- Users can add reactions to messages in their conversations
CREATE POLICY "Users can add reactions in their conversations"
  ON message_reactions FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM messages m
      JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
      WHERE m.id = message_reactions.message_id
        AND cp.user_id = auth.uid()
    )
  );

-- Users can remove their own reactions
CREATE POLICY "Users can remove their own reactions"
  ON message_reactions FOR DELETE
  USING (user_id = auth.uid());

-- Grant permissions
GRANT SELECT, INSERT, DELETE ON message_reactions TO authenticated;

-- Enable Realtime publication for message_reactions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'message_reactions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE message_reactions;
  END IF;
END $$;

