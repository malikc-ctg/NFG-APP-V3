# 🚨 URGENT: Fix Message Push Notifications

## Step-by-Step Debug (Do This Now)

### ✅ Step 1: Check Webhook Logs (5 seconds)

1. Go to **Supabase Dashboard** > **Database** > **Webhooks**
2. Click **`message-push-notification`** webhook
3. Click **"Logs"** tab
4. **Send a message** in the app right now
5. **Did you see a new log entry?**
   - ✅ **YES** → Webhook is firing, go to Step 2
   - ❌ **NO** → Webhook isn't firing, **DELETE and RECREATE the webhook** (see below)

---

### ✅ Step 2: Check Edge Function Logs (5 seconds)

1. Go to **Edge Functions** > **send-message-push-notification** > **Logs**
2. **Send a message** in the app right now
3. **Do you see `🔔 [Push Notification] Function called`?**
   - ✅ **YES** → Edge Function is being called, go to Step 3
   - ❌ **NO** → Webhook isn't calling Edge Function, check webhook URL

---

### ✅ Step 3: Check Push Subscriptions (30 seconds)

Run this SQL in Supabase SQL Editor:

```sql
-- Check if users have push subscriptions
SELECT 
  u.email,
  COUNT(ps.id) as subscription_count
FROM user_profiles u
LEFT JOIN push_subscriptions ps ON ps.user_id = u.id
GROUP BY u.id, u.email;
```

**If subscription_count is 0 for all users:**
- Users need to enable push notifications in Settings
- Users need to grant browser notification permission

**To enable push notifications:**
1. In the app, go to **Settings** page
2. Find **"Push Notifications"** section
3. Toggle **"Enable Push Notifications"** ON
4. Grant browser permission when prompted
5. Check the SQL query again - should show subscription_count = 1

---

### ✅ Step 4: Check Edge Function Secrets (30 seconds)

1. Go to **Edge Functions** > **send-message-push-notification** > **Settings** (or **Secrets**)
2. **Verify these secrets exist:**
   - ✅ `VAPID_PUBLIC_KEY`
   - ✅ `VAPID_PRIVATE_KEY`
   - ✅ `SUPABASE_URL`
   - ✅ `SUPABASE_SERVICE_ROLE_KEY`
3. **If any are missing, add them:**
   - Click **"Add Secret"**
   - Enter name and value
   - Click **"Save"**

**Get your keys:**
- **Service Role Key**: Dashboard > Settings > API > `service_role` key
- **VAPID Public Key**: `BNRzgf5fJSbUfBsaFvCPUWPqvnd1qqKPu8C3tUQp_RoILsvczmd1oZNA-bpHq5q0VnLLjWzcm2U1vYxEbZ_kH4I`
- **VAPID Private Key**: (check your notes or generate new pair)
- **Supabase URL**: `https://zqcbldgheimqrnqmbbed.supabase.co`

---

### ✅ Step 5: RECREATE WEBHOOK (If Still Not Working)

**Delete existing webhook:**
1. Go to **Database** > **Webhooks**
2. Click **`message-push-notification`**
3. Click **"Delete"** or **"Remove"**

**Create new webhook:**
1. Click **"Create a new webhook"**
2. Configure exactly:
   - **Name**: `message-push-notification`
   - **Table**: `messages` (select from dropdown)
   - **Events**: Check **ONLY** `INSERT` ✅
   - **Type**: `HTTP Request`
   - **Method**: `POST`
   - **URL**: `https://zqcbldgheimqrnqmbbed.supabase.co/functions/v1/send-message-push-notification`
   - **HTTP Headers**: Click **"Add Header"**
     - **Name**: `Authorization`
     - **Value**: `Bearer YOUR_SERVICE_ROLE_KEY` (replace with actual key)
     - Click **"Add Header"** again
     - **Name**: `Content-Type`
     - **Value**: `application/json`
   - **Enabled**: ✅ Yes
3. Click **"Save"**

---

### ✅ Step 6: Test Manually

1. **Open app in TWO different browser windows** (logged in as different users)
2. **Enable push notifications** for both users (Settings page)
3. **Grant browser notification permission** for both windows
4. **Send a message** from User A to User B
5. **Check:**
   - ✅ Webhook logs show invocation
   - ✅ Edge Function logs show `🔔 [Push Notification] Function called`
   - ✅ Push notification appears for User B

---

## Quick Checklist

- [ ] Webhook exists in Database > Webhooks
- [ ] Webhook is **enabled** (green toggle)
- [ ] Webhook logs show invocations when sending messages
- [ ] Edge Function logs show function calls
- [ ] `VAPID_PUBLIC_KEY` set in Edge Function secrets
- [ ] `VAPID_PRIVATE_KEY` set in Edge Function secrets
- [ ] `SUPABASE_URL` set in Edge Function secrets
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set in Edge Function secrets
- [ ] Users have push subscriptions (check SQL query)
- [ ] Users have granted browser notification permission
- [ ] Browser supports push notifications (Chrome/Edge, not Safari)

---

## Most Common Issues

### ❌ **Issue #1: No Webhook Logs**
**Fix:** Webhook isn't firing - delete and recreate it

### ❌ **Issue #2: Webhook Logs Exist But No Edge Function Logs**
**Fix:** 
- Check webhook URL is correct
- Check service role key in webhook headers
- Redeploy Edge Function: `supabase functions deploy send-message-push-notification`

### ❌ **Issue #3: Edge Function Logs Show "No push subscriptions found"**
**Fix:**
- Users need to enable push notifications in Settings
- Check `push_subscriptions` table has entries

### ❌ **Issue #4: Edge Function Logs Show "VAPID keys are not configured"**
**Fix:**
- Set `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` in Edge Function secrets
- Redeploy Edge Function

---

## Test Right Now

1. **Send a message** in the app
2. **Check webhook logs** - do you see a new entry?
3. **Check Edge Function logs** - do you see `🔔 [Push Notification] Function called`?
4. **If YES to both but still no notification:**
   - Check push subscriptions exist (SQL query)
   - Check VAPID keys are set
   - Check browser notification permission

---

## Still Not Working?

**Run `TEST_MESSAGE_PUSH.sql` and share the results.**

The detailed logging I added will show exactly where it's failing:
- `🔔 [Push Notification] Function called` = webhook is working
- `🔔 [Push Notification] Subscriptions found: 0` = users don't have push enabled
- `⚠️ VAPID keys are not configured` = secrets not set
- `❌ [Push Notification] Missing Supabase configuration` = secrets not set

