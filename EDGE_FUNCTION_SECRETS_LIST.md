# 4 Secrets Required for send-push-notification Edge Function

## Secret 1: SUPABASE_URL
**Value:** `https://zqcbldgheimqrnqmbbed.supabase.co`

**Where to find it:**
- Go to Supabase Dashboard → Settings → API
- Copy the "Project URL"
- **Important:** Do NOT include `/functions` at the end

---

## Secret 2: SUPABASE_SERVICE_ROLE_KEY
**Value:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxY2JsZGdoZWltcXJucW1iYmVkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDcwMzk2MiwiZXhwIjoyMDc2Mjc5OTYyfQ.qRTk5aTno8CYASO6Eu9VU9GTh6ZyV1FYgmn2r7Uv3E0`

**Where to find it:**
- Go to Supabase Dashboard → Settings → API
- Scroll down to "Project API keys"
- Copy the **service_role** key (NOT the anon key)
- **⚠️ WARNING:** This key has full database access - keep it secret!

---

## Secret 3: VAPID_PUBLIC_KEY
**Value:** `BNRzgf5fJSbUfBsaFvCPUWPqvnd1qqKPu8C3tUQp_RoILsvczmd1oZNA-bpHq5q0VnLLjWzcm2U1vYxEbZ_kH4I`

**Where to find it:**
- You provided this earlier in the conversation
- This is the public key for Web Push notifications
- This key is safe to expose (it's used client-side)

---

## Secret 4: VAPID_PRIVATE_KEY
**Value:** `w1r3220fvamF0Xai2a8y8EfaZUtpPJs6NVGwoHmz9QE`

**Where to find it:**
- You provided this earlier in the conversation
- This is the private key for Web Push notifications
- **⚠️ WARNING:** Keep this secret - never expose it client-side!

---

## How to Set These Secrets

### Option 1: Via Supabase Dashboard (Recommended)
1. Go to **Supabase Dashboard** → **Edge Functions** → **send-push-notification**
2. Click **Settings** → **Secrets** (or look for "Environment Variables")
3. Add each secret:
   - Click **"Add Secret"** or **"New Secret"**
   - Enter the **Name** (e.g., `SUPABASE_URL`)
   - Enter the **Value** (copy from above)
   - Click **Save**
4. Repeat for all 4 secrets

### Option 2: Via Supabase CLI
Run these commands in Terminal:

```bash
cd "/Users/malikcampbell/NFG APP V3"

# Set all 4 secrets
supabase secrets set SUPABASE_URL="https://zqcbldgheimqrnqmbbed.supabase.co"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxY2JsZGdoZWltcXJucW1iYmVkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDcwMzk2MiwiZXhwIjoyMDc2Mjc5OTYyfQ.qRTk5aTno8CYASO6Eu9VU9GTh6ZyV1FYgmn2r7Uv3E0"
supabase secrets set VAPID_PUBLIC_KEY="BNRzgf5fJSbUfBsaFvCPUWPqvnd1qqKPu8C3tUQp_RoILsvczmd1oZNA-bpHq5q0VnLLjWzcm2U1vYxEbZ_kH4I"
supabase secrets set VAPID_PRIVATE_KEY="w1r3220fvamF0Xai2a8y8EfaZUtpPJs6NVGwoHmz9QE"
```

After setting secrets, redeploy the function:
```bash
supabase functions deploy send-push-notification
```

---

## Verify Secrets Are Set

1. Go to **Supabase Dashboard** → **Edge Functions** → **send-push-notification**
2. Click **Settings** → **Secrets**
3. You should see all 4 secrets listed:
   - ✅ SUPABASE_URL
   - ✅ SUPABASE_SERVICE_ROLE_KEY
   - ✅ VAPID_PUBLIC_KEY
   - ✅ VAPID_PRIVATE_KEY

If any are missing, add them using one of the methods above.

---

## What Each Secret Does

| Secret | Purpose |
|--------|---------|
| `SUPABASE_URL` | Tells the function where your Supabase project is located |
| `SUPABASE_SERVICE_ROLE_KEY` | Allows the function to access the database (bypasses RLS) |
| `VAPID_PUBLIC_KEY` | Used to identify your app when sending push notifications |
| `VAPID_PRIVATE_KEY` | Used to sign push notification messages (keeps them secure) |

---

## Troubleshooting

**If you get "Failed to load subscriptions" error:**
- Check that `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set correctly
- Run the SQL script in `FIX_PUSH_SUBSCRIPTIONS_PERMISSIONS.sql` to grant permissions

**If you get "VAPID keys not configured" error:**
- Check that `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` are set correctly
- Make sure there are no extra spaces or quotes in the values

**If secrets don't appear after setting them:**
- Redeploy the function: `supabase functions deploy send-push-notification`
- Wait a few seconds for the secrets to propagate

