# Verify Push Notifications Are Working

## ✅ Good News: Function Returned "ok"

The edge function executed successfully! This means:
- ✅ VAPID keys are configured
- ✅ Database connection works
- ✅ Function can query subscriptions
- ✅ Function attempted to send push notification

## Next Steps to Verify Full Functionality

### Step 1: Check If You Received the Notification

**Did you see a push notification on your device?**
- If **YES** → 🎉 **Push notifications are working!**
- If **NO** → Continue to Step 2

### Step 2: Verify Subscription Exists

Run this SQL in Supabase SQL Editor to check if you have a subscription:

```sql
SELECT 
  id, 
  user_id, 
  endpoint, 
  LEFT(p256dh, 20) as p256dh_preview,
  LEFT(auth, 20) as auth_preview,
  created_at
FROM push_subscriptions
WHERE user_id = 'b6c70905-828b-45f8-8cd8-b5c1d281a21b';
```

**Expected Result:**
- If you see **1 or more rows** → Subscription exists ✅
- If you see **0 rows** → You need to enable push in the app

### Step 3: If No Subscription Exists

1. Open your app in the browser: `https://your-app.vercel.app` (or your domain)
2. Go to **Settings** → **Push Notifications**
3. Click **"Enable Push"**
4. Grant notification permission when the browser prompts you
5. Wait a few seconds for the subscription to save
6. Test again with the curl command

### Step 4: Check Function Logs

1. Go to **Supabase Dashboard** → **Edge Functions** → **send-push-notification**
2. Click **"Logs"** tab
3. Look for recent log entries when you ran the curl command
4. Check for:
   - `✅ Found X subscriptions for user` (should show 1 or more)
   - Any error messages about push delivery
   - `Push delivery failed` errors

### Step 5: Verify Browser Permissions

1. Open your app in the browser
2. Check browser settings:
   - **Chrome**: `chrome://settings/content/notifications`
   - **Safari**: `Preferences` → `Websites` → `Notifications`
3. Make sure your app's domain is **allowed** to show notifications
4. If it's blocked, change it to **allow**

### Step 6: Verify Service Worker

1. Open your app in the browser
2. Open **Developer Tools** (F12 or Cmd+Option+I)
3. Go to **Application** tab → **Service Workers**
4. Verify:
   - Service worker is **activated** and **running**
   - Status shows **"activated and is running"**
5. Check **Console** for any errors

### Step 7: Test Push Notification Again

After verifying the above, test again:

```bash
curl -X POST 'https://zqcbldgheimqrnqmbbed.supabase.co/functions/v1/send-push-notification' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxY2JsZGdoZWltcXJucW1iYmVkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDcwMzk2MiwiZXhwIjoyMDc2Mjc5OTYyfQ.qRTk5aTno8CYASO6Eu9VU9GTh6ZyV1FYgmn2r7Uv3E0' \
  -H 'Content-Type: application/json' \
  --data '{"user_id":"b6c70905-828b-45f8-8cd8-b5c1d281a21b","title":"Test Push","body":"Did this work?","url":"/jobs.html"}'
```

## Common Issues

### Issue: Function returns "ok" but no notification appears

**Possible Causes:**
1. No subscription in database → Enable push in app settings
2. Browser notifications blocked → Allow notifications in browser settings
3. Service worker not running → Check service worker status
4. Device is offline → Make sure device is online
5. Push delivery failed silently → Check function logs for errors

### Issue: "No subscriptions found"

**Solution:**
- Enable push notifications in the app:
  1. Go to Settings → Push Notifications
  2. Click "Enable Push"
  3. Grant permission
  4. Wait for subscription to save

### Issue: Browser shows "Notifications blocked"

**Solution:**
- Unblock notifications:
  1. Click the lock icon in browser address bar
  2. Change notifications from "Block" to "Allow"
  3. Refresh the page
  4. Try enabling push again

## Next Steps

1. **Check if you received the notification** (most important!)
2. **If not, run the SQL query** to check for subscriptions
3. **If no subscription exists**, enable push in the app
4. **Check function logs** for any errors
5. **Verify browser permissions** are allowed
6. **Test again** after fixing any issues

Let me know what you find! 🚀

