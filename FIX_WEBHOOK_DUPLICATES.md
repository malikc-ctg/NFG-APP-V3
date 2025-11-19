# 🔧 Fix Webhook Duplicates

## Problem
You have **8 webhooks** but you only need **1 webhook** for the `messages` table.

## Solution: Delete Extra Webhooks

### ✅ Step 1: Keep ONLY the `messages` webhook

**You should have:**
- ✅ `message-push-notification` → Table: `messages` → Keep this one!
- ❌ `message-push-notification` → Table: `messages_2025_11_15` → **DELETE**
- ❌ `message-push-notification` → Table: `messages_2025_11_16` → **DELETE**
- ❌ `message-push-notification` → Table: `messages_2025_11_17` → **DELETE**
- ❌ `message-push-notification` → Table: `messages_2025_11_18` → **DELETE**
- ❌ `message-push-notification` → Table: `messages_2025_11_19` → **DELETE**
- ❌ `message-push-notification` → Table: `messages_2025_11_20` → **DELETE**
- ❌ `message-push-notification` → Table: `messages_2025_11_21` → **DELETE**

### ✅ Step 2: Delete Extra Webhooks

For each webhook with table name like `messages_2025_11_XX`:

1. Click the **three dots (⋯)** on the right side of that webhook row
2. Click **"Delete"** or **"Remove"**
3. Confirm deletion
4. **Repeat for all 7 extra webhooks**

### ✅ Step 3: Verify the Correct Webhook

You should only have **ONE** webhook left:
- **Name**: `message-push-notification`
- **Table**: `messages` (NOT `messages_2025_11_XX`)
- **Events**: `INSERT`
- **Enabled**: ✅ Yes (green toggle)

### ✅ Step 4: Verify Webhook Configuration

Click on the webhook (the one for `messages` table) and check:

1. **URL**: `https://zqcbldgheimqrnqmbbed.supabase.co/functions/v1/send-message-push-notification`
2. **Method**: `POST`
3. **HTTP Headers**:
   - `Authorization: Bearer YOUR_SERVICE_ROLE_KEY`
   - `Content-Type: application/json`
4. **Enabled**: ✅ Yes

### ✅ Step 5: Test

1. Send a message in your app
2. Go to webhook **"Logs"** tab
3. **Refresh the page**
4. You should see a log entry with status `200` or `202`

---

## Why This Happened

Those `messages_2025_11_XX` tables don't exist - they were likely created by mistake or Supabase tried to partition the table. Your actual table is just `messages`.

**Only webhook the `messages` table!**

---

## After Cleaning Up

Once you have only the correct webhook:
1. ✅ Send a message
2. ✅ Check webhook logs - should see entries now
3. ✅ Check Edge Function logs - should see `🔔 [Push Notification] Function called`
