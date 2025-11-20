-- ==========================================
-- VERIFY: Test Message Delete Policy
-- ==========================================
-- Run this to verify the RLS policy works correctly
-- This will show you what's blocking the update

-- Step 1: Check what UPDATE policies currently exist
SELECT 
    '=== CURRENT UPDATE POLICIES ===' as info;
    
SELECT 
    policyname,
    cmd,
    permissive,
    roles,
    qual as using_clause,
    with_check
FROM pg_policies
WHERE tablename = 'messages'
  AND cmd = 'UPDATE'
ORDER BY policyname;

-- Step 2: Check if RLS is enabled
SELECT 
    '=== RLS STATUS ===' as info;
    
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'messages';

-- Step 3: Show a sample message to test with
SELECT 
    '=== SAMPLE MESSAGES ===' as info;
    
SELECT 
    id,
    sender_id,
    content,
    deleted_at,
    created_at
FROM messages
ORDER BY created_at DESC
LIMIT 5;

-- Step 4: Test if current user can see their own messages
SELECT 
    '=== TEST: Can you see your messages? ===' as info;
    
SELECT 
    id,
    sender_id,
    content,
    deleted_at
FROM messages
WHERE sender_id = auth.uid()
ORDER BY created_at DESC
LIMIT 3;

-- Step 5: Show the exact policy that should allow the update
SELECT 
    '=== POLICY DETAILS ===' as info;
    
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

