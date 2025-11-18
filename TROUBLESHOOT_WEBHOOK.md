# 🔍 Troubleshoot Message Push Notifications

Let's debug step by step. I need to know what you're seeing:

## Step 1: Check Edge Function Logs

1. Go to: Edge Function → `send-message-push-notification` → **Logs** tab
2. **Send a test message** in your app
3. **Refresh the logs page**
4. **What do you see?**
   - ❓ No new logs at all?
   - ❓ New logs with errors?
   - ❓ New logs that say "No recipients"?
   - ❓ New logs that say "No push subscriptions"?

## Step 2: Check Webhook Logs

1. Go to: Database → Webhooks
2. Click on your `message-push-notification` webhook (the one for `messages` table)
3. Look for "Recent Events" or "Logs"
4. **What do you see?**
   - ❓ No requests at all?
   - ❓ Failed requests (4xx/5xx)?
   - ❓ Successful requests (200)?

## Step 3: Verify Webhook Configuration

Click on your webhook and check:

**URL:**
```
https://zqcbldgheimqrnqmbbed.supabase.co/functions/v1/send-message-push-notification
```
✅ Correct?

**HTTP Headers:**
- `Authorization: Bearer eyJ...` (your service role key)
- `Content-Type: application/json`
✅ Both present?

**Table:** `messages` ✅
**Events:** `INSERT` ✅
**Enabled:** Toggle is ON ✅

## Step 4: Check Push Subscriptions

Run this SQL in Supabase SQL Editor:

```sql
-- Check if users have push subscriptions
SELECT 
  ps.user_id,
  up.full_name,
  up.email,
  ps.created_at,
  ps.endpoint
FROM push_subscriptions ps
LEFT JOIN user_profiles up ON ps.user_id = up.id
ORDER BY ps.created_at DESC
LIMIT 10;
```

**What's the result?**
- ❓ Empty (no rows)?
- ❓ Has rows with user data?

## Step 5: Check VAPID Keys

1. Go to: Edge Function → `send-message-push-notification` → **Settings** → **Secrets**
2. **Do you see:**
   - ✅ `VAPID_PUBLIC_KEY` set?
   - ✅ `VAPID_PRIVATE_KEY` set?
   - ✅ `SUPABASE_URL` set? (usually auto-set)
   - ✅ `SUPABASE_SERVICE_ROLE_KEY` set? (usually auto-set)

## Step 6: Test Message Flow

**User A** sends message to **User B**:

1. **Is User B in the conversation?** (Check `conversation_participants` table)
2. **Does User B have push enabled?** (Check Settings → Notifications)
3. **Does User B have a push subscription?** (Step 4 above)

## Common Issues:

### ❌ Issue: "No logs at all after sending message"
**Possible causes:**
- Webhook not enabled
- Webhook pointing to wrong URL
- Wrong table name
- Webhook not firing

**Fix:**
- Verify webhook is enabled and table is `messages`
- Check webhook logs to see if it's being triggered

### ❌ Issue: "Edge Function logs show 'No recipients to notify'"
**Cause:** Conversation participants not found or sender excluded incorrectly

**Fix:** Check `conversation_participants` table has correct entries

### ❌ Issue: "Edge Function logs show 'No push subscriptions found'"
**Cause:** User hasn't enabled push notifications

**Fix:** 
- User needs to go to Settings → Notifications
- Enable "Push Notifications"
- Grant browser permission
- Subscription will be saved to `push_subscriptions` table

### ❌ Issue: "Webhook logs show 401/403 errors"
**Cause:** Authorization header missing or wrong service role key

**Fix:** Verify Authorization header has correct service role key

### ❌ Issue: "Webhook logs show 400 errors"
**Cause:** Edge function expecting different payload format

**Fix:** Check Edge Function code matches webhook payload format

---

**Please share what you see in each step above!** 📋

