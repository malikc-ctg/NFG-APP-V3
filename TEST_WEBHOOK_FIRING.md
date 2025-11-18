# 🧪 Test if Webhook is Firing

## Step 1: Verify Messages Are Being Inserted

**Run this SQL in Supabase SQL Editor:**

```sql
-- Check recent messages
SELECT 
  id,
  conversation_id,
  sender_id,
  content,
  created_at
FROM messages
ORDER BY created_at DESC
LIMIT 5;
```

**What does this show?**
- ❓ Empty (no messages)?
- ❓ Has recent messages?

**If empty:** Messages aren't being created in the database. This means the issue is in your app, not the webhook.

**If messages exist:** Continue to Step 2.

---

## Step 2: Check Webhook URL (Exact Match)

The webhook URL shown in your list is truncated. It should be **exactly:**

```
https://zqcbldgheimqrnqmbbed.supabase.co/functions/v1/send-message-push-notification
```

**NOT:**
- ❌ `/send-push-notification`
- ❌ `/send-message-push-notification/`
- ❌ Any other variation

**Since you can't click the webhook to edit it, let's verify:**

1. **Delete the existing webhook** (click the three dots ⋮ → Delete)
2. **Create it again** with the exact URL above

---

## Step 3: Test Webhook Directly

After recreating the webhook, send a test message and immediately:

1. **Check Edge Function Logs** (refresh)
2. **Do you see new entries?**
   - ✅ Yes → Webhook is working!
   - ❌ No → Continue troubleshooting

---

## Step 4: If Still No Logs

**Possible issues:**

1. **Webhook Authorization Header Missing**
   - Webhook needs: `Authorization: Bearer YOUR_SERVICE_ROLE_KEY`
   - Can't verify without clicking webhook, so recreate it

2. **Wrong Webhook URL**
   - Must match exactly: `.../send-message-push-notification`

3. **Messages Table Different Name**
   - Verify table is actually called `messages` (not `message` or `messages_2025_11_15`)

4. **Webhook Not Enabled**
   - Should show as enabled in the list

---

## 🚀 Action Plan:

**Option A: Recreate Webhook**
1. Delete current webhook
2. Create new one with exact URL above
3. Make sure Authorization header is set
4. Test

**Option B: Check if Messages Are Being Created**
1. Run SQL query above
2. If no messages, the issue is in your app code
3. If messages exist, webhook should be firing

**Tell me:**
1. What does the SQL query return? (recent messages?)
2. Should we recreate the webhook?

