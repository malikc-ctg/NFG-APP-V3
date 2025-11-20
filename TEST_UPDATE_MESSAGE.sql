-- ==========================================
-- TEST: Can You Update a Message?
-- ==========================================
-- Run this to test if you can actually update a message
-- This will help diagnose the exact issue

-- Step 1: Get a message ID that belongs to you
SELECT 
    '=== YOUR MESSAGES ===' as info;
    
SELECT 
    id,
    sender_id,
    content,
    deleted_at,
    created_at
FROM messages
WHERE sender_id = auth.uid()
ORDER BY created_at DESC
LIMIT 5;

-- Step 2: Try to manually update a message (replace MESSAGE_ID with an actual ID from above)
-- UNCOMMENT AND REPLACE MESSAGE_ID BELOW TO TEST
/*
UPDATE messages
SET deleted_at = NOW()
WHERE id = 'MESSAGE_ID_HERE'
  AND sender_id = auth.uid()
RETURNING id, sender_id, deleted_at;
*/

-- Step 3: Check what auth.uid() returns
SELECT 
    '=== CURRENT USER ID ===' as info;
    
SELECT 
    auth.uid() as current_user_id;

-- Step 4: Check if UPDATE policies are being evaluated
SELECT 
    '=== UPDATE POLICY CHECK ===' as info;
    
SELECT 
    policyname,
    cmd,
    permissive,
    qual as using_clause,
    with_check as with_check_clause,
    CASE 
        WHEN with_check IS NULL THEN 'NO WITH CHECK'
        ELSE 'HAS WITH CHECK'
    END as check_status
FROM pg_policies
WHERE tablename = 'messages'
  AND cmd = 'UPDATE';

