-- ==========================================
-- FIX Message Delete RLS Policy
-- ==========================================
-- This fixes the RLS policy for deleting messages to allow soft deletes

-- Drop the existing delete policy
DROP POLICY IF EXISTS "Users can delete their own messages" ON messages;

-- Create a new delete policy that allows setting deleted_at
-- This policy specifically allows updating deleted_at and updated_at fields
CREATE POLICY "Users can delete their own messages"
  ON messages FOR UPDATE
  USING (
    sender_id = auth.uid()
    AND deleted_at IS NULL  -- Can only delete if not already deleted
  )
  WITH CHECK (
    sender_id = auth.uid()
    -- Allow deleted_at to be set (don't require it to be NULL in WITH CHECK)
  );

-- Also ensure the edit policy allows editing only non-deleted messages
-- (This should already exist, but let's make sure)
DROP POLICY IF EXISTS "Users can edit their own messages" ON messages;

CREATE POLICY "Users can edit their own messages"
  ON messages FOR UPDATE
  USING (
    sender_id = auth.uid() 
    AND deleted_at IS NULL  -- Can only edit non-deleted messages
  )
  WITH CHECK (
    sender_id = auth.uid()
    AND deleted_at IS NULL  -- Can't set deleted_at via edit policy (use delete policy instead)
  );

