# 🔗 Create Message Push Notification Webhook - Step by Step

## Problem
**No webhook logs = Webhook isn't firing or doesn't exist**

## Solution: Create/Verify Webhook

### ✅ Step 1: Go to Webhooks Section

1. Open **Supabase Dashboard**
2. Go to **Database** > **Webhooks** (left sidebar)
3. You should see a list of webhooks (or empty if none exist)

---

### ✅ Step 2: Check if Webhook Exists

**Look for a webhook named:**
- `message-push-notification` OR
- Any webhook with table = `messages`

**If you see it:**
- Click on it
- Check if **"Enabled"** toggle is **ON** (green)
- If it's OFF, turn it ON and save
- Go to **"Logs"** tab - if you still see no logs, the webhook isn't firing (continue to Step 3)

**If you DON'T see it:**
- Continue to Step 3 to create it

---

### ✅ Step 3: Create New Webhook

1. Click **"Create a new webhook"** or **"New Webhook"** button

2. **Configure Basic Settings:**
   - **Name**: `message-push-notification`
   - **Table**: Select `messages` from dropdown
   - **Events**: 
     - ✅ Check **`INSERT`** ONLY
     - ❌ Uncheck `UPDATE` and `DELETE`

3. **Configure HTTP Request:**
   - **Type**: Select `HTTP Request`
   - **Method**: Select `POST`
   - **URL**: `https://zqcbldgheimqrnqmbbed.supabase.co/functions/v1/send-message-push-notification`
   - **Enabled**: ✅ Make sure it's checked/enabled

4. **Configure HTTP Headers:**
   Click **"Add Header"** button (or similar)
   
   **Header 1:**
   - **Name**: `Authorization`
   - **Value**: `Bearer YOUR_SERVICE_ROLE_KEY`
     - Replace `YOUR_SERVICE_ROLE_KEY` with your actual service role key
     - Get it from: **Settings** > **API** > **`service_role`** key (under "Legacy keys")
     - It should look like: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (long string)
   
   **Header 2:**
   Click **"Add Header"** again
   - **Name**: `Content-Type`
   - **Value**: `application/json`

5. **Save:**
   - Click **"Save"** or **"Create Webhook"**

---

### ✅ Step 4: Verify Webhook

After creating, you should see:
- ✅ Webhook appears in the list
- ✅ Status shows "Enabled" or green toggle
- ✅ Table shows `messages`
- ✅ Events shows `INSERT`

---

### ✅ Step 5: Test Webhook

1. **Go to webhook details** (click on the webhook name)
2. **Open "Logs" tab** (or "Activity" tab)
3. **Send a message** in your app (between two users)
4. **Refresh the logs page**
5. **You should see:**
   - ✅ A new log entry with status `200` or `202`
   - ✅ Timestamp showing when it fired
   - ✅ Request/Response details

**If you still see NO logs:**
- Check webhook is **enabled**
- Check **Table** is `messages` (not `message` or `Messages`)
- Check **Events** includes `INSERT`
- Check **URL** is correct
- Check **Service Role Key** in Authorization header is correct

---

### ✅ Step 6: Check Edge Function Logs

Even if webhook logs show nothing, check Edge Function:

1. Go to **Edge Functions** > **send-message-push-notification** > **Logs**
2. **Send a message** in your app
3. **Look for:**
   - `🔔 [Push Notification] Function called` = Webhook IS working!
   - No new logs = Webhook isn't calling Edge Function

---

## Troubleshooting

### ❌ **Webhook Logs Tab is Empty**
- **Possible causes:**
  - Webhook was just created (wait for first message)
  - Webhook isn't enabled
  - Webhook table/events are wrong
  - Messages aren't being inserted (check messages table)

**Fix:**
1. Verify a message was actually inserted:
   ```sql
   SELECT * FROM messages ORDER BY created_at DESC LIMIT 1;
   ```
2. If message exists but no webhook log:
   - Delete and recreate webhook
   - Double-check table = `messages` (exact spelling)
   - Double-check event = `INSERT` (not UPDATE)

---

### ❌ **Webhook Shows Error in Logs**
- **401 Unauthorized** = Service role key is wrong
- **404 Not Found** = Edge Function URL is wrong
- **500 Internal Server Error** = Edge Function has an error (check Edge Function logs)

**Fix:**
- Check Authorization header has correct service role key
- Check Edge Function URL is correct
- Check Edge Function is deployed

---

### ❌ **Webhook Enabled But Still No Logs**
1. **Verify webhook table:**
   - Go to webhook details
   - Make sure **Table** shows `messages` (exact spelling, lowercase)

2. **Verify webhook events:**
   - Make sure **Events** includes `INSERT`

3. **Test message insertion:**
   ```sql
   -- Insert a test message
   INSERT INTO messages (conversation_id, sender_id, content)
   VALUES (
     (SELECT id FROM conversations LIMIT 1),
     auth.uid(),
     'Test message for webhook'
   );
   ```
   - Check webhook logs immediately after
   - Should see a log entry

---

## Quick Verification Checklist

- [ ] Webhook exists in Database > Webhooks
- [ ] Webhook name is `message-push-notification`
- [ ] Webhook table is `messages` (exact spelling)
- [ ] Webhook event is `INSERT`
- [ ] Webhook is **enabled** (green toggle)
- [ ] Webhook URL is: `https://zqcbldgheimqrnqmbbed.supabase.co/functions/v1/send-message-push-notification`
- [ ] Webhook has `Authorization` header with service role key
- [ ] Webhook has `Content-Type` header with `application/json`
- [ ] At least one message exists in `messages` table
- [ ] Webhook logs show entries after sending messages

---

## Still No Logs After This?

1. **Delete the webhook completely**
2. **Wait 30 seconds**
3. **Create it again** from scratch
4. **Test immediately** by sending a message

If still nothing, the issue might be:
- Edge Function isn't deployed
- Service role key is incorrect
- Supabase project issue (contact support)
