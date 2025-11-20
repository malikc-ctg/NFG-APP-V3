-- ==========================================
-- DIAGNOSE RLS PROBLEM
-- ==========================================
-- Run this FIRST to see what's actually wrong

-- 1. Check ALL policies on messages table
SELECT '=== ALL POLICIES ON MESSAGES ===' as info;

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

-- 2. Count policies by type
SELECT '=== POLICY COUNTS ===' as info;

SELECT 
    cmd,
    COUNT(*) as count
FROM pg_policies
WHERE tablename = 'messages'
GROUP BY cmd
ORDER BY cmd;

-- 3. Check if RLS is enabled
SELECT '=== RLS STATUS ===' as info;

SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'messages';

-- 4. Check UPDATE policies specifically
SELECT '=== UPDATE POLICIES DETAILS ===' as info;

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual as using_clause,
    with_check as with_check_clause
FROM pg_policies
WHERE tablename = 'messages'
  AND cmd = 'UPDATE';

-- 5. Test if you can see your own messages
SELECT '=== CAN YOU SEE YOUR MESSAGES? ===' as info;

SELECT 
    id,
    sender_id,
    LEFT(content, 50) as content_preview,
    deleted_at,
    created_at
FROM messages
WHERE sender_id = auth.uid()
ORDER BY created_at DESC
LIMIT 3;

-- 6. Show what auth.uid() returns
SELECT '=== YOUR USER ID ===' as info;

SELECT 
    auth.uid() as current_user_id;

