# 🔗 Stripe Connect Setup URLs

## Required URLs to Add to Stripe

### 1. Redirect URI (REQUIRED)

**Add this to Stripe Dashboard:**

```
https://zqcbldgheimqrnqmbbed.supabase.co/functions/v1/stripe-connect-oauth?action=callback
```

**Where to add it:**
1. Go to: https://dashboard.stripe.com/settings/applications
2. Scroll to **"Redirect URIs"** section
3. Click **"+ Add URI"**
4. Paste the URL above
5. Click **"Save"**

---

### 2. Test the Function Directly

**Check if the Edge Function is accessible:**

Open this URL in your browser:
```
https://zqcbldgheimqrnqmbbed.supabase.co/functions/v1/stripe-connect-oauth?action=callback
```

**Expected result:**
- If you see an HTML page saying "Missing code or state parameter" → ✅ Function is working!
- If you see CORS error → Function exists but CORS needs fixing
- If you see 404 → Function not deployed

---

### 3. Current Error Fix

The CORS error means the browser is blocking the request. Let's verify:

**Check your browser console for the exact error:**
- If it says "preflight request doesn't pass" → Need to configure CORS in Supabase
- If it says "404 Not Found" → Function not deployed
- If it says "403 Forbidden" → Authorization issue

---

## Quick Fix Steps

### Option 1: Add CORS Origin in Supabase (Recommended)

1. Go to: https://supabase.com/dashboard/project/zqcbldgheimqrnqmbbed
2. Go to **Settings** → **API**
3. Under **"Allowed Origins"** or **"CORS"**, add:
   ```
   https://nfgone.ca
   ```
4. Click **Save**

### Option 2: Test from Stripe Dashboard Directly

1. Go to Stripe Dashboard → Connect → Settings
2. Make sure your redirect URI is added (see #1 above)
3. Try the connection flow again

---

## Current Configuration

- **Supabase URL:** `https://zqcbldgheimqrnqmbbed.supabase.co`
- **Edge Function:** `stripe-connect-oauth`
- **Redirect URI:** `https://zqcbldgheimqrnqmbbed.supabase.co/functions/v1/stripe-connect-oauth?action=callback`
- **Your Domain:** `https://nfgone.ca`

---

## Next Steps

1. ✅ Add redirect URI to Stripe (see #1)
2. ✅ Add CORS origin in Supabase (see Option 1)
3. ✅ Test the function URL directly (see #2)
4. ✅ Clear browser cache and try again

