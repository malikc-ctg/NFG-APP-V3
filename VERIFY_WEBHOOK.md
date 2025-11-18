# 🔍 Verify Webhook Exists

## Check 1: Does the webhook appear in the list?

1. Go to: **Database → Webhooks** (or Integrations → Database Webhooks)
2. **Do you see a webhook named `message-push-notification`?**
   - ✅ Yes → Continue to Check 2
   - ❌ No → Webhook wasn't created, need to create it again

## Check 2: If webhook exists but not clickable

**Try these:**
1. **Click on the webhook name** (not the three dots)
2. **Try clicking the row itself**
3. **Try right-clicking** and see if there's a context menu
4. **Try double-clicking**

## Check 3: Verify webhook details from the list view

From the webhooks list, check these columns:

**Name:** Should be `message-push-notification`

**Table:** Should be `messages` (not `messages_2025_11_15`)

**Events:** Should show `INSERT`

**Webhook:** Should show the URL: 
```
https://zqcbldgheimqrnqmbbed.supabase.co/functions/v1/send-message-push-notification
```

**Status/Enabled:** Should show it's enabled (green checkmark or toggle)

## Check 4: If webhook doesn't exist

Go back and create it again following these steps:

1. **Click "Create a new hook"** (green button)
2. **Fill in all the fields** (see CREATE_WEBHOOK_STEP_BY_STEP.md)
3. **Make sure to click "Save" or "Create"**

## Check 5: Alternative - Check via SQL

Run this SQL to see if webhook exists:

```sql
-- Check for webhooks (if accessible via pg_webhooks extension)
SELECT * FROM pg_webhooks.webhooks;
```

Or check Supabase system tables (might vary based on Supabase version).

---

**What do you see in the webhook list?**
- [ ] No webhook at all
- [ ] Webhook exists but can't click it
- [ ] Webhook exists and is clickable but nothing happens
- [ ] Other issue (describe)

