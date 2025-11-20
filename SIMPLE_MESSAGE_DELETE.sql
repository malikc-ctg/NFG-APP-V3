-- ==========================================
-- Simple Message Delete - Soft Delete Only
-- ==========================================
-- Just allows users to set deleted_at on their own messages
-- Messages stay in database, just show "This message was deleted" in UI

-- Drop any existing conflicting policies
DROP POLICY IF EXISTS "Users can edit their own messages" ON messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON messages;

-- Single policy: Users can update their own messages
-- This allows:
-- 1. Editing content (when deleted_at IS NULL)
-- 2. Setting deleted_at (soft delete)
CREATE POLICY "Users can update their own messages"
  ON messages FOR UPDATE
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());

-- Ensure UPDATE permission is granted
GRANT UPDATE ON messages TO authenticated;

