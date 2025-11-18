# 🔍 Debug Push Notifications - Step by Step

## Problem
Webhook exists, messages send, but **no push notifications received**. Edge Function logs show **no invocations** (only boot/shutdown events).

## Step-by-Step Debugging

### ✅ Step 1: Check Webhook Logs

1. Go to **Supabase Dashboard** > **Database** > **Webhooks**
2. Click on **`message-push-notification`** webhook
3. Click **"Logs"** tab
4. **Send a message** in the app
5. **Check if webhook fired:**
   - ✅ If you see logs → Webhook is firing, go to Step 2
   - ❌ If no logs → Webhook isn't firing, check webhook configuration

### ✅ Step 2: Check Edge Function Logs

1. Go to **Edge Functions** > **send-message-push-notification** > **Logs**
2. **Send a message** in the app
3. **Check for new logs:**
   - ✅ If you see `🔔 [Push Notification] Function called` → Edge Function is being invoked
   - ❌ If no new logs → Webhook isn't calling the Edge Function

**If no Edge Function logs:**
- Webhook URL might be wrong
- Webhook headers might be wrong
- Service role key might be incorrect

### ✅ Step 3: Verify Webhook Configuration

1. Go to **Database** > **Webhooks** > **message-push-notification**
2. Click **"Edit"**
3. **Verify these settings:**

   - **Table**: `messages` ✅
   - **Events**: `INSERT` ✅
   - **Type**: `HTTP Request` ✅
   - **Method**: `POST` ✅
   - **URL**: `https://zqcbldgheimqrnqmbbed.supabase.co/functions/v1/send-message-push-notification`
   - **HTTP Headers**:
     ```
     Authorization: Bearer YOUR_SERVICE_ROLE_KEY
     Content-Type: application/json
     ```
   - **Enabled**: ✅ Yes

4. **Save** if you made changes

### ✅ Step 4: Check Push Subscriptions

Run this SQL in Supabase SQL Editor:

```sql
-- Check if push_subscriptions table exists
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'push_subscriptions'
) AS table_exists;

-- Check if users have push subscriptions
SELECT 
  u.id,
  u.email,
  COUNT(ps.id) as subscription_count
FROM user_profiles u
LEFT JOIN push_subscriptions ps ON ps.user_id = u.id
GROUP BY u.id, u.email
ORDER BY subscription_count DESC;
```

**If no subscriptions found:**
- Users need to enable push notifications in Settings
- Users need to grant browser notification permission

### ✅ Step 5: Check VAPID Keys

1. Go to **Edge Functions** > **send-message-push-notification** > **Secrets**
2. **Verify these secrets are set:**
   - ✅ `VAPID_PUBLIC_KEY` = `BNRzgf5fJSbUfBsaFvCPUWPqvnd1qqKPu8C3tUQp_RoILsvczmd1oZNA-bpHq5q0VnLLjWzcm2U1vYxEbZ_kH4I`
   - ✅ `VAPID_PRIVATE_KEY` = (your private key)
   - ✅ `SUPABASE_URL` = `https://zqcbldgheimqrnqmbbed.supabase.co`
   - ✅ `SUPABASE_SERVICE_ROLE_KEY` = (your service role key)

3. **If missing, add them:**
   - Click **"Add Secret"**
   - Enter name and value
   - Click **"Save"**

### ✅ Step 6: Test Edge Function Manually

Test the Edge Function directly to see if it works:

1. Get a recent message ID from your database:
   ```sql
   SELECT id, conversation_id, sender_id, content 
   FROM messages 
   ORDER BY created_at DESC 
   LIMIT 1;
   ```

2. Use curl or Postman to test:
   ```bash
   curl -X POST https://zqcbldgheimqrnqmbbed.supabase.co/functions/v1/send-message-push-notification \
     -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "record": {
         "id": "MESSAGE_ID_HERE",
         "conversation_id": "CONVERSATION_ID_HERE",
         "sender_id": "SENDER_ID_HERE",
         "content": "Test message"
       }
     }'
   ```

3. **Check Edge Function logs** - you should see detailed logs now

### ✅ Step 7: Enable Push Notifications for Users

1. **In the app:**
   - Go to **Settings** page
   - Find **"Push Notifications"** section
   - Toggle **"Enable Push Notifications"** ON
   - Grant browser permission when prompted

2. **Verify subscription saved:**
   ```sql
   SELECT * FROM push_subscriptions WHERE user_id = 'YOUR_USER_ID';
   ```

### ✅ Step 8: Check Browser Console

1. **Open browser console** (F12)
2. **Send a message** in the app
3. **Look for errors:**
   - `Push notification` logs
   - `Service Worker` logs
   - Any JavaScript errors

## Common Issues & Fixes

### ❌ Issue 1: Webhook Not Firing

**Symptoms:**
- No webhook logs
- No Edge Function invocations

**Fix:**
- Check webhook is enabled
- Check webhook table is `messages`
- Check webhook event is `INSERT`
- Check webhook URL is correct
- **Delete and recreate webhook**

### ❌ Issue 2: Edge Function Not Called

**Symptoms:**
- Webhook logs show delivery, but no Edge Function logs

**Fix:**
- Check webhook URL points to correct function
- Check webhook headers include `Authorization: Bearer SERVICE_ROLE_KEY`
- Verify service role key is correct
- Check Edge Function is deployed

### ❌ Issue 3: No Push Subscriptions

**Symptoms:**
- Edge Function logs show: "No push subscriptions found"

**Fix:**
- Users must enable push notifications in Settings
- Users must grant browser notification permission
- Check `push_subscriptions` table has entries

### ❌ Issue 4: VAPID Keys Missing

**Symptoms:**
- Edge Function logs show: "VAPID keys are not configured"

**Fix:**
- Set `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` in Edge Function secrets
- Redeploy Edge Function if needed

### ❌ Issue 5: Browser Notification Permission Denied

**Symptoms:**
- Users can't enable push notifications

**Fix:**
- Check browser notification permissions
- Reset notification permissions for your site
- Use HTTPS (required for push notifications)

## Quick Checklist

- [ ] Webhook exists in Database > Webhooks
- [ ] Webhook is enabled
- [ ] Webhook logs show invocations
- [ ] Edge Function logs show function calls
- [ ] VAPID keys set in Edge Function secrets
- [ ] SUPABASE_URL set in Edge Function secrets
- [ ] SUPABASE_SERVICE_ROLE_KEY set in Edge Function secrets
- [ ] Users have push notifications enabled (Settings page)
- [ ] Users have granted browser notification permission
- [ ] `push_subscriptions` table has entries
- [ ] Browser console shows no errors

## Next Steps

1. **Check webhook logs first** - this tells you if the webhook is firing
2. **Check Edge Function logs** - this tells you if the function is being called
3. **Check push subscriptions** - this tells you if users have subscriptions
4. **Test manually** - use curl to test Edge Function directly

The enhanced logging I just added will help you see exactly where the issue is!

