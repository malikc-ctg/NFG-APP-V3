# Supabase Credentials Configuration

This document tracks where Supabase credentials are stored and how they're used throughout the NFG application.

## 🔐 Credentials

### Supabase URL
```
https://zqcbldgheimqrnqmbbed.supabase.co
```

### Anon Key (Public - Safe for Client-Side)
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxY2JsZGdoZWltcXJucW1iYmVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3MDM5NjIsImV4cCI6MjA3NjI3OTk2Mn0.UYlnTQeCjNLed6g9oNRLQIXD69OgzRrXupl3LXUvh4I
```

### Service Role Key (Secret - Server-Side Only)
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxY2JsZGdoZWltcXJucW1iYmVkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDcwMzk2MiwiZXhwIjoyMDc2Mjc5OTYyfQ.qRTk5aTno8CYASO6Eu9VU9GTh6ZyV1FYgmn2r7Uv3E0
```

⚠️ **IMPORTANT:** The Service Role Key should NEVER be hardcoded in client-side code. It should only be used in:
- Supabase Edge Functions (via environment secrets)
- Server-side code
- Database migrations/scripts

---

## 📁 File Locations

### 1. Client-Side Configuration

#### Auth Pages (with `window.ENV` blocks)
These pages explicitly set `window.ENV` with Supabase credentials:

- ✅ `auth/login.html` - Lines 16-19
- ✅ `auth/reset.html` - Lines 16-19  
- ✅ `auth/confirm.html` - Lines 16-19
- ✅ `auth/invite.html` - Lines 16-19

**Example:**
```html
<script>
  window.ENV = {
    SUPABASE_URL: 'https://zqcbldgheimqrnqmbbed.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  };
</script>
```

#### Core Supabase Client
- ✅ `js/supabase.js` - Lines 6-7 (fallback values)

**Contains fallback credentials:**
```javascript
const SUPABASE_URL = window.ENV?.SUPABASE_URL || 'https://zqcbldgheimqrnqmbbed.supabase.co'
const SUPABASE_ANON_KEY = window.ENV?.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
```

This ensures the Supabase client always initializes, even if `window.ENV` is not set on pages like:
- `index.html`
- `signup.html`
- `onboarding.html`
- `dashboard.html`
- `sites.html`
- `jobs.html`
- `bookings.html`
- `reports.html`
- `settings.html`
- `inventory.html`
- `accept-invitation.html`

### 2. Server-Side Configuration

#### Supabase Edge Function
- ✅ `supabase/functions/send-invitation-email/index.ts` - Lines 32-34

**Uses environment variables (NOT hardcoded):**
```typescript
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)
```

**Required Edge Function Secrets:**
The following must be set in Supabase Dashboard → Edge Functions → Secrets:
- `SUPABASE_URL` = `https://zqcbldgheimqrnqmbbed.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxY2JsZGdoZWltcXJucW1iYmVkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDcwMzk2MiwiZXhwIjoyMDc2Mjc5OTYyfQ.qRTk5aTno8CYASO6Eu9VU9GTh6ZyV1FYgmn2r7Uv3E0`
- `RESEND_API_KEY` = (Your Resend API key)
- `RESEND_FROM_EMAIL` = (Your Resend sender email)

**To set Edge Function secrets:**
1. Go to Supabase Dashboard → Edge Functions → Secrets
2. Add each secret key-value pair
3. Redeploy the Edge Function

---

## ✅ Verification Checklist

### All Credentials Correctly Configured:
- ✅ `auth/login.html` - Has correct `window.ENV` block
- ✅ `auth/reset.html` - Has correct `window.ENV` block
- ✅ `auth/confirm.html` - Has correct `window.ENV` block
- ✅ `auth/invite.html` - Has correct `window.ENV` block
- ✅ `js/supabase.js` - Has correct fallback values
- ✅ `supabase/functions/send-invitation-email/index.ts` - Uses env vars (correct)

### Security Notes:
- ✅ Service Role Key is NOT hardcoded in client-side files
- ✅ Service Role Key should only be in Edge Function secrets
- ✅ Anon Key is safe to use in client-side code (it's public)
- ✅ All auth pages use explicit `window.ENV` blocks
- ✅ Other pages rely on `js/supabase.js` fallback values

---

## 🔄 How to Update Credentials

### If Supabase URL or Anon Key Changes:

1. **Update `js/supabase.js`** (Lines 6-7)
   ```javascript
   const SUPABASE_URL = window.ENV?.SUPABASE_URL || 'NEW_URL_HERE'
   const SUPABASE_ANON_KEY = window.ENV?.SUPABASE_ANON_KEY || 'NEW_KEY_HERE'
   ```

2. **Update all auth pages** (`auth/*.html`):
   - `auth/login.html`
   - `auth/reset.html`
   - `auth/confirm.html`
   - `auth/invite.html`
   
   Change lines 17-18 in each:
   ```html
   SUPABASE_URL: 'NEW_URL_HERE',
   SUPABASE_ANON_KEY: 'NEW_KEY_HERE'
   ```

### If Service Role Key Changes:

1. **Update Supabase Dashboard → Edge Functions → Secrets**
   - Change `SUPABASE_SERVICE_ROLE_KEY` value
   - Redeploy Edge Function

2. **DO NOT** update any code files (it's not hardcoded, which is correct)

---

## 🚨 Security Reminders

1. **Never commit Service Role Key to Git**
   - It should only exist in Supabase Edge Function secrets
   - If accidentally committed, rotate the key immediately

2. **Anon Key is Public**
   - Safe to commit to Git
   - Used in all client-side code
   - Protected by Row Level Security (RLS) policies

3. **Service Role Key is Dangerous**
   - Bypasses all RLS policies
   - Has full database access
   - Only use in server-side/Edge Function code
   - Never expose to client-side JavaScript

---

## 📝 Last Updated

Credentials verified and documented: January 2025

---

## 🆘 Troubleshooting

### "Supabase client not initialized"
- Check `window.ENV` is set on auth pages
- Check `js/supabase.js` has correct fallback values
- Check browser console for errors

### "Edge Function authentication failed"
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set in Edge Function secrets
- Redeploy the Edge Function after updating secrets
- Check Edge Function logs in Supabase Dashboard

### "Permission denied" errors
- Check RLS policies are enabled on tables
- Verify user has correct role/permissions
- Check `created_by` filtering for multi-tenancy

