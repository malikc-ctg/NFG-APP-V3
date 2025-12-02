# 🔄 Setting Up Recurring Billing Cron Job

This guide will help you set up automated recurring billing for subscriptions.

## Option 1: External Cron Service (Recommended - Easiest)

### Step 1: Set Cron Secret

Run this command to generate and set a secure cron secret:

```bash
# Generate a random secret
CRON_SECRET=$(openssl rand -hex 32)

# Set it in Supabase secrets
supabase secrets set CRON_SECRET=$CRON_SECRET

# Save it somewhere safe - you'll need it for the cron service
echo "Your CRON_SECRET is: $CRON_SECRET"
```

### Step 2: Set Up External Cron Job

Use one of these free cron services:

#### A. Cron-job.org (Free)

1. Go to: https://cron-job.org/
2. Sign up for free account
3. Click "Create cronjob"
4. Fill in:
   - **Title**: NFG Recurring Billing
   - **Address**: `https://zqcbldgheimqrnqmbbed.supabase.co/functions/v1/process-recurring-billing`
   - **Schedule**: Every day at 9:00 AM UTC
   - **Request method**: POST
   - **Request headers**:
     ```
     X-Cron-Secret: YOUR_CRON_SECRET_HERE
     Content-Type: application/json
     ```
5. Click "Create cronjob"

#### B. EasyCron (Free Tier)

1. Go to: https://www.easycron.com/
2. Sign up for free account
3. Click "Add New Cron Job"
4. Fill in:
   - **Cron Job Name**: NFG Recurring Billing
   - **URL**: `https://zqcbldgheimqrnqmbbed.supabase.co/functions/v1/process-recurring-billing`
   - **HTTP Method**: POST
   - **HTTP Headers**: 
     ```
     X-Cron-Secret: YOUR_CRON_SECRET_HERE
     ```
   - **Cron Expression**: `0 9 * * *` (daily at 9 AM UTC)
5. Click "Add"

#### C. GitHub Actions (Free for Public Repos)

Create `.github/workflows/recurring-billing.yml`:

```yaml
name: Recurring Billing

on:
  schedule:
    - cron: '0 9 * * *' # Daily at 9 AM UTC
  workflow_dispatch: # Allow manual trigger

jobs:
  process-billing:
    runs-on: ubuntu-latest
    steps:
      - name: Process Recurring Billing
        run: |
          curl -X POST \
            -H "X-Cron-Secret: ${{ secrets.CRON_SECRET }}" \
            -H "Content-Type: application/json" \
            https://zqcbldgheimqrnqmbbed.supabase.co/functions/v1/process-recurring-billing
```

Then add `CRON_SECRET` to GitHub Secrets (Settings → Secrets → Actions)

---

## Option 2: Supabase pg_cron (If Available)

If your Supabase project has pg_cron extension enabled:

1. **Set the cron secret first:**
   ```bash
   supabase secrets set CRON_SECRET=$(openssl rand -hex 32)
   ```

2. **Run the SQL file:**
   - Open Supabase Dashboard → SQL Editor
   - Run `ADD_RECURRING_BILLING_CRON.sql`
   - This will create scheduled jobs that run daily

**Note**: pg_cron might not be available on all Supabase plans. If you get an error, use Option 1 instead.

---

## Option 3: Manual Trigger (For Testing)

You can manually trigger recurring billing:

### Via Supabase Dashboard:
1. Go to Edge Functions
2. Click on `process-recurring-billing`
3. Click "Invoke"
4. Add header: `X-Cron-Secret: YOUR_SECRET`

### Via Terminal:
```bash
curl -X POST \
  -H "X-Cron-Secret: YOUR_CRON_SECRET" \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  https://zqcbldgheimqrnqmbbed.supabase.co/functions/v1/process-recurring-billing
```

---

## Verification

After setting up, you should see:
- ✅ Cron job runs daily
- ✅ Subscriptions due for payment are charged
- ✅ Payment records created in `platform_payments` table
- ✅ Subscription billing dates updated

## Monitoring

Check Edge Function logs in Supabase Dashboard:
1. Go to: Edge Functions → `process-recurring-billing`
2. View logs to see execution results
3. Check for any errors

---

## Troubleshooting

**Cron job not running?**
- Check cron service dashboard for errors
- Verify CRON_SECRET matches in both places
- Check Edge Function logs in Supabase

**Function returns 401?**
- Verify CRON_SECRET is set in Supabase secrets
- Check that header `X-Cron-Secret` matches

**Subscriptions not charging?**
- Check subscription `current_period_end` dates
- Verify payment gateway is connected
- Check Edge Function logs for payment errors

