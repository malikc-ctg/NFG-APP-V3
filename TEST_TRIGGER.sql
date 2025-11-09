-- ==========================================
-- Test if Trigger is Working
-- ==========================================

-- Step 1: Get a real user ID and email
SELECT id, email 
FROM auth.users 
LIMIT 1;

-- Step 2: Create a test notification
-- Replace YOUR_USER_ID with the ID from Step 1
-- Then run this (link is optional):
/*
INSERT INTO notifications (user_id, type, title, message)
VALUES (
  'YOUR_USER_ID_HERE',  -- Replace with actual user ID
  'system',
  'Trigger Test Notification',
  'Testing if database trigger fires'
);
*/

-- Step 3: After inserting, immediately check Edge Function logs
-- Go to: Supabase → Edge Functions → send-notification-email → Logs
-- Do you see a new log entry?

-- Step 4: Check if notification was created
SELECT * FROM notifications 
ORDER BY created_at DESC 
LIMIT 5;

