# 🔗 Create Message Webhook - Step by Step

Follow these steps exactly:

## Step 1: Get Your Service Role Key

1. Go to: **Settings → API** (in Supabase Dashboard)
2. Find **"service_role"** key (starts with `eyJ...`)
3. **Copy the entire key** - you'll need it in Step 5

⚠️ **Important:** This is the `service_role` key, NOT the `anon` key!

---

## Step 2: Go to Webhooks

1. Click: **Database → Webhooks** (or go to Integrations → Database Webhooks)
2. Click: **"Create a new hook"** (green button)

---

## Step 3: Basic Configuration

**Name:**
```
message-push-notification
```

**Table:**
- Click the dropdown
- Select: **`messages`** (exactly this, no date suffix or variants)
- ✅ Make sure it's the main `messages` table

**Events:**
- ✅ Check **"INSERT"** 
- ❌ **UNCHECK** "UPDATE"
- ❌ **UNCHECK** "DELETE"

---

## Step 4: HTTP Configuration

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

⚠️ **Double-check:** The URL should end with `/send-message-push-notification` (not `/send-push-notification`)

---

## Step 5: HTTP Headers

Click **"Add header"** twice to add two headers:

**Header 1:**
- **Key:** `Authorization`
- **Value:** `Bearer eyJ...` (paste your full service role key here)
- Example: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

**Header 2:**
- **Key:** `Content-Type`
- **Value:** `application/json`

---

## Step 6: Enable

- ✅ Make sure the **"Enabled"** toggle is **ON** (or checkbox is checked)

---

## Step 7: Save

- Click **"Save"** or **"Create"**

---

## ✅ Verify After Creation

1. **Check webhook list:**
   - Should see one webhook for `messages` table
   - Events: `INSERT`
   - Status: Enabled

2. **Test it:**
   - Send a test message in your app
   - Go to: Edge Function → `send-message-push-notification` → **Logs** tab
   - **Refresh the logs**
   - Should see new log entries showing the function was called

3. **Check webhook activity:**
   - Go back to Database → Webhooks
   - Click on your webhook
   - Check "Recent Events" or logs
   - Should show successful requests (200 status)

---

## 🚨 Common Mistakes to Avoid:

1. ❌ **Wrong URL:** Make sure it's `/send-message-push-notification` (not `/send-push-notification`)
2. ❌ **Missing "Bearer ":** Authorization header should be `Bearer eyJ...` (with space after "Bearer")
3. ❌ **Wrong key:** Use `service_role` key, not `anon` key
4. ❌ **Wrong table:** Must be `messages` (not `messages_2025_11_15` or variants)
5. ❌ **Wrong events:** Only check "INSERT", uncheck others
6. ❌ **Not enabled:** Make sure toggle/checkbox is ON

---

Let me know once you've created it and we'll test!

