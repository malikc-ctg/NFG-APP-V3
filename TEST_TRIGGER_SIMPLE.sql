-- ==========================================
-- Simple Trigger Test (No link column needed)
-- ==========================================

-- Step 1: Get a user ID (copy the ID from the result)
SELECT id, email 
FROM auth.users 
LIMIT 1;

-- Step 2: Create test notification
-- IMPORTANT: UUIDs must have hyphens (-), not underscores (_)
-- Replace YOUR_USER_ID_HERE with the ID from Step 1
-- Format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (with hyphens!)

INSERT INTO notifications (user_id, type, title, message)
VALUES (
  'YOUR_USER_ID_HERE',  -- Must be proper UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  'system',
  'Test Notification',
  'Testing trigger'
);

-- Step 3: After running above, check:
-- 1. Edge Function logs → send-notification-email → Logs
-- 2. Resend Dashboard → Logs
-- 3. Your email inbox

