-- =====================================================
-- In-App Messaging System - Database Schema
-- Phase 1: MVP (Core Messaging)
-- =====================================================

-- ========== CONVERSATIONS TABLE ==========
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(20) NOT NULL DEFAULT 'direct', -- 'direct', 'job', 'group'
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE, -- NULL for direct/group
  title VARCHAR(255), -- For group conversations
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  last_message_at TIMESTAMPTZ, -- For sorting conversations
  CONSTRAINT conversations_type_check CHECK (type IN ('direct', 'job', 'group')),
  CONSTRAINT conversations_job_unique UNIQUE(job_id) -- One conversation per job
);

-- Indexes for conversations
CREATE INDEX IF NOT EXISTS idx_conversations_type ON conversations(type);
CREATE INDEX IF NOT EXISTS idx_conversations_job_id ON conversations(job_id) WHERE job_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conversations_created_by ON conversations(created_by);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON conversations(last_message_at DESC NULLS LAST);

-- ========== CONVERSATION PARTICIPANTS TABLE ==========
CREATE TABLE IF NOT EXISTS conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role VARCHAR(20) DEFAULT 'participant' NOT NULL, -- 'participant', 'admin'
  joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  last_read_at TIMESTAMPTZ, -- For read receipts and unread counts
  CONSTRAINT conversation_participants_role_check CHECK (role IN ('participant', 'admin')),
  CONSTRAINT conversation_participants_unique UNIQUE(conversation_id, user_id)
);

-- Indexes for conversation_participants
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_id ON conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation_id ON conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_last_read_at ON conversation_participants(last_read_at);

-- ========== MESSAGES TABLE ==========
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text' NOT NULL, -- 'text', 'image', 'file', 'system'
  attachment_url TEXT, -- For images/files (Supabase Storage URL)
  attachment_name VARCHAR(255), -- Original filename
  reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL, -- For threaded replies (Phase 4)
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  deleted_at TIMESTAMPTZ, -- Soft delete
  is_edited BOOLEAN DEFAULT FALSE NOT NULL,
  CONSTRAINT messages_type_check CHECK (message_type IN ('text', 'image', 'file', 'system'))
);

-- Indexes for messages
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_reply_to_id ON messages(reply_to_id) WHERE reply_to_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_deleted_at ON messages(deleted_at) WHERE deleted_at IS NULL;

-- ========== MESSAGE READS TABLE (Read Receipts) ==========
CREATE TABLE IF NOT EXISTS message_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  read_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT message_reads_unique UNIQUE(message_id, user_id)
);

-- Indexes for message_reads
CREATE INDEX IF NOT EXISTS idx_message_reads_user_id ON message_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_message_reads_message_id ON message_reads(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reads_read_at ON message_reads(read_at);

-- ========== TRIGGERS ==========

-- Update conversations.updated_at and last_message_at when message is inserted
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET 
    updated_at = NOW(),
    last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_conversation_on_message ON messages;
CREATE TRIGGER trigger_update_conversation_on_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_on_message();

-- Update conversations.updated_at when message is updated
CREATE OR REPLACE FUNCTION update_conversation_on_message_update()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_conversation_on_message_update ON messages;
CREATE TRIGGER trigger_update_conversation_on_message_update
  AFTER UPDATE ON messages
  FOR EACH ROW
  WHEN (OLD.content IS DISTINCT FROM NEW.content OR OLD.deleted_at IS DISTINCT FROM NEW.deleted_at)
  EXECUTE FUNCTION update_conversation_on_message_update();

-- Update messages.updated_at on update
CREATE OR REPLACE FUNCTION update_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_messages_updated_at ON messages;
CREATE TRIGGER trigger_update_messages_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_messages_updated_at();

-- Update conversations.updated_at on update
CREATE OR REPLACE FUNCTION update_conversations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_conversations_updated_at ON conversations;
CREATE TRIGGER trigger_update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_conversations_updated_at();

-- ========== ROW LEVEL SECURITY (RLS) ==========

-- Enable RLS on all tables
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reads ENABLE ROW LEVEL SECURITY;

-- ========== HELPER FUNCTION (Must be created before policies) ==========

-- Helper function to check if user is a participant (avoids recursion)
-- This must be created BEFORE any policies that use it
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION user_is_participant(UUID, UUID) TO authenticated;

-- ========== CONVERSATIONS POLICIES ==========

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their conversations" ON conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Users can update their created conversations" ON conversations;

-- Users can view conversations they're participants in
CREATE POLICY "Users can view their conversations"
  ON conversations FOR SELECT
  USING (user_is_participant(id, auth.uid()));

-- Users can create conversations
CREATE POLICY "Users can create conversations"
  ON conversations FOR INSERT
  WITH CHECK (created_by = auth.uid());

-- Users can update conversations they created (for group conversations)
CREATE POLICY "Users can update their created conversations"
  ON conversations FOR UPDATE
  USING (created_by = auth.uid());

-- ========== CONVERSATION PARTICIPANTS POLICIES ==========

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view participants in their conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Users can add participants to conversations they're in" ON conversation_participants;
DROP POLICY IF EXISTS "Users can update their own participant record" ON conversation_participants;

-- Users can view participants in their conversations
CREATE POLICY "Users can view participants in their conversations"
  ON conversation_participants FOR SELECT
  USING (user_is_participant(conversation_id, auth.uid()));

-- Users can add themselves to conversations (for group chats)
CREATE POLICY "Users can add participants to conversations they're in"
  ON conversation_participants FOR INSERT
  WITH CHECK (
    user_is_participant(conversation_id, auth.uid())
    OR user_id = auth.uid()
  );

-- Users can update their own participant record (e.g., last_read_at)
CREATE POLICY "Users can update their own participant record"
  ON conversation_participants FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ========== MESSAGES POLICIES ==========

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can send messages to their conversations" ON messages;
DROP POLICY IF EXISTS "Users can edit their own messages" ON messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON messages;

-- Users can view messages in their conversations
CREATE POLICY "Users can view messages in their conversations"
  ON messages FOR SELECT
  USING (
    user_is_participant(conversation_id, auth.uid())
    AND deleted_at IS NULL
  );

-- Users can send messages to conversations they're in
CREATE POLICY "Users can send messages to their conversations"
  ON messages FOR INSERT
  WITH CHECK (
    user_is_participant(conversation_id, auth.uid())
    AND sender_id = auth.uid()
  );

-- Users can edit their own messages
CREATE POLICY "Users can edit their own messages"
  ON messages FOR UPDATE
  USING (sender_id = auth.uid() AND deleted_at IS NULL)
  WITH CHECK (sender_id = auth.uid());

-- Users can delete their own messages (soft delete)
CREATE POLICY "Users can delete their own messages"
  ON messages FOR UPDATE
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());

-- ========== MESSAGE READS POLICIES ==========

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view read receipts in their conversations" ON message_reads;
DROP POLICY IF EXISTS "Users can mark messages as read" ON message_reads;

-- Users can view read receipts for messages in their conversations
CREATE POLICY "Users can view read receipts in their conversations"
  ON message_reads FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM messages m
      WHERE m.id = message_reads.message_id
        AND user_is_participant(m.conversation_id, auth.uid())
    )
  );

-- Users can mark messages as read in their conversations
CREATE POLICY "Users can mark messages as read"
  ON message_reads FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM messages m
      WHERE m.id = message_reads.message_id
        AND user_is_participant(m.conversation_id, auth.uid())
    )
  );

-- ========== GRANTS ==========

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON conversation_participants TO authenticated;
GRANT SELECT, INSERT, UPDATE ON messages TO authenticated;
GRANT SELECT, INSERT ON message_reads TO authenticated;

-- Grant usage on sequences (if using SERIAL, but we're using UUID so this may not be needed)
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ========== HELPER FUNCTION: Create Direct Conversation ==========

CREATE OR REPLACE FUNCTION create_direct_conversation(user1_id UUID, user2_id UUID)
RETURNS UUID AS $$
DECLARE
  conversation_id UUID;
  existing_conversation_id UUID;
BEGIN
  -- Validate inputs
  IF user1_id IS NULL OR user2_id IS NULL THEN
    RAISE EXCEPTION 'Both user IDs must be provided';
  END IF;
  
  IF user1_id = user2_id THEN
    RAISE EXCEPTION 'Cannot create conversation with yourself';
  END IF;
  
  -- Check if conversation already exists between these two users
  SELECT c.id INTO existing_conversation_id
  FROM conversations c
  WHERE c.type = 'direct'
    AND EXISTS (
      SELECT 1 FROM conversation_participants cp1
      WHERE cp1.conversation_id = c.id AND cp1.user_id = user1_id
    )
    AND EXISTS (
      SELECT 1 FROM conversation_participants cp2
      WHERE cp2.conversation_id = c.id AND cp2.user_id = user2_id
    )
    AND (SELECT COUNT(*) FROM conversation_participants WHERE conversation_id = c.id) = 2
  LIMIT 1;
  
  -- If conversation exists, return it
  IF existing_conversation_id IS NOT NULL THEN
    RETURN existing_conversation_id;
  END IF;
  
  -- Create new conversation
  INSERT INTO conversations (type, created_by)
  VALUES ('direct', user1_id)
  RETURNING id INTO conversation_id;
  
  -- Add both users as participants
  INSERT INTO conversation_participants (conversation_id, user_id)
  VALUES 
    (conversation_id, user1_id),
    (conversation_id, user2_id);
  
  RETURN conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_direct_conversation(UUID, UUID) TO authenticated;

-- ========== HELPER FUNCTION: Mark Conversation as Read ==========

CREATE OR REPLACE FUNCTION mark_conversation_as_read(conv_id UUID, user_id_param UUID)
RETURNS VOID AS $$
BEGIN
  -- Update participant's last_read_at
  UPDATE conversation_participants
  SET last_read_at = NOW()
  WHERE conversation_id = conv_id
    AND user_id = user_id_param;
  
  -- Mark all unread messages as read
  INSERT INTO message_reads (message_id, user_id, read_at)
  SELECT m.id, user_id_param, NOW()
  FROM messages m
  WHERE m.conversation_id = conv_id
    AND m.sender_id != user_id_param
    AND m.deleted_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM message_reads mr
      WHERE mr.message_id = m.id AND mr.user_id = user_id_param
    )
  ON CONFLICT (message_id, user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION mark_conversation_as_read(UUID, UUID) TO authenticated;

-- ========== ENABLE REALTIME (for Supabase Realtime) ==========

-- Enable Realtime for messages table (for real-time message delivery)
-- Note: This may fail if already enabled, which is fine - just means it's already set up
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  END IF;
END $$;

-- Note: You may need to enable Realtime in Supabase Dashboard as well
-- Dashboard > Database > Replication > Enable for 'messages' table

-- ========== COMMENTS ==========

COMMENT ON TABLE conversations IS 'Stores conversation metadata (direct messages, job conversations, group chats)';
COMMENT ON TABLE conversation_participants IS 'Tracks which users are in each conversation';
COMMENT ON TABLE messages IS 'Stores all messages sent in conversations';
COMMENT ON TABLE message_reads IS 'Tracks read receipts for messages';

COMMENT ON FUNCTION create_direct_conversation IS 'Creates a direct message conversation between two users, or returns existing one';
COMMENT ON FUNCTION mark_conversation_as_read IS 'Marks a conversation as read for a user and updates read receipts';

