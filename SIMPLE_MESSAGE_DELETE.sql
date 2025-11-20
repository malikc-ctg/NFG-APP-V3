-- ==========================================
-- Simple Message Delete - Soft Delete Only
-- ==========================================
-- Just allows users to set deleted_at on their own messages
-- Messages stay in database, just show "This message was deleted" in UI

-- Step 1: Drop ALL existing UPDATE policies (be aggressive - loop through all)
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'messages' 
        AND cmd = 'UPDATE'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON messages', pol.policyname);
        RAISE NOTICE 'Dropped policy: %', pol.policyname;
    END LOOP;
END $$;

-- Single unified policy: Users can update their own messages
-- USING: Check if user owns the message (can update existing messages they sent)
-- WITH CHECK: Ensure the updated message still belongs to them (prevents changing sender_id)
-- No restrictions on deleted_at - allows both editing and soft deleting
CREATE POLICY "Users can update their own messages"
  ON messages FOR UPDATE
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());

-- Ensure UPDATE permission is granted (should already exist, but ensure it)
GRANT UPDATE ON messages TO authenticated;

-- Verify the policy was created
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'messages' 
    AND policyname = 'Users can update their own messages'
  ) THEN
    RAISE EXCEPTION 'Policy creation failed!';
  END IF;
END $$;

