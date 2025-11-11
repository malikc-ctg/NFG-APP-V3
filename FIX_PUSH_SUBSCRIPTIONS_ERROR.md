# Fix "Failed to load subscriptions" Error

## The Problem
The `send-push-notification` edge function can't query the `push_subscriptions` table, which means it's missing required environment variables.

## Step 1: Check Edge Function Secrets

1. Go to **Supabase Dashboard** → **Edge Functions** → **send-push-notification**
2. Click **Settings** or **Secrets**
3. Verify these secrets exist:
   - `SUPABASE_URL` = `https://zqcbldgheimqrnqmbbed.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY` = (your service role key)
   - `VAPID_PUBLIC_KEY` = (your VAPID public key)
   - `VAPID_PRIVATE_KEY` = (your VAPID private key)

## Step 2: Add Missing Secrets

If `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` are missing:

1. Go to **Supabase Dashboard** → **Settings** → **API**
2. Copy the **Project URL** (this is your `SUPABASE_URL`)
3. Copy the **service_role** key (this is your `SUPABASE_SERVICE_ROLE_KEY`)
4. Go to **Edge Functions** → **send-push-notification** → **Secrets**
5. Add both secrets:
   - Name: `SUPABASE_URL`, Value: `https://zqcbldgheimqrnqmbbed.supabase.co`
   - Name: `SUPABASE_SERVICE_ROLE_KEY`, Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (your full key)

## Step 3: Redeploy the Function

After adding secrets, redeploy the function so it picks them up:

```bash
cd "/Users/malikcampbell/NFG APP V3"
supabase functions deploy send-push-notification
```

## Step 4: Verify Subscriptions Exist

Run the SQL query in `CHECK_PUSH_SUBSCRIPTIONS.sql` in Supabase SQL Editor to verify:
1. The table exists
2. You have a subscription for user_id `b6c70905-828b-45f8-8cd8-b5c1d281a21b`

If no subscription exists:
1. Open your app in the browser
2. Go to **Settings** → **Push Notifications**
3. Click **Enable Push**
4. Grant notification permission when prompted

## Step 5: Test Again

After redeploying, test with:

```bash
curl https://zqcbldgheimqrnqmbbed.functions.supabase.co/send-push-notification \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxY2JsZGdoZWltcXJucW1iYmVkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDcwMzk2MiwiZXhwIjoyMDc2Mjc5OTYyfQ.qRTk5aTno8CYASO6Eu9VU9GTh6ZyV1FYgmn2r7Uv3E0" \
  --data '{"user_id":"b6c70905-828b-45f8-8cd8-b5c1d281a21b","title":"Test Push","body":"Did this work?","url":"/jobs.html"}'
```

## Step 6: Check Function Logs

If it still fails, check the logs:
1. Go to **Supabase Dashboard** → **Edge Functions** → **send-push-notification**
2. Click **Logs**
3. Look for the exact error message
4. Share the error message for further diagnosis

