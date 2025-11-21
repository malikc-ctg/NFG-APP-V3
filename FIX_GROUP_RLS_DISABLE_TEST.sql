-- =====================================================
-- TEST: Temporarily disable RLS to verify it's the issue
-- =====================================================
-- Run this to completely disable RLS and test if group creation works
-- If it works, then we know RLS is the problem
-- If it still doesn't work, the problem is elsewhere
-- =====================================================

-- Temporarily disable RLS on conversations table
ALTER TABLE conversations DISABLE ROW LEVEL SECURITY;

-- Temporarily disable RLS on conversation_participants table
ALTER TABLE conversation_participants DISABLE ROW LEVEL SECURITY;

-- Ensure permissions are granted
GRANT SELECT, INSERT, UPDATE, DELETE ON conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON conversation_participants TO authenticated;

-- Now try creating a group in the app
-- If it works, we know RLS was the issue
-- If it still doesn't work, the issue is something else (permissions, auth, etc.)

