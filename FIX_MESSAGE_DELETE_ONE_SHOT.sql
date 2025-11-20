-- ==========================================
-- ONE-SHOT FIX: Message Delete RLS
-- ==========================================
-- Run ONLY this script - it does everything in one go
-- This will fix message deletion completely

-- Step 1: Drop ALL UPDATE policies (very aggressive)
DO $$ 
DECLARE
    pol RECORD;
    policy_count INTEGER := 0;
BEGIN
    -- Count policies first
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE tablename = 'messages' 
    AND cmd = 'UPDATE';
    
    RAISE NOTICE 'Found % UPDATE policies on messages table', policy_count;
    
    -- Drop all UPDATE policies
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'messages' 
        AND cmd = 'UPDATE'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON messages', pol.policyname);
        RAISE NOTICE 'Dropped policy: %', pol.policyname;
    END LOOP;
    
    -- Also explicitly drop known policy names (belt and suspenders)
    EXECUTE 'DROP POLICY IF EXISTS "Users can edit their own messages" ON messages';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete their own messages" ON messages';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update their own messages" ON messages';
END $$;

-- Step 2: Ensure RLS is enabled
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Step 3: Create SINGLE unified UPDATE policy
-- This allows users to update ANY field on their own messages
-- No restrictions - can edit content, set deleted_at, etc.
-- IMPORTANT: Using PERMISSIVE so multiple policies can work together if needed
CREATE POLICY "Users can update their own messages"
  ON messages FOR UPDATE
  USING (sender_id = auth.uid())  -- Can only update messages they sent
  WITH CHECK (sender_id = auth.uid());  -- Updated row must still belong to them

-- Step 4: Ensure permissions
GRANT UPDATE ON messages TO authenticated;

-- Step 5: Verify everything worked
DO $$
DECLARE
    policy_exists BOOLEAN;
    policy_count INTEGER;
BEGIN
    -- Check if policy exists
    SELECT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'messages' 
        AND policyname = 'Users can update their own messages'
        AND cmd = 'UPDATE'
    ) INTO policy_exists;
    
    -- Count all UPDATE policies
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE tablename = 'messages' 
    AND cmd = 'UPDATE';
    
    IF policy_exists AND policy_count = 1 THEN
        RAISE NOTICE 'SUCCESS! Policy created correctly. Total UPDATE policies: %', policy_count;
    ELSIF policy_count > 1 THEN
        RAISE WARNING 'WARNING: Multiple UPDATE policies exist (% policies). This may cause conflicts!', policy_count;
    ELSE
        RAISE EXCEPTION 'ERROR: Policy was not created!';
    END IF;
END $$;

-- Step 6: Show final state
SELECT 
    'Final UPDATE policies on messages:' as status;
    
SELECT 
    policyname,
    cmd,
    qual as using_clause,
    with_check
FROM pg_policies
WHERE tablename = 'messages'
  AND cmd = 'UPDATE';

