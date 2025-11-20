-- ==========================================
-- CLEANUP: Remove All Message Deletion Features
-- ==========================================
-- This removes all the message_deletions table and related policies/functions
-- Run this to start fresh with message deletion

-- Drop Realtime publication for message_deletions
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'message_deletions'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE message_deletions;
  END IF;
END $$;

-- Drop all policies on message_deletions table
DROP POLICY IF EXISTS "Users can view their own deletions" ON message_deletions;
DROP POLICY IF EXISTS "Users can create their own deletions" ON message_deletions;
DROP POLICY IF EXISTS "Users can create deletions for conversation participants" ON message_deletions;
DROP POLICY IF EXISTS "Users can update their own deletions" ON message_deletions;
DROP POLICY IF EXISTS "Users can delete their own deletion records" ON message_deletions;

-- Drop functions related to message deletions
DROP FUNCTION IF EXISTS user_can_delete_for_participant(UUID, UUID);
DROP FUNCTION IF EXISTS user_is_participant_in_message_conversation(UUID);

-- Drop the message_deletions table (CASCADE will remove indexes and constraints)
DROP TABLE IF EXISTS message_deletions CASCADE;

-- Reset messages table UPDATE policies to original state
-- Drop all existing UPDATE policies on messages
DROP POLICY IF EXISTS "Users can edit their own messages" ON messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON messages;

-- Recreate the original edit policy (from ADD_IN_APP_MESSAGING.sql)
-- This allows editing messages but requires deleted_at to be NULL
CREATE POLICY "Users can edit their own messages"
  ON messages FOR UPDATE
  USING (sender_id = auth.uid() AND deleted_at IS NULL)
  WITH CHECK (sender_id = auth.uid() AND deleted_at IS NULL);

-- Recreate the original delete policy (allows soft delete)
CREATE POLICY "Users can delete their own messages"
  ON messages FOR UPDATE
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());

