-- Check push notification subscription status
-- Run this in Supabase SQL Editor

-- 1. Check if subscription exists for the user
SELECT 
  id, 
  user_id, 
  endpoint, 
  LEFT(p256dh, 20) as p256dh_preview,
  LEFT(auth, 20) as auth_preview,
  created_at
FROM push_subscriptions
WHERE user_id = 'b6c70905-828b-45f8-8cd8-b5c1d281a21b';

-- 2. Count total subscriptions
SELECT COUNT(*) as total_subscriptions FROM push_subscriptions;

-- 3. Check all subscriptions (for debugging)
SELECT 
  id,
  user_id,
  LEFT(endpoint, 50) as endpoint_preview,
  created_at
FROM push_subscriptions
ORDER BY created_at DESC
LIMIT 10;

