# Fix Expired Push Subscription (410 Error)

## The Problem

You're seeing this error:
```
Push delivery failed: WebPushError: Received unexpected response code
statusCode: 410
body: "push subscription has unsubscribed or expired."
```

**What this means:**
- Your push subscription in the database has expired or been unsubscribed
- This happens when:
  - Browser cleared the subscription
  - User denied notifications
  - Subscription expired (browsers expire subscriptions after some time)
  - User unsubscribed manually

## The Solution

The function will now automatically delete expired subscriptions. You just need to create a **fresh subscription**.

### Step 1: Deploy Updated Function (Already Done ✅)

The function has been updated to:
- Better handle 410 errors
- Automatically delete expired subscriptions
- Provide better logging
- Return detailed response about what happened

### Step 2: Delete Old Expired Subscription

Run this SQL in Supabase SQL Editor to clean up:

```sql
-- Delete expired subscriptions for your user
DELETE FROM push_subscriptions 
WHERE user_id = 'b6c70905-828b-45f8-8cd8-b5c1d281a21b';
```

**Or** wait for the function to automatically delete it on the next test.

### Step 3: Create Fresh Subscription

1. **Open your app** in the browser: `https://your-app.vercel.app` (or your domain)
2. **Go to Settings** → **Push Notifications**
3. **Check the status:**
   - If it says "Push Notifications: Disabled" → Click **"Enable Push"**
   - If it says "Push Notifications: Enabled" → Click **"Disable Push"** first, then **"Enable Push"** again
4. **Grant permission** when the browser prompts you
5. **Wait 2-3 seconds** for the subscription to save to the database

### Step 4: Verify Subscription Was Created

Run this SQL in Supabase SQL Editor:

```sql
SELECT 
  id, 
  user_id, 
  LEFT(endpoint, 50) as endpoint_preview,
  created_at
FROM push_subscriptions
WHERE user_id = 'b6c70905-828b-45f8-8cd8-b5c1d281a21b';
```

You should see **1 new row** with a recent `created_at` timestamp.

### Step 5: Test Push Notification

Test with the curl command:

```bash
curl -X POST 'https://zqcbldgheimqrnqmbbed.supabase.co/functions/v1/send-push-notification' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxY2JsZGdoZWltcXJucW1iYmVkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDcwMzk2MiwiZXhwIjoyMDc2Mjc5OTYyfQ.qRTk5aTno8CYASO6Eu9VU9GTh6ZyV1FYgmn2r7Uv3E0' \
  -H 'Content-Type: application/json' \
  --data '{"user_id":"b6c70905-828b-45f8-8cd8-b5c1d281a21b","title":"Test Push","body":"Did this work?","url":"/jobs.html"}'
```

**Expected Response:**
```json
{
  "success": true,
  "sent": 1,
  "removed": 0
}
```

**If you see `"removed": 1`**, it means the old expired subscription was automatically deleted, and you need to create a fresh one (go back to Step 3).

### Step 6: Check If You Received the Notification

- **If you received it** → 🎉 **Push notifications are working!**
- **If you didn't receive it** → Check:
  1. Browser notifications are allowed (check browser settings)
  2. Service worker is running (check Developer Tools → Application → Service Workers)
  3. Device is online
  4. Check function logs for any errors

## Why This Happens

Push subscriptions can expire for several reasons:
1. **Browser clears data** (cache, cookies, etc.)
2. **User denies notifications** in browser settings
3. **Subscription expires** (browsers expire subscriptions after inactivity)
4. **User unsubscribes** manually
5. **Browser update** clears push subscriptions

## Prevention

The function now automatically:
- Detects expired subscriptions (410 errors)
- Deletes them from the database
- Logs what happened for debugging

Users can always re-enable push notifications in Settings if their subscription expires.

## Next Steps

1. ✅ Function is deployed with improved error handling
2. 🔄 Delete old subscription (or wait for auto-deletion)
3. 🔄 Create fresh subscription in the app
4. 🔄 Test again
5. ✅ Verify you receive the notification

Let me know if you need help with any step! 🚀

