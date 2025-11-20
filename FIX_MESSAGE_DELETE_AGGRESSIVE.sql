-- ==========================================
-- AGGRESSIVE FIX: Message Delete RLS
-- ==========================================
-- This completely resets RLS and creates a clean policy
-- Use this if other fixes haven't worked

-- Step 1: Temporarily disable RLS (most aggressive approach)
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL policies on messages table (not just UPDATE)
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    RAISE NOTICE 'Dropping all policies on messages table...';
    
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'messages'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON messages', pol.policyname);
        RAISE NOTICE 'Dropped policy: %', pol.policyname;
    END LOOP;
    
    RAISE NOTICE 'All policies dropped.';
END $$;

-- Step 3: Re-enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Step 4: Recreate SELECT policy (so users can see messages)
-- Drop first to avoid conflicts
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;

-- Note: We check deleted_at IS NULL here, but UPDATE policy doesn't restrict deleted_at
-- This allows users to see non-deleted messages, but they can still update (set deleted_at)
CREATE POLICY "Users can view messages in their conversations"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id
        AND cp.user_id = auth.uid()
    )
    AND deleted_at IS NULL  -- Don't show deleted messages in SELECT
  );

-- Step 5: Recreate INSERT policy (so users can send messages)
DROP POLICY IF EXISTS "Users can send messages to their conversations" ON messages;

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

-- Step 6: Create SINGLE unified UPDATE policy
-- This allows users to update their own messages (edit OR delete)
DROP POLICY IF EXISTS "Users can update their own messages" ON messages;

CREATE POLICY "Users can update their own messages"
  ON messages FOR UPDATE
  USING (sender_id = auth.uid())  -- Can only update messages they sent
  WITH CHECK (sender_id = auth.uid());  -- Updated row must still belong to them

-- Step 7: Ensure permissions
GRANT SELECT, INSERT, UPDATE ON messages TO authenticated;

-- Step 8: Verify everything worked
DO $$
DECLARE
    update_policy_count INTEGER;
    total_policy_count INTEGER;
BEGIN
    -- Count UPDATE policies
    SELECT COUNT(*) INTO update_policy_count
    FROM pg_policies 
    WHERE tablename = 'messages' 
    AND cmd = 'UPDATE';
    
    -- Count total policies
    SELECT COUNT(*) INTO total_policy_count
    FROM pg_policies 
    WHERE tablename = 'messages';
    
    -- Check if UPDATE policy exists
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'messages' 
        AND policyname = 'Users can update their own messages'
        AND cmd = 'UPDATE'
    ) AND update_policy_count = 1 THEN
        RAISE NOTICE 'SUCCESS! Policy created correctly.';
        RAISE NOTICE 'Total policies on messages: %, UPDATE policies: %', total_policy_count, update_policy_count;
    ELSE
        RAISE WARNING 'WARNING: Expected 1 UPDATE policy, but found %. Total policies: %', update_policy_count, total_policy_count;
    END IF;
END $$;

-- Step 9: Show final state
SELECT 
    '=== FINAL STATE: All policies on messages table ===' as info;
    
SELECT 
    policyname,
    cmd,
    qual as using_clause,
    with_check
FROM pg_policies
WHERE tablename = 'messages'
ORDER BY cmd, policyname;

