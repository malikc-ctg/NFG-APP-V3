# ✅ ADD THIS URL TO STRIPE

## The Redirect URI You Need:

Copy and paste this EXACT URL into Stripe:

```
https://zqcbldgheimqrnqmbbed.supabase.co/functions/v1/stripe-connect-oauth?action=callback
```

---

## Where to Add It:

1. Go to: **https://dashboard.stripe.com/settings/applications**
2. Scroll down to **"Redirect URIs"** section
3. Click **"+ Add URI"** button
4. Paste the URL above
5. Click **"Save"**

---

## But First - Fix CORS Error:

The CORS error means your browser can't call the Edge Function. We need to allow your domain in Supabase:

1. Go to: **https://supabase.com/dashboard/project/zqcbldgheimqrnqmbbed/settings/api**
2. Look for **"CORS"** or **"Allowed Origins"** section
3. Add your domain: `https://nfgone.ca`
4. Click **Save**

---

## Quick Test:

Open this URL in your browser to test if the function works:
```
https://zqcbldgheimqrnqmbbed.supabase.co/functions/v1/stripe-connect-oauth?action=callback
```

- ✅ If you see "Missing code or state parameter" → Function is working!
- ❌ If you see CORS error → Need to add CORS origin (see above)
- ❌ If you see 404 → Function not deployed

