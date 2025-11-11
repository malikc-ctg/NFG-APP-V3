# Fix Push Notifications - Permission Denied Error

## The Error
```
"permission denied for table push_subscriptions"
```

This means the service role key can't access the `push_subscriptions` table.

## Solution: Run These Steps

### Step 1: Fix Database Permissions

1. Open **Supabase Dashboard** → **SQL Editor**
2. Run this SQL script:

```sql
-- Grant permissions to service_role
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON public.push_subscriptions TO service_role;
GRANT ALL ON public.push_subscriptions TO authenticated;
```

### Step 2: Verify Edge Function Secrets

1. Go to **Supabase Dashboard** → **Edge Functions** → **send-push-notification**
2. Click **Settings** → **Secrets** (or **Environment Variables**)
3. Make sure these are set:
   - `SUPABASE_URL` = `https://zqcbldgheimqrnqmbbed.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxY2JsZGdoZWltcXJucW1iYmVkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDcwMzk2MiwiZXhwIjoyMDc2Mjc5OTYyfQ.qRTk5aTno8CYASO6Eu9VU9GTh6ZyV1FYgmn2r7Uv3E0`
   - `VAPID_PUBLIC_KEY` = (your VAPID public key)
   - `VAPID_PRIVATE_KEY` = (your VAPID private key)

**Important**: The `SUPABASE_URL` should be `https://zqcbldgheimqrnqmbbed.supabase.co` (NO `/functions` at the end)

### Step 3: Verify Table Exists

Run this in SQL Editor to check:

```sql
SELECT * FROM push_subscriptions 
WHERE user_id = 'b6c70905-828b-45f8-8cd8-b5c1d281a21b';
```

If no rows are returned, you need to:
1. Open your app in the browser
2. Go to **Settings** → **Push Notifications**
3. Click **Enable Push**
4. Grant permission when prompted

### Step 4: Test Again

After fixing permissions, test with:

```bash
curl https://zqcbldgheimqrnqmbbed.functions.supabase.co/send-push-notification \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxY2JsZGdoZWltcXJucW1iYmVkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDcwMzk2MiwiZXhwIjoyMDc2Mjc5OTYyfQ.qRTk5aTno8CYASO6Eu9VU9GTh6ZyV1FYgmn2r7Uv3E0" \
  --data '{"user_id":"b6c70905-828b-45f8-8cd8-b5c1d281a21b","title":"Test Push","body":"Did this work?","url":"/jobs.html"}'
```

You should get `"ok"` if it works, or a clear error message if something else is wrong.

