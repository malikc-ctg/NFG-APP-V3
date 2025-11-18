# 🔗 Create Message Push Notification Webhook

Your Edge Function is deployed but **not being called** because the webhook doesn't exist or isn't configured.

## ✅ Step-by-Step: Create the Webhook

### 1. Go to Database Webhooks
- Open: https://supabase.com/dashboard/project/zqcbldgheimqrnqmbbed/database/webhooks
- Or: Dashboard → Database → Webhooks

### 2. Click "Create a new webhook"

### 3. Configure the Webhook:

**Name:**
```
message-push-notification
```

**Table:**
```
messages
```
*(Select from dropdown)*

**Events:**
- ✅ Check **"INSERT"** only
- ❌ Uncheck "UPDATE" and "DELETE"

**Type:**
```
HTTP Request
```

**Method:**
```
POST
```

**URL:**
```
https://zqcbldgheimqrnqmbbed.supabase.co/functions/v1/send-message-push-notification
```

**HTTP Headers:**
Click "Add header" and add:

**Header 1:**
- Key: `Authorization`
- Value: `Bearer YOUR_SERVICE_ROLE_KEY`

**Header 2:**
- Key: `Content-Type`
- Value: `application/json`

**⚠️ Important:** Replace `YOUR_SERVICE_ROLE_KEY` with your actual service role key.

**To get your service role key:**
1. Go to: Settings → API
2. Find "service_role" key (starts with `eyJ...`)
3. Copy it
4. Use it in the Authorization header: `Bearer eyJ...`

**Enabled:**
- ✅ Check this box (toggle should be ON)

### 4. Click "Save" or "Create Webhook"

---

## ✅ After Creating the Webhook:

1. **Test it:**
   - Send a test message in your app
   - Go back to Edge Function → Logs
   - You should see new log entries showing the function being called

2. **Check webhook logs:**
   - Go to Database → Webhooks
   - Click on your webhook
   - Check "Recent Events" or "Logs"
   - Should show successful requests (200 status)

---

## ❌ Common Mistakes:

1. **Wrong URL:** Make sure URL ends with `/send-message-push-notification` (not `/send-push-notification`)
2. **Missing Authorization header:** The function needs the service role key to access the database
3. **Wrong events:** Only "INSERT" should be checked
4. **Webhook disabled:** Make sure the toggle is ON/enabled
5. **Wrong table:** Must be `messages` (not `message`)

---

## 🧪 Verify It's Working:

After creating the webhook, send a test message and check:

1. **Edge Function Logs** should show:
   - Function invocation
   - "Getting conversation participants"
   - "Sending push notification to user X"
   - Or error messages if something is wrong

2. **Webhook Logs** should show:
   - POST request with 200 status
   - Request payload with message data

