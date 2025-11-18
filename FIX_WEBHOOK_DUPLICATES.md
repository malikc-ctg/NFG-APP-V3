# 🔧 Fix Webhook Duplicates

You have multiple webhooks created. Here's what to do:

## ✅ Keep Only the Correct One

**Keep this webhook:**
- **Name:** `message-push-notification`
- **Table:** `messages` (not `messages_2025_11_15` or any other variant)
- **Events:** `INSERT`
- **Webhook URL:** `https://zqcbldgheimqrnqmbbed.supabase.co/functions/v1/send-message-push-notification`

## ❌ Delete the Others

Delete any webhooks for:
- `messages_2025_11_15` (this looks like a backup/partitioned table)
- Any other `messages_*` variants
- Any webhooks pointing to the wrong URL

## 📋 Steps to Clean Up:

1. **Click the three dots (⋮) on each duplicate webhook**
2. **Select "Delete"** for all except the one for the `messages` table
3. **Keep only the webhook for the `messages` table**

## ✅ Verify the Correct Webhook:

The webhook you keep should have:
- ✅ **Table:** `messages` (exactly this, no date suffix)
- ✅ **Events:** `INSERT` only
- ✅ **URL:** Points to `send-message-push-notification`
- ✅ **Enabled:** Should be ON/toggled

## 🧪 Test It:

1. **Send a test message** in your app
2. **Check Edge Function logs** - you should see new entries
3. **Check webhook logs** - should show successful requests

---

**Note:** The `messages_2025_11_15` table looks like it might be a partitioned table or backup. If your actual `messages` table is different, make sure the webhook is pointing to the correct table name.

