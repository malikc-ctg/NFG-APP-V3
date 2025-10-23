# 📧 Deploy Email Function to Supabase

This guide will help you deploy the beautiful email template to Supabase Edge Functions with ZeptoMail.

## Prerequisites

- ✅ Supabase project set up
- ✅ ZeptoMail account connected
- ✅ Supabase CLI installed

## Step 1: Install Supabase CLI (if not installed)

```bash
# macOS
brew install supabase/tap/supabase

# Windows (PowerShell)
scoop install supabase

# npm (any OS)
npm install -g supabase
```

## Step 2: Login to Supabase

```bash
supabase login
```

This will open your browser to authenticate.

## Step 3: Link Your Project

```bash
supabase link --project-ref zqcbldgheimqrnqmbbed
```

Enter your database password when prompted.

## Step 4: Set Environment Variables (Secrets)

You need to set these secrets in Supabase:

```bash
# Set your ZeptoMail API key
supabase secrets set ZEPTO_MAIL_KEY=your_zepto_mail_api_key_here

# Set your "from" email address
supabase secrets set ZOHO_FROM_EMAIL=noreply@northernfacilitiesgroup.ca

# Optional: Set custom "from" name
supabase secrets set ZEPTO_FROM_NAME="NFG Facilities"
```

**To get your ZeptoMail API key:**
1. Go to https://www.zoho.com/zeptomail/
2. Login to your account
3. Go to Settings → API Keys
4. Copy your API key

## Step 5: Deploy the Function

```bash
cd "NFG APP V3"
supabase functions deploy send-invitation-email
```

You should see output like:
```
✓ Deploying function send-invitation-email...
✓ Function deployed successfully
Function URL: https://zqcbldgheimqrnqmbbed.supabase.co/functions/v1/send-invitation-email
```

## Step 6: Test the Email

You can test the email by sending an invitation from your app:
1. Go to Settings → User Management
2. Click "Invite User"
3. Enter an email and select a role
4. Send the invitation
5. Check the recipient's inbox for the beautiful email! ✨

## Email Template Features

✅ **Professional Design**
- Clean, modern layout
- NFG branded colors and logo
- Responsive (looks great on mobile)
- Works in all email clients (Gmail, Outlook, Apple Mail, etc.)

✅ **Dynamic Content**
- Shows inviter's email
- Displays role with custom badge
- Role-specific permissions list
- Expiration warning (7 days)

✅ **User-Friendly**
- Large, clear CTA button
- Fallback link if button doesn't work
- Important notices highlighted
- Professional footer

## Troubleshooting

### "Function not found"
- Make sure you're in the correct directory
- Run `supabase link` again

### "Secrets not set"
- Run the `supabase secrets set` commands again
- Verify with `supabase secrets list`

### "Email not sending"
- Check your ZeptoMail dashboard for errors
- Verify your API key is correct
- Make sure your "from" email is verified in ZeptoMail

### "Email goes to spam"
- Configure SPF and DKIM records in ZeptoMail
- Add your domain to ZeptoMail's verified domains
- Use a custom domain (not @gmail.com)

## Alternative: Deploy via Supabase Dashboard

If the CLI doesn't work, you can deploy via the dashboard:

1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **Edge Functions**
4. Click **Create Function**
5. Name it `send-invitation-email`
6. Paste the code from `supabase/functions/send-invitation-email/index.ts`
7. Set secrets in **Edge Functions → Settings → Secrets**
8. Deploy

---

**Need Help?** Check the Supabase docs: https://supabase.com/docs/guides/functions

