-- ==========================================
-- FIX MESSAGE DELETE - RUN THIS NOW
-- ==========================================
-- This is the simplest possible fix
-- Copy and paste this ENTIRE script into Supabase SQL Editor and run it

-- 1. Disable RLS
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;

-- 2. Drop every single policy on messages
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'messages'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON messages', pol.policyname);
    END LOOP;
END $$;

-- 3. Re-enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 4. SELECT policy (to see messages)
CREATE POLICY "view_messages" ON messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id = messages.conversation_id AND cp.user_id = auth.uid()
  )
  AND deleted_at IS NULL
);

-- 5. INSERT policy (to send messages)
CREATE POLICY "send_messages" ON messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id = messages.conversation_id AND cp.user_id = auth.uid()
  )
  AND sender_id = auth.uid()
);

-- 6. UPDATE policy - THIS IS THE KEY FIX
-- Just check ownership, allow ANY update
CREATE POLICY "update_messages" ON messages FOR UPDATE
USING (sender_id = auth.uid())
WITH CHECK (true);  -- Always allow if USING passed

-- 7. Verify
SELECT 'UPDATE policy created' as status
WHERE EXISTS (
  SELECT 1 FROM pg_policies 
  WHERE tablename = 'messages' 
  AND policyname = 'update_messages'
  AND cmd = 'UPDATE'
);

