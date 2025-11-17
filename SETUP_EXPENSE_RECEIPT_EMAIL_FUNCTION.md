# 📧 Setup Expense Receipt Email Edge Function

## Quick Setup Guide

This guide will help you deploy the `send-expense-receipt-email` Edge Function to Supabase.

---

## Prerequisites

- ✅ Supabase project: `zqcbldgheimqrnqmbbed`
- ✅ Resend account (same as purchase order emails)
- ✅ Supabase CLI installed

---

## Step 1: Check if Supabase CLI is Installed

Open Terminal and run:

```bash
supabase --version
```

**If not installed**, install it:

```bash
# macOS
brew install supabase/tap/supabase

# Or via npm (any OS)
npm install -g supabase
```

---

## Step 2: Login to Supabase

```bash
supabase login
```

This will open your browser to authenticate. Click "Authorize" in the browser.

---

## Step 3: Link Your Project

```bash
supabase link --project-ref zqcbldgheimqrnqmbbed
```

Enter your database password when prompted (the one you use to access Supabase dashboard).

---

## Step 4: Set Environment Variables (Secrets)

You need to set the Resend API key (same one used for purchase orders):

```bash
# Set your Resend API key
supabase secrets set RESEND_API_KEY=re_your_api_key_here

# Set your "from" email address
supabase secrets set RESEND_FROM_EMAIL="NFG <noreply@northernfacilitiesgroup.ca>"
```

**To get your Resend API key:**
1. Go to https://resend.com
2. Login to your account
3. Go to **API Keys** in the dashboard
4. Copy an existing key (starts with `re_`) or create a new one

**Note:** If you already set these secrets for purchase order emails, you can skip this step. The secrets are shared across all Edge Functions.

---

## Step 5: Verify Secrets (Optional)

Check that your secrets are set:

```bash
supabase secrets list
```

You should see:
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`

---

## Step 6: Deploy the Function

Navigate to your project directory and deploy:

```bash
cd "/Users/malikcampbell/NFG APP V3"
supabase functions deploy send-expense-receipt-email
```

**Expected Output:**
```
✓ Deploying function send-expense-receipt-email...
✓ Function deployed successfully
Function URL: https://zqcbldgheimqrnqmbbed.supabase.co/functions/v1/send-expense-receipt-email
```

---

## Step 7: Test the Function

1. Go to your app: Reports → Expenses tab
2. Click "Add Expense"
3. Fill in the form and upload a receipt
4. Submit the expense
5. Check your email inbox for the receipt!

---

## Troubleshooting

### "Command not found: supabase"
- Install Supabase CLI (see Step 1)

### "Not logged in"
- Run `supabase login` again

### "Project not linked"
- Run `supabase link --project-ref zqcbldgheimqrnqmbbed` again

### "Secrets not set"
- Run the `supabase secrets set` commands from Step 4
- Verify with `supabase secrets list`

### "Function deployment failed"
- Make sure you're in the correct directory: `/Users/malikcampbell/NFG APP V3`
- Check that the file exists: `supabase/functions/send-expense-receipt-email/index.ts`

### "Email not sending"
- Check Resend dashboard → Logs for errors
- Verify your API key is correct (starts with `re_`)
- Make sure your "from" email domain is verified in Resend
- Check browser console for errors when submitting expense

### "Email goes to spam"
- Verify your domain in Resend (add DNS records)
- Use a custom domain (not @gmail.com or @resend.dev)

---

## View Function Logs

To see what's happening with the function:

```bash
supabase functions logs send-expense-receipt-email
```

Or view in Supabase Dashboard:
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **Edge Functions**
4. Click on `send-expense-receipt-email`
5. Click **Logs** tab

---

## Alternative: Deploy via Supabase Dashboard

If the CLI doesn't work, you can deploy via the dashboard:

1. Go to https://supabase.com/dashboard
2. Select your project (`zqcbldgheimqrnqmbbed`)
3. Go to **Edge Functions** in the left sidebar
4. Click **Create Function**
5. Name it: `send-expense-receipt-email`
6. Paste the code from `supabase/functions/send-expense-receipt-email/index.ts`
7. Set secrets in **Settings → Secrets**:
   - `RESEND_API_KEY` = your Resend API key
   - `RESEND_FROM_EMAIL` = `NFG <noreply@northernfacilitiesgroup.ca>`
8. Click **Deploy**

---

## Quick Command Reference

```bash
# Login
supabase login

# Link project
supabase link --project-ref zqcbldgheimqrnqmbbed

# Set secrets (if not already set)
supabase secrets set RESEND_API_KEY=re_your_key_here
supabase secrets set RESEND_FROM_EMAIL="NFG <noreply@northernfacilitiesgroup.ca>"

# Deploy function
cd "/Users/malikcampbell/NFG APP V3"
supabase functions deploy send-expense-receipt-email

# View logs
supabase functions logs send-expense-receipt-email

# List secrets
supabase secrets list
```

---

## What This Function Does

1. Receives expense data and receipt file (base64)
2. Sends an email to the user who created the expense
3. Attaches the receipt file to the email
4. Returns success/error status

**Email includes:**
- Expense description, amount, category, date
- Job/Site information (if linked)
- Vendor name and notes (if provided)
- Receipt attached as PDF/image

---

**Need Help?**
- Supabase docs: https://supabase.com/docs/guides/functions
- Resend docs: https://resend.com/docs
- Resend dashboard: https://resend.com/emails (to check email logs)

