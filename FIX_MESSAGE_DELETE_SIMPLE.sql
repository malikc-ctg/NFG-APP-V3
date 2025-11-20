-- ==========================================
-- FIX Message Delete RLS - Simple Soft Delete
-- ==========================================
-- Allow users to soft delete their own messages by setting deleted_at

-- Drop ALL existing UPDATE policies on messages
DROP POLICY IF EXISTS "Users can edit their own messages" ON messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON messages;

-- Single unified policy: Users can update their own messages
-- This allows both editing content AND setting deleted_at
-- No restrictions on deleted_at - users can set it or unset it
CREATE POLICY "Users can update their own messages"
  ON messages FOR UPDATE
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());

-- Ensure UPDATE permission is granted
GRANT UPDATE ON messages TO authenticated;

