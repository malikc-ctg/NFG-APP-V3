# 🔗 Webhook Using Edge Function (Better Approach)

## Why Use Edge Function Instead of HTTP Request?

✅ **Faster** - Internal Supabase routing (no external HTTP call)  
✅ **More reliable** - No need for service role key in headers  
✅ **Simpler** - Supabase handles authentication automatically  
✅ **Better performance** - Lower latency

---

## How to Configure Webhook to Use Edge Function

### ✅ Step 1: Create/Edit Webhook

1. Go to **Supabase Dashboard** > **Database** > **Webhooks**
2. **Create new webhook** (or edit existing `message-push-notification`)
3. Configure:

### ✅ Step 2: Basic Settings

- **Name**: `message-push-notification`
- **Table**: `messages`
- **Events**: ✅ `INSERT` only
- **Type**: Select **`Supabase Edge Function`** (NOT "HTTP Request")
- **Function**: Select `send-message-push-notification` from dropdown
- **Enabled**: ✅ Yes

### ✅ Step 3: That's It!

When using **Supabase Edge Function** type:
- ❌ **No HTTP Headers needed** (Supabase handles auth automatically)
- ❌ **No URL needed** (Supabase routes internally)
- ✅ **Just select the function** from dropdown

---

## Webhook Payload Format

When using Edge Function type, Supabase sends the webhook payload in this format:

```json
{
  "type": "INSERT",
  "table": "messages",
  "record": {
    "id": "uuid-here",
    "conversation_id": "uuid-here",
    "sender_id": "uuid-here",
    "content": "message text",
    "created_at": "2025-11-18T..."
  },
  "old_record": null
}
```

Our Edge Function already handles this format! ✅

---

## Update Edge Function (Optional - Already Handles It)

The Edge Function at `supabase/functions/send-message-push-notification/index.ts` already handles webhook format:

```typescript
// Handle webhook format (Supabase sends { type, table, record, old_record })
let message = payload.record || payload

const messageId = message.id || payload.message_id
const conversationId = message.conversation_id || payload.conversation_id
const senderId = message.sender_id || payload.sender_id
const content = message.content || payload.content
```

**This already works!** No code changes needed.

---

## Comparison

### ❌ HTTP Request Method (Current)
- Type: `HTTP Request`
- Method: `POST`
- URL: `https://zqcbldgheimqrnqmbbed.supabase.co/functions/v1/send-message-push-notification`
- Headers: 
  - `Authorization: Bearer SERVICE_ROLE_KEY`
  - `Content-Type: application/json`
- **Issues:**
  - Requires service role key in headers
  - External HTTP call (slower)
  - Can fail due to network issues

### ✅ Edge Function Method (Recommended)
- Type: `Supabase Edge Function`
- Function: `send-message-push-notification` (select from dropdown)
- **Benefits:**
  - No headers needed
  - Internal routing (faster)
  - Automatic authentication
  - More reliable

---

## Migration Steps

1. **Delete existing HTTP Request webhook:**
   - Go to webhook list
   - Click three dots (⋯) on `message-push-notification`
   - Click **"Delete"**

2. **Create new Edge Function webhook:**
   - Click **"Create a new hook"**
   - Configure:
     - **Name**: `message-push-notification`
     - **Table**: `messages`
     - **Events**: `INSERT`
     - **Type**: **`Supabase Edge Function`** ← Change this!
     - **Function**: Select `send-message-push-notification` from dropdown
     - **Enabled**: ✅ Yes
   - Click **"Save"**

3. **Test:**
   - Send a message in app
   - Check webhook logs (should show success)
   - Check Edge Function logs (should show `🔔 [Push Notification] Function called`)

---

## Troubleshooting

### ❌ "Function not found" in dropdown
- **Fix:** Edge Function must be deployed first
- Run: `supabase functions deploy send-message-push-notification`

### ❌ Webhook logs show error
- **Fix:** Check Edge Function logs for details
- The function receives the payload automatically - no authentication needed

### ❌ Still not working
- **Fix:** Verify Edge Function is deployed and enabled
- Check Edge Function logs directly

---

## Advantages Summary

| Feature | HTTP Request | Edge Function |
|---------|-------------|---------------|
| **Speed** | Slower (external HTTP) | Faster (internal routing) |
| **Reliability** | Can fail (network) | More reliable |
| **Setup** | Complex (headers, URL) | Simple (select function) |
| **Auth** | Manual (service key) | Automatic |
| **Debugging** | Harder | Easier (direct logs) |

---

## Final Recommendation

**Switch to Edge Function type webhook** - it's better in every way! 🚀

