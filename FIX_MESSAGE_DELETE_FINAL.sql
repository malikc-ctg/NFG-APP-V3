-- ==========================================
-- FINAL FIX: Message Delete RLS
-- ==========================================
-- This script completely fixes the RLS policy for message deletion
-- Run this after CLEANUP_MESSAGE_DELETION.sql (if you ran that)

-- Step 1: Drop ALL existing UPDATE policies on messages (be very aggressive)
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
    
    -- Also try dropping by name (in case the loop missed any)
    EXECUTE 'DROP POLICY IF EXISTS "Users can edit their own messages" ON messages';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete their own messages" ON messages';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update their own messages" ON messages';
END $$;

-- Step 2: Verify RLS is enabled (should be, but check)
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Step 3: Create SINGLE unified UPDATE policy
-- This allows users to update their own messages (edit OR delete)
CREATE POLICY "Users can update their own messages"
  ON messages FOR UPDATE
  USING (sender_id = auth.uid())  -- Can only update messages they sent
  WITH CHECK (sender_id = auth.uid());  -- Updated message must still belong to them

-- Step 4: Ensure permissions are granted
GRANT UPDATE ON messages TO authenticated;

-- Step 5: Verify the policy was created
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'messages' 
    AND policyname = 'Users can update their own messages'
    AND cmd = 'UPDATE'
  ) THEN
    RAISE EXCEPTION 'Policy creation failed!';
  ELSE
    RAISE NOTICE 'SUCCESS: Policy "Users can update their own messages" created successfully!';
  END IF;
END $$;

-- Step 6: Show all current UPDATE policies (for verification)
SELECT 
  policyname,
  cmd,
  qual as using_clause,
  with_check
FROM pg_policies
WHERE tablename = 'messages'
  AND cmd = 'UPDATE';

