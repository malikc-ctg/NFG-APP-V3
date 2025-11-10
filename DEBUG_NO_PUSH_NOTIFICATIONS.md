# Debug: No Push Notifications After Site Assignment

## The Problem

- ✅ Console shows "Site assignment notification created"
- ✅ Site assignments are working
- ❌ No push notification on phone
- ❌ No logs in Supabase Edge Functions

## Step-by-Step Diagnosis

### Step 1: Check if Notifications Are Actually in Database

**Run this SQL in Supabase SQL Editor:**

```sql
SELECT 
  id,
  user_id,
  type,
  title,
  message,
  created_at
FROM notifications
WHERE user_id = 'b6c70905-828b-45f8-8cd8-b5c1d281a21b'
ORDER BY created_at DESC
LIMIT 5;
```

**Expected:** You should see recent notifications with `type = 'site_assigned'`

**If no notifications:**
- The notification creation is failing silently
- Check browser console for errors when creating notifications

### Step 2: Check if Trigger Exists and Is Enabled

**Run this SQL:**

```sql
SELECT 
  tgname AS trigger_name,
  CASE 
    WHEN tgenabled = 'O' THEN '✅ ENABLED'
    WHEN tgenabled = 'D' THEN '❌ DISABLED'
    ELSE '⚠️ UNKNOWN'
  END AS status
FROM pg_trigger
WHERE tgname = 'trigger_send_notification_email';
```

**Expected:** Should show `trigger_send_notification_email` with status `✅ ENABLED`

**If trigger doesn't exist or is disabled:**
- Run `FIX_PUSH_TRIGGER_COMPLETE.sql` to create/enable it

### Step 3: Check if pg_net Extension Is Enabled

**Run this SQL:**

```sql
SELECT extname, extversion
FROM pg_extension
WHERE extname = 'pg_net';
```

**Expected:** Should show `pg_net` with a version number

**If pg_net doesn't exist:**
- Run: `CREATE EXTENSION IF NOT EXISTS pg_net;`

### Step 4: Test Trigger Manually

**Run this SQL to create a test notification and watch for trigger logs:**

```sql
-- Create test notification (trigger should fire automatically)
INSERT INTO notifications (user_id, type, title, message, link, metadata)
VALUES (
  'b6c70905-828b-45f8-8cd8-b5c1d281a21b',
  'system',
  'Test Push Notification',
  'Testing if trigger fires and sends push',
  '/dashboard.html',
  '{"test": true}'::jsonb
);
```

**After running this:**
1. **Check SQL Editor Messages tab** - You should see:
   - `🔔 TRIGGER FIRED for notification: ...`
   - `📤 Calling push notification function...`
   - `✅ Push function called. Request ID: ...`

2. **Check Edge Function Logs:**
   - Go to **Supabase Dashboard** → **Edge Functions** → **send-push-notification** → **Logs**
   - You should see logs from the function being called

3. **Check your phone** - You should receive a push notification

### Step 5: Check Push Subscriptions

**Run this SQL:**

```sql
SELECT 
  id,
  user_id,
  LEFT(endpoint, 50) as endpoint_preview,
  created_at
FROM push_subscriptions
WHERE user_id = 'b6c70905-828b-45f8-8cd8-b5c1d281a21b';
```

**Expected:** Should show 1 or more subscriptions

**If no subscriptions:**
- Enable push notifications in the app (Settings → Push Notifications → Enable Push)
- Grant permission when prompted
- Wait 2-3 seconds for subscription to save

### Step 6: Check Edge Function Logs

1. Go to **Supabase Dashboard** → **Edge Functions** → **send-push-notification** → **Logs**
2. Look for recent log entries
3. Check for:
   - Function being called
   - Any error messages
   - Subscription lookups
   - Push delivery attempts

## Common Issues and Fixes

### Issue 1: Trigger Not Firing

**Symptoms:**
- No trigger messages in SQL Editor
- No Edge Function logs
- Notifications exist in database but no push

**Fix:**
1. Run `FIX_PUSH_TRIGGER_COMPLETE.sql` to recreate the trigger
2. Verify trigger is enabled (Step 2)
3. Test manually (Step 4)

### Issue 2: Trigger Firing But No Edge Function Logs

**Symptoms:**
- Trigger messages appear in SQL Editor
- But no Edge Function logs

**Possible Causes:**
1. **pg_net not enabled** - Run `CREATE EXTENSION IF NOT EXISTS pg_net;`
2. **Wrong service role key** - Trigger might be using wrong key
3. **Edge function URL wrong** - Check URL in trigger function

**Fix:**
1. Enable pg_net extension
2. Run `FIX_PUSH_TRIGGER_COMPLETE.sql` (uses correct SERVICE_ROLE key)
3. Verify Edge Function URL is correct

### Issue 3: Edge Function Called But No Push

**Symptoms:**
- Edge Function logs show function was called
- But no push notification received

**Possible Causes:**
1. **No subscription** - User doesn't have a push subscription
2. **Expired subscription** - Subscription expired (410 error)
3. **Service worker not receiving** - Service worker not active

**Fix:**
1. Check subscriptions exist (Step 5)
2. Re-enable push notifications in app
3. Verify service worker is active
4. Check browser console for service worker logs

### Issue 4: Notifications Not Being Created

**Symptoms:**
- Console says "notification created" but nothing in database
- No notifications in database query

**Fix:**
1. Check browser console for database errors
2. Verify user has permission to insert into notifications table
3. Check RLS policies on notifications table

## Quick Fix: Run All Diagnostics

**Run `DIAGNOSE_PUSH_NOT_WORKING.sql` to check everything at once:**

1. Opens Supabase SQL Editor
2. Copy and paste `DIAGNOSE_PUSH_NOT_WORKING.sql`
3. Run it
4. Check the results for each check

## Quick Test: Manual Push

**If everything looks good but still no push:**

1. Run `TEST_NOTIFICATION_AND_PUSH.sql` to create a test notification
2. Watch SQL Editor Messages tab for trigger logs
3. Check Edge Function logs immediately after
4. Check your phone for the notification

## Next Steps

1. ✅ **Run diagnostics** - `DIAGNOSE_PUSH_NOT_WORKING.sql`
2. ✅ **Fix trigger** - Run `FIX_PUSH_TRIGGER_COMPLETE.sql` if needed
3. ✅ **Test manually** - Run `TEST_NOTIFICATION_AND_PUSH.sql`
4. ✅ **Check logs** - Edge Function logs and SQL Editor messages
5. ✅ **Verify subscription** - Make sure push subscription exists

Let me know what you find! 🚀

