-- Check if push subscriptions exist for the user
SELECT 
  id, 
  user_id, 
  endpoint, 
  LEFT(p256dh, 20) as p256dh_preview,
  LEFT(auth, 20) as auth_preview,
  created_at
FROM push_subscriptions
WHERE user_id = 'b6c70905-828b-45f8-8cd8-b5c1d281a21b';

-- Check all subscriptions (for debugging)
SELECT COUNT(*) as total_subscriptions FROM push_subscriptions;

-- Check if table exists and has correct structure
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'push_subscriptions'
ORDER BY ordinal_position;

