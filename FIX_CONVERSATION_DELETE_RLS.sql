-- ==========================================
-- Fix: Add DELETE Policy for Conversations
-- ==========================================
-- This adds the missing DELETE policy so users can delete conversations
-- they created or are participants in.
-- ==========================================

-- Drop existing DELETE policy if it exists
DROP POLICY IF EXISTS "Users can delete their conversations" ON conversations;

-- Users can delete conversations they created or are participants in
CREATE POLICY "Users can delete their conversations"
  ON conversations FOR DELETE
  USING (
    created_by = auth.uid()
    OR user_is_participant(id, auth.uid())
  );

-- Grant DELETE permission (should already exist, but ensure it)
GRANT DELETE ON conversations TO authenticated;

-- Verify the policy was created
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'conversations' 
    AND policyname = 'Users can delete their conversations'
    AND cmd = 'DELETE'
  ) THEN
    RAISE EXCEPTION 'Policy creation failed!';
  ELSE
    RAISE NOTICE 'SUCCESS: DELETE policy "Users can delete their conversations" created successfully!';
  END IF;
END $$;

-- Show all policies on conversations table for verification
SELECT 
  'Current policies on conversations table:' as info;
  
SELECT 
  policyname,
  cmd,
  qual as using_clause,
  with_check as with_check_clause
FROM pg_policies
WHERE tablename = 'conversations'
ORDER BY cmd, policyname;

