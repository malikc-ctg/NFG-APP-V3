# 🔔 Fix Message Push Notifications

## Problem
Push notifications for messages are not sending.

## Quick Diagnostic

Run this SQL in Supabase SQL Editor to check setup:

```sql
-- Check if push_subscriptions table exists
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'push_subscriptions'
) AS table_exists;

-- Check if users have push subscriptions
SELECT 
  u.email,
  COUNT(ps.id) as subscription_count
FROM user_profiles u
LEFT JOIN push_subscriptions ps ON ps.user_id = u.id
GROUP BY u.id, u.email;

-- Check recent messages
SELECT id, conversation_id, sender_id, created_at 
FROM messages 
ORDER BY created_at DESC 
LIMIT 5;
```

## Step-by-Step Fix

### ✅ Step 1: Deploy Edge Function

```bash
cd "/Users/malikcampbell/NFG APP V3"
supabase functions deploy send-message-push-notification
```

### ✅ Step 2: Set Environment Variables

1. Go to **Supabase Dashboard** > **Edge Functions** > **send-message-push-notification**
2. Click **"Secrets"** or **"Settings"**
3. Add these secrets:
   - `VAPID_PUBLIC_KEY` = `BNRzgf5fJSbUfBsaFvCPUWPqvnd1qqKPu8C3tUQp_RoILsvczmd1oZNA-bpHq5q0VnLLjWzcm2U1vYxEbZ_kH4I`
   - `VAPID_PRIVATE_KEY` = (your private key - check your notes)
   - `SUPABASE_URL` = `https://zqcbldgheimqrnqmbbed.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY` = (your service role key from Dashboard > Settings > API)

### ✅ Step 3: Create Webhook (IMPORTANT!)

1. Go to **Supabase Dashboard** > **Database** > **Webhooks**
2. Click **"Create a new webhook"**
3. Configure:
   - **Name**: `message-push-notification`
   - **Table**: `messages`
   - **Events**: Check **"INSERT"** only
   - **Type**: `HTTP Request`
   - **Method**: `POST`
   - **URL**: `https://zqcbldgheimqrnqmbbed.supabase.co/functions/v1/send-message-push-notification`
   - **HTTP Headers**:
     ```
     Authorization: Bearer YOUR_SERVICE_ROLE_KEY
     Content-Type: application/json
     ```
   - **Enabled**: ✅ Yes
4. Click **"Save"**

### ✅ Step 4: Verify Webhook Created

1. Go back to **Database** > **Webhooks**
2. You should see `message-push-notification` in the list
3. Make sure it shows:
   - ✅ Enabled: Yes
   - ✅ Table: messages
   - ✅ Event: INSERT

### ✅ Step 5: Test

1. **Open the app** in two different browser windows (logged in as different users)
2. **Send a message** from one user to another
3. **Check Edge Function logs**:
   - Go to **Edge Functions** > **send-message-push-notification** > **Logs**
   - You should see logs showing the function was called
4. **Check webhook logs**:
   - Go to **Database** > **Webhooks** > **message-push-notification** > **Logs**
   - You should see webhook invocations

### ✅ Step 6: Verify Push Subscriptions

1. Make sure users have **push notifications enabled**:
   - Go to **Settings** page
   - Enable push notifications
   - Grant browser permission when prompted

2. Check if subscriptions are saved:
   ```sql
   SELECT COUNT(*) as total_subscriptions FROM push_subscriptions;
   SELECT user_id, COUNT(*) as count FROM push_subscriptions GROUP BY user_id;
   ```

## Common Issues

### ❌ "No push subscriptions found"
- **Fix**: Users need to enable push notifications in Settings
- Users must grant browser notification permission

### ❌ "Webhook not firing"
- **Fix**: Verify webhook is created and enabled
- Check webhook URL is correct
- Check service role key in headers is correct

### ❌ "Edge Function error: Missing VAPID keys"
- **Fix**: Set `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` in Edge Function secrets

### ❌ "Edge Function error: Missing Supabase configuration"
- **Fix**: Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in Edge Function secrets

### ❌ "Push notification sent but not received"
- **Fix**: 
  - Check browser notification permissions (Settings > Notifications)
  - Verify VAPID keys match between client and server
  - Check if device/browser supports push notifications

## Verification Checklist

- [ ] Edge Function deployed
- [ ] VAPID keys set in Edge Function secrets
- [ ] SUPABASE_URL set in Edge Function secrets
- [ ] SUPABASE_SERVICE_ROLE_KEY set in Edge Function secrets
- [ ] Webhook created in Database > Webhooks
- [ ] Webhook enabled and pointing to correct URL
- [ ] Users have push notifications enabled (Settings page)
- [ ] Users have granted browser notification permission
- [ ] push_subscriptions table has entries for users
- [ ] Edge Function logs show function calls
- [ ] Webhook logs show invocations

## Manual Test

You can manually test the Edge Function:

```bash
curl -X POST https://zqcbldgheimqrnqmbbed.supabase.co/functions/v1/send-message-push-notification \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "record": {
      "id": "MESSAGE_ID",
      "conversation_id": "CONVERSATION_ID",
      "sender_id": "SENDER_ID",
      "content": "Test message"
    }
  }'
```

Replace:
- `YOUR_SERVICE_ROLE_KEY` with your actual service role key
- `MESSAGE_ID`, `CONVERSATION_ID`, `SENDER_ID` with actual IDs from your database

## Still Not Working?

1. **Check Edge Function logs** for errors
2. **Check webhook logs** for delivery status
3. **Verify push subscriptions** exist in database
4. **Test with different users** to rule out user-specific issues
5. **Check browser console** for JavaScript errors
6. **Verify VAPID keys** are correct and match

