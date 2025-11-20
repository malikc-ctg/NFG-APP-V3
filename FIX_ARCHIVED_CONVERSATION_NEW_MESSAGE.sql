-- ==========================================
-- Fix: Handle Archived Conversations in New Messages
-- ==========================================
-- This updates the create_direct_conversation function to un-archive
-- conversations when creating a new message, so archived conversations
-- can be revived by starting a new message.
-- ==========================================

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
  
  -- Check if conversation already exists between these two users (including archived ones)
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
    AND (SELECT COUNT(*) FROM conversation_participants cp3 WHERE cp3.conversation_id = c.id) = 2
  LIMIT 1;
  
  -- If conversation exists, un-archive it if it was archived and return it
  IF existing_conversation_id IS NOT NULL THEN
    -- Un-archive the conversation if it was archived
    UPDATE conversations
    SET archived_at = NULL,
        archived_by = NULL,
        updated_at = NOW()
    WHERE id = existing_conversation_id
      AND archived_at IS NOT NULL;
    
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

COMMENT ON FUNCTION create_direct_conversation IS 'Creates a direct message conversation between two users, or returns existing one (un-archives if it was archived)';

