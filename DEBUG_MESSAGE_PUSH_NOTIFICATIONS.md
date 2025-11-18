# 🔍 Debug Message Push Notifications

## Quick Checklist

### ✅ Step 1: Verify Edge Function is Deployed
- [ ] Go to: https://supabase.com/dashboard/project/zqcbldgheimqrnqmbbed/functions/send-message-push-notification
- [ ] Check "Overview" tab - should show deployment status
- [ ] If not deployed, run: `supabase functions deploy send-message-push-notification`

### ✅ Step 2: Verify VAPID Keys are Set
- [ ] Go to Edge Function → Settings → Secrets
- [ ] Check for `VAPID_PUBLIC_KEY` (should be: `BNRzgf5fJSbUfBsaFvCPUWPqvnd1qqKPu8C3tUQp_RoILsvczmd1oZNA-bpHq5q0VnLLjWzcm2U1vYxEbZ_kH4I`)
- [ ] Check for `VAPID_PRIVATE_KEY` (should be set)
- [ ] If missing, add them as secrets

### ✅ Step 3: Verify Webhook is Created
- [ ] Go to: https://supabase.com/dashboard/project/zqcbldgheimqrnqmbbed/database/webhooks
- [ ] Look for a webhook named `message-push-notification` or similar
- [ ] Check that it's:
  - ✅ **Enabled** (toggle is ON)
  - ✅ **Table**: `messages`
  - ✅ **Events**: `INSERT` is checked
  - ✅ **URL**: `https://zqcbldgheimqrnqmbbed.supabase.co/functions/v1/send-message-push-notification`
  - ✅ **HTTP Headers** include:
    ```
    Authorization: Bearer YOUR_SERVICE_ROLE_KEY
    Content-Type: application/json
    ```

### ✅ Step 4: Check Edge Function Logs
- [ ] Go to Edge Function → Logs tab
- [ ] Send a test message
- [ ] Check logs for:
  - Errors (red)
  - Warnings (yellow)
  - Info messages (green)
- [ ] Look for:
  - "VAPID keys are not configured" → Keys not set
  - "Missing required message fields" → Webhook payload issue
  - "No recipients to notify" → No conversation participants
  - "No push subscriptions found" → User hasn't enabled push
  - "✅ Push sent to user X" → Success!

### ✅ Step 5: Check Webhook Logs
- [ ] Go to: Database > Webhooks
- [ ] Click on the webhook
- [ ] Check "Logs" or "Recent Events"
- [ ] Look for:
  - Successful requests (200)
  - Failed requests (400, 500)
  - If no logs appear → Webhook might not be firing

### ✅ Step 6: Verify Push Subscriptions
Run this SQL in Supabase SQL Editor:
```sql
-- Check if users have push subscriptions
SELECT 
  ps.user_id,
  up.full_name,
  up.email,
  ps.created_at
FROM push_subscriptions ps
LEFT JOIN user_profiles up ON ps.user_id = up.id
ORDER BY ps.created_at DESC;
```

If empty → Users haven't enabled push notifications in Settings

### ✅ Step 7: Test Message Flow
1. **User A** sends message to **User B**
2. **Check webhook fires**: Database > Webhooks > Logs
3. **Check edge function receives**: Edge Function > Logs
4. **Check push subscription exists**: Run SQL above
5. **Check browser permission**: Browser should allow notifications

## Common Issues & Fixes

### ❌ Issue: "VAPID keys are not configured"
**Fix**: Add `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` to Edge Function secrets

### ❌ Issue: "No push subscriptions found"
**Fix**: 
- User needs to enable push notifications in Settings
- Browser needs to allow notifications
- Check `push_subscriptions` table has entries

### ❌ Issue: "Webhook not firing"
**Fix**:
- Check webhook is **Enabled**
- Check table is `messages` (not `message`)
- Check event is `INSERT` (not `UPDATE`)
- Verify URL is correct
- Check webhook logs for errors

### ❌ Issue: "Missing required message fields"
**Fix**:
- Webhook payload format might be wrong
- Check webhook is sending `record` object correctly
- Edge function expects: `payload.record` or direct payload

### ❌ Issue: "No recipients to notify"
**Fix**:
- Check `conversation_participants` table has correct entries
- Verify sender is excluded correctly
- Check conversation_id matches

## Test Manually

### Test Edge Function Directly
```bash
curl -X POST https://zqcbldgheimqrnqmbbed.supabase.co/functions/v1/send-message-push-notification \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "record": {
      "id": "test-message-id",
      "conversation_id": "test-conv-id",
      "sender_id": "test-sender-id",
      "content": "Test message"
    }
  }'
```

This should return a JSON response indicating success or error.

