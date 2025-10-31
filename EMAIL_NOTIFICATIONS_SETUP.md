# 📧 Email Notifications Setup Guide

## Overview
Complete guide to set up automatic email notifications for your NFG app.

---

## ✅ What's Included

1. **Edge Function** (`send-notification-email`)
   - Sends beautiful HTML emails via Resend
   - Respects user preferences
   - Automatic when notifications are created

2. **Database Trigger**
   - Automatically sends emails when notifications are created
   - Checks user preferences before sending

3. **In-App Notifications**
   - Notification center with bell icon
   - Real-time updates via Supabase Realtime
   - Push notifications support (PWA ready)

---

## 🚀 Setup Steps

### Step 1: Run SQL Scripts (IN ORDER)

#### 1.1: Run Notification System Setup
```sql
-- Run: SETUP_NOTIFICATIONS_SYSTEM.sql
```

#### 1.2: Enable pg_net Extension
```sql
CREATE EXTENSION IF NOT EXISTS pg_net;
```

#### 1.3: Run Email Support SQL
```sql
-- Run: ADD_NOTIFICATION_EMAIL.sql
```

---

### Step 2: Verify Resend Setup (Already Done! ✅)

Make sure Resend secrets are set in Supabase:

**Supabase Dashboard → Edge Functions → Secrets:**
- `RESEND_API_KEY` = Your Resend API key ✅
- `RESEND_FROM_EMAIL` = `NFG <noreply@yourdomain.com>` or `onboarding@resend.dev`

---

### Step 3: Deploy Edge Function

```bash
# Navigate to project
cd "/Users/malikcampbell/NFG APP V3"

# Deploy the function
supabase functions deploy send-notification-email

# Or if using Supabase CLI for the first time:
supabase login
supabase link --project-ref zqcbldgheimqrnqmbbed
supabase functions deploy send-notification-email
```

---

## 📋 How It Works

### Automatic Flow:
1. **Notification Created** → Database trigger fires
2. **Check Preferences** → User's email preferences checked
3. **Send Email** → If email enabled & user has email
4. **Notification Saved** → Always created, even if email fails

### User Preferences Control:
- `email_enabled` → Master email toggle
- `push_enabled` → For future PWA push notifications
- `in_app_enabled` → In-app notifications (always on)
- `job_assigned`, `job_completed`, etc. → Type-specific toggles

---

## 🧪 Testing

### Test Email Notification:
```sql
-- Create a test notification
INSERT INTO notifications (user_id, type, title, message, link)
VALUES (
  'your-user-id',
  'job_assigned',
  'Test Email Notification',
  'This is a test notification email',
  'https://yourapp.com/jobs/123'
);
```

Check:
- ✅ Supabase Edge Function logs
- ✅ Resend dashboard → Logs
- ✅ User's email inbox

---

## 🎯 Notification Types

All these types support email & in-app:
- `job_assigned`
- `job_completed`
- `job_updated`
- `booking_created`
- `booking_updated`
- `booking_cancelled`
- `mention`
- `system`

---

## 🔧 Troubleshooting

### Emails Not Sending?
1. ✅ Check `RESEND_API_KEY` is set in Edge Function secrets
2. ✅ Check Resend dashboard → Logs for errors
3. ✅ Verify user has `email_enabled = true` in preferences
4. ✅ Check Edge Function logs in Supabase Dashboard

### Database Trigger Not Working?
1. ✅ Check `pg_net` extension is enabled: `CREATE EXTENSION IF NOT EXISTS pg_net;`
2. ✅ Verify trigger exists: Check notifications table
3. ✅ Check Supabase logs for warnings
4. ✅ Test trigger manually

### Edge Function Errors?
1. ✅ Check Edge Function logs in Supabase Dashboard
2. ✅ Verify `RESEND_API_KEY` secret is set correctly
3. ✅ Test Edge Function manually via Supabase Dashboard

---

## 📊 Cost Estimates

### Resend (Email):
- **Free Tier:** 100 emails/day
- **Paid:** $20/mo for 50,000 emails

**Example:** 1,000 notifications/month = Free tier (well within limit)

---

## ✅ Checklist

- [ ] Run `SETUP_NOTIFICATIONS_SYSTEM.sql`
- [ ] Enable `pg_net` extension
- [ ] Run `ADD_NOTIFICATION_EMAIL.sql`
- [ ] Verify `RESEND_API_KEY` secret is set ✅
- [ ] Verify `RESEND_FROM_EMAIL` secret is set
- [ ] Deploy Edge Function: `send-notification-email`
- [ ] Test email notification

---

## 🎉 Features

- ✅ **Beautiful HTML Emails** - Professional NFG-branded templates
- ✅ **In-App Notifications** - Real-time bell icon with badge
- ✅ **Push Notifications** - PWA ready (future enhancement)
- ✅ **User Preferences** - Control what notifications to receive
- ✅ **Automatic** - Works seamlessly when notifications are created

---

## 🎉 You're Done!

Once all steps are complete, your NFG app will automatically:
- ✅ Send beautiful HTML emails via Resend
- ✅ Show in-app notifications with real-time updates
- ✅ Respect user preferences
- ✅ Work seamlessly with the notification center

All notifications will be sent automatically when created! 🚀

