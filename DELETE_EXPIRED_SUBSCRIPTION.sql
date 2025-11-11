-- Delete expired push subscription
-- This will clean up the old subscription that returned 410 error
-- After running this, enable push notifications again in the app to create a fresh subscription

DELETE FROM push_subscriptions 
WHERE user_id = 'b6c70905-828b-45f8-8cd8-b5c1d281a21b';

-- Verify it was deleted
SELECT COUNT(*) as remaining_subscriptions 
FROM push_subscriptions 
WHERE user_id = 'b6c70905-828b-45f8-8cd8-b5c1d281a21b';
-- Should return 0

