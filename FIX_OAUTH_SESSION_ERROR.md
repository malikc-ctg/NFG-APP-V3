# 🔧 Fix: "Failed to create OAuth session" Error

## The Problem:
The Edge Function is trying to insert into `gateway_oauth_sessions` table but it's failing with a 500 error.

## Most Likely Cause:
**The `gateway_oauth_sessions` table doesn't exist yet!**

## Solution:

### Step 1: Run the Payment System Schema SQL

1. Go to Supabase Dashboard: https://supabase.com/dashboard/project/zqcbldgheimqrnqmbbed
2. Click **SQL Editor** in the left sidebar
3. Open the file: `ADD_PAYMENT_SYSTEM_SCHEMA.sql`
4. Copy the entire contents
5. Paste into SQL Editor
6. Click **Run**

OR run it via CLI:
```bash
cd "/Users/malikcampbell/NFG APP V3"
supabase db execute --file ADD_PAYMENT_SYSTEM_SCHEMA.sql
```

### Step 2: Verify Table Was Created

Run this in SQL Editor to check:
```sql
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'gateway_oauth_sessions'
) AS table_exists;
```

Should return `true`.

### Step 3: Check Table Structure

```sql
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_name = 'gateway_oauth_sessions'
ORDER BY ordinal_position;
```

Should show columns:
- id
- company_id
- gateway
- state_token
- gateway_account_id
- status
- expires_at
- created_at
- completed_at

### Step 4: Try Again

After running the SQL:
1. Hard refresh browser (Cmd+Shift+R)
2. Go to Settings → Payment Gateway
3. Click "Connect Stripe Account"
4. Should work now! ✅

---

## If Still Failing:

The error message will now show more details. Check the browser console for the exact error.

