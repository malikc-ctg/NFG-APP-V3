-- ==========================================
-- FIX Message Delete RLS - Simple Soft Delete
-- ==========================================
-- Allow users to soft delete their own messages by setting deleted_at

-- Drop existing policies
DROP POLICY IF EXISTS "Users can edit their own messages" ON messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON messages;

-- Single unified policy: Users can update their own messages
-- This allows both editing content AND setting deleted_at
CREATE POLICY "Users can update their own messages"
  ON messages FOR UPDATE
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());

-- Grant UPDATE permission (should already exist, but ensure it)
GRANT UPDATE ON messages TO authenticated;

