# Push Notifications for Messages - Setup Guide

This guide explains how to set up push notifications for new messages.

## Overview

When a new message is inserted into the `messages` table, push notifications will be sent to all conversation participants (except the sender) if they have push notifications enabled.

## Setup Steps

### Option 1: Using Supabase Webhooks (Recommended - No Extension Required)

1. **Deploy the Edge Function**
   ```bash
   # Navigate to your project directory
   cd "/Users/malikcampbell/NFG APP V3"
   
   # Deploy the edge function
   supabase functions deploy send-message-push-notification
   ```

2. **Set Environment Variables**
   - Go to Supabase Dashboard > Edge Functions > `send-message-push-notification`
   - Add these secrets:
     - `VAPID_PUBLIC_KEY` - Your VAPID public key
     - `VAPID_PRIVATE_KEY` - Your VAPID private key
     - `SUPABASE_URL` - Your Supabase URL (usually auto-set)
     - `SUPABASE_SERVICE_ROLE_KEY` - Your service role key

3. **Create Database Webhook**
   - Go to Supabase Dashboard > Database > Webhooks
   - Click "Create a new webhook"
   - Configure:
     - **Name**: `message-push-notification`
     - **Table**: `messages`
     - **Events**: Select "INSERT"
     - **Type**: HTTP Request
     - **Method**: POST
     - **URL**: `https://zqcbldgheimqrnqmbbed.supabase.co/functions/v1/send-message-push-notification`
     - **HTTP Headers**: 
       ```
       Authorization: Bearer YOUR_SERVICE_ROLE_KEY
       Content-Type: application/json
       ```
     - **Enabled**: ✅

4. **Test**
   - Send a message in the app
   - Check if push notification is received (if user has push enabled)

### Option 2: Using pg_net Extension (Alternative)

If you prefer to use a database trigger instead of webhooks:

1. **Enable pg_net Extension**
   - Go to Supabase Dashboard > Database > Extensions
   - Find "pg_net" and enable it

2. **Set Database Settings**
   ```sql
   -- Set service role key (replace with your actual key)
   ALTER DATABASE postgres SET app.service_role_key = 'your-service-role-key';
   ```

3. **Run the SQL Script**
   - Run `ADD_MESSAGE_PUSH_NOTIFICATIONS.sql` in Supabase SQL Editor
   - This creates a trigger that calls the edge function directly

## How It Works

1. **User sends a message** → Message is inserted into `messages` table
2. **Webhook/Trigger fires** → Calls `send-message-push-notification` edge function
3. **Edge function**:
   - Gets conversation participants (excluding sender)
   - Gets their push subscriptions from `push_subscriptions` table
   - Sends push notification to each subscription
   - Removes expired/invalid subscriptions
4. **User receives push notification** → Can tap to open messages

## Requirements

- Users must have push notifications enabled (via Settings page)
- Users must have granted notification permission
- VAPID keys must be configured in Edge Function secrets
- `push_subscriptions` table must exist (created by `save-subscription` edge function)

## Troubleshooting

- **No notifications received**: 
  - Check if user has push notifications enabled
  - Check browser notification permissions
  - Check Edge Function logs in Supabase Dashboard
  - Verify webhook is enabled and configured correctly

- **Webhook not firing**:
  - Verify webhook is enabled in Database > Webhooks
  - Check webhook logs in Supabase Dashboard
  - Verify the URL is correct

- **Edge Function errors**:
  - Check Edge Function logs
  - Verify VAPID keys are set correctly
  - Verify service role key is set correctly

