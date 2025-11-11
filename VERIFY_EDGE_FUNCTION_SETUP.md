# Verify Edge Function Setup - Complete Checklist

## Issues Found in Your Configuration

### 1. ✅ Endpoint URL Format
The dashboard shows the correct endpoint:
```
https://zqcbldgheimqrnqmbbed.supabase.co/functions/v1/send-push-notification
```

**NOT** `https://zqcbldgheimqrnqmbbed.functions.supabase.co/send-push-notification`

### 2. ⚠️ "Verify JWT with legacy secret" Setting
**Current Status**: ON (green toggle)

**Recommendation**: Turn this OFF because:
- The function uses `SUPABASE_SERVICE_ROLE_KEY` internally for database access
- We're sending the service_role key in the Authorization header for testing
- The function doesn't need JWT verification since it handles auth internally

**To Fix**: 
1. In the dashboard, find the "Verify JWT with legacy secret" toggle
2. Turn it OFF (toggle should be gray)
3. Click "Save changes"

### 3. 🔴 CRITICAL: Check Secrets
The screenshot doesn't show the Secrets section. You MUST verify these secrets are set:

1. Click on **"Secrets"** in the left sidebar (under Edge Functions)
2. Or go to **Settings** → **Secrets** for the function
3. Verify these 4 secrets exist:

   - `SUPABASE_URL` = `https://zqcbldgheimqrnqmbbed.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxY2JsZGdoZWltcXJucW1iYmVkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDcwMzk2MiwiZXhwIjoyMDc2Mjc5OTYyfQ.qRTk5aTno8CYASO6Eu9VU9GTh6ZyV1FYgmn2r7Uv3E0`
   - `VAPID_PUBLIC_KEY` = (your VAPID public key)
   - `VAPID_PRIVATE_KEY` = (your VAPID private key)

**If any are missing, add them now!**

### 4. ✅ Fix Database Permissions
Run this SQL in Supabase SQL Editor:

```sql
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON public.push_subscriptions TO service_role;
GRANT ALL ON public.push_subscriptions TO authenticated;
```

## Test with Correct Endpoint

After fixing the above, test with the **correct endpoint URL**:

```bash
curl -X POST 'https://zqcbldgheimqrnqmbbed.supabase.co/functions/v1/send-push-notification' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxY2JsZGdoZWltcXJucW1iYmVkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDcwMzk2MiwiZXhwIjoyMDc2Mjc5OTYyfQ.qRTk5aTno8CYASO6Eu9VU9GTh6ZyV1FYgmn2r7Uv3E0' \
  -H 'Content-Type: application/json' \
  --data '{"user_id":"b6c70905-828b-45f8-8cd8-b5c1d281a21b","title":"Test Push","body":"Did this work?","url":"/jobs.html"}'
```

## What to Check Next

1. ✅ Turn OFF "Verify JWT with legacy secret"
2. ✅ Verify all 4 secrets are set
3. ✅ Run the SQL permissions script
4. ✅ Test with the correct endpoint URL above
5. ✅ Check function logs if it still fails

Let me know what you find in the Secrets section!

