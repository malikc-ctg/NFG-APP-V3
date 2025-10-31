# 📧 Resend Email Setup Guide

## 🚀 Quick Setup (5 Minutes)

### Step 1: Sign Up for Resend

1. Go to: **https://resend.com**
2. Click **"Sign Up"** (free account)
3. Verify your email
4. Complete setup

---

### Step 2: Get Your API Key

1. After logging in, go to **"API Keys"** in the left sidebar
2. Click **"Create API Key"**
3. Name it: `NFG App Production`
4. Select **"Full Access"** (or just "Send" permission)
5. Click **"Create"**
6. **COPY THE API KEY** - you'll only see it once!
   - Format: `re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

---

### Step 3: Verify Your Domain (IMPORTANT!)

**Option A: Use Resend's Test Domain (Quick Start)**
- Can send immediately using `onboarding@resend.dev`
- Limited to test emails only
- Good for testing

**Option B: Verify Your Own Domain (Production)**
1. Go to **"Domains"** in Resend dashboard
2. Click **"Add Domain"**
3. Enter: `northernfacilitiesgroup.ca` (or your domain)
4. Add DNS records to your domain:
   - **SPF Record**: Copy from Resend
   - **DKIM Record**: Copy from Resend
   - **DMARC Record**: Copy from Resend
5. Wait for verification (usually 5-10 minutes)
6. Once verified, you can use: `noreply@northernfacilitiesgroup.ca`

---

### Step 4: Configure Supabase Edge Function

**Option 1: Via Supabase Dashboard (Easiest)**
1. Go to your Supabase project dashboard
2. Navigate to **"Edge Functions"** → **"send-invitation-email"**
3. Click **"Settings"** → **"Secrets"**
4. Add new secret:
   - Key: `RESEND_API_KEY`
   - Value: Your Resend API key (starts with `re_`)
5. Add another secret (optional):
   - Key: `RESEND_FROM_EMAIL`
   - Value: `NFG <noreply@northernfacilitiesgroup.ca>` (or `onboarding@resend.dev` for testing)

**Option 2: Via Supabase CLI**
```bash
cd "/Users/malikcampbell/NFG APP V3"

# Set Resend API key
supabase secrets set RESEND_API_KEY="re_YOUR_API_KEY_HERE"

# Set from email (optional)
supabase secrets set RESEND_FROM_EMAIL="NFG <noreply@northernfacilitiesgroup.ca>"

# Redeploy the function
supabase functions deploy send-invitation-email
```

---

### Step 5: Redeploy Edge Function

```bash
cd "/Users/malikcampbell/NFG APP V3"
supabase functions deploy send-invitation-email
```

Or via Supabase Dashboard:
1. Go to **Edge Functions**
2. Click **"send-invitation-email"**
3. Click **"Redeploy"**

---

## ✅ Testing

1. Go to your NFG app Settings page
2. Click **"Invite User"**
3. Enter an email address
4. Click **"Send Invitation"**
5. Check the recipient's inbox (and spam folder)
6. Email should arrive within seconds! ✅

---

## 📊 Resend Dashboard

Monitor your emails:
- **Dashboard**: See send statistics
- **Logs**: View all sent emails
- **Deliveries**: Tentacled delivery status
- **Bounces**: See bounced emails
- **Analytics**: Open rates, clicks (if using)

---

## 🔧 Troubleshooting

### Email Not Sending?

1. **Check API Key:**
   - Make sure it's set correctly in Supabase secrets
   - Key should start with `re_`

2. **Check Domain:**
   - If using custom domain, ensure DNS records are verified
   - Try `onboarding@resend.dev` for quick testing

3. **Check Logs:**
   - Supabase Edge Function logs (in Supabase dashboard)
   - Resend dashboard → Logs (see API responses)

4. **Test API Key:**
   ```bash
   curl -X POST https://api.resend.com/emails \
     -H "Authorization: Bearer re_YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "from": "onboarding@resend.dev",
       "to": "your-email@example.com",
       "subject": "Test",
       "html": "<p>Test email</p>"
     }'
   ```

---

## 💰 Pricing

- **Free Tier**: 3,000 emails/month
- **Paid**: $20/month for 50,000 emails
- Perfect for NFG app usage!

---

## 🎉 That's It!

Your NFG app is now using Resend for all transactional emails!

**Much more reliable than ZeptoMail!** 🚀

