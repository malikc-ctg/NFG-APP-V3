-- ==========================================
-- ULTIMATE FIX: Message Delete RLS
-- ==========================================
-- This is the most aggressive fix possible
-- It completely resets RLS and creates the simplest possible policy

-- Step 1: Disable RLS completely
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL policies (use CASCADE to drop dependencies)
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    RAISE NOTICE '=== DROPPING ALL POLICIES ===';
    
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'messages'
    LOOP
        BEGIN
            EXECUTE format('DROP POLICY IF EXISTS %I ON messages CASCADE', pol.policyname);
            RAISE NOTICE 'Dropped: %', pol.policyname;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Error dropping %: %', pol.policyname, SQLERRM;
        END;
    END LOOP;
END $$;

-- Step 3: Explicitly drop known policy names
DO $$
BEGIN
    EXECUTE 'DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages';
    EXECUTE 'DROP POLICY IF EXISTS "Users can send messages to their conversations" ON messages';
    EXECUTE 'DROP POLICY IF EXISTS "Users can edit their own messages" ON messages';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete their own messages" ON messages';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update their own messages" ON messages';
    RAISE NOTICE 'Explicit policy drops complete';
END $$;

-- Step 4: Re-enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Step 5: Create SELECT policy
CREATE POLICY "Users can view messages in their conversations"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id
        AND cp.user_id = auth.uid()
    )
    AND deleted_at IS NULL
  );

-- Step 6: Create INSERT policy
CREATE POLICY "Users can send messages to their conversations"
  ON messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id
        AND cp.user_id = auth.uid()
    )
    AND sender_id = auth.uid()
  );

-- Step 7: Create UPDATE policy - SIMPLEST POSSIBLE
-- No restrictions on what fields can be updated
-- Just check that the user owns the message
CREATE POLICY "Users can update their own messages"
  ON messages FOR UPDATE
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());

-- Step 8: Ensure permissions
GRANT SELECT, INSERT, UPDATE ON messages TO authenticated;

-- Step 9: Verify
DO $$
DECLARE
    update_policy_exists BOOLEAN;
    update_policy_count INTEGER;
BEGIN
    -- Check if UPDATE policy exists
    SELECT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'messages' 
        AND policyname = 'Users can update their own messages'
        AND cmd = 'UPDATE'
    ) INTO update_policy_exists;
    
    -- Count UPDATE policies
    SELECT COUNT(*) INTO update_policy_count
    FROM pg_policies 
    WHERE tablename = 'messages' 
    AND cmd = 'UPDATE';
    
    RAISE NOTICE '=== VERIFICATION ===';
    RAISE NOTICE 'UPDATE policy exists: %', update_policy_exists;
    RAISE NOTICE 'Total UPDATE policies: %', update_policy_count;
    
    IF update_policy_exists AND update_policy_count = 1 THEN
        RAISE NOTICE 'SUCCESS! UPDATE policy is correct.';
    ELSE
        RAISE WARNING 'PROBLEM: UPDATE policy count is %, expected 1', update_policy_count;
    END IF;
END $$;

-- Step 10: Show final state
SELECT 
    '=== FINAL POLICIES ===' as status;
    
SELECT 
    policyname,
    cmd,
    permissive,
    roles,
    qual as using_clause,
    with_check as with_check_clause
FROM pg_policies
WHERE tablename = 'messages'
ORDER BY cmd, policyname;

