# 💳 Phase 1: Payment Gateway Platform Setup Guide

**Status:** In Progress  
**Goal:** Set up platform accounts for multiple payment gateways and store API keys securely

---

## 📋 Overview

This phase involves setting up your platform's payment gateway accounts (Stripe, PayPal, Square) so companies can connect their own accounts later. Most of this is manual account setup work.

**You can start with just Stripe** and add other gateways later.

---

## ✅ Quick Start (Stripe Only)

If you just want to get started with Stripe:

1. **Create Stripe Account** (if you don't have one)
   - Go to: https://stripe.com
   - Sign up for free account
   - Complete business verification (can do basic setup first)

2. **Enable Stripe Connect**
   - Dashboard → Settings → Connect
   - Click "Get Started" or "Enable Connect"
   - Choose "Standard" accounts (most common)

3. **Get Your API Keys**
   - Dashboard → Developers → API Keys
   - Copy your **Publishable key** (starts with `pk_test_...`)
   - Copy your **Secret key** (starts with `sk_test_...`)
   - **Toggle to "Test mode"** (switch at top of dashboard)

4. **Get Your Connect Client ID**
   - Dashboard → Settings → Connect → Settings
   - Under "Connect platform settings"
   - Copy your **Client ID** (starts with `ca_...`)

5. **Store Keys in Supabase Secrets**
   ```bash
   cd "/Users/malikcampbell/NFG APP V3"
   
   supabase secrets set STRIPE_PLATFORM_SECRET_KEY="sk_test_YOUR_KEY_HERE"
   supabase secrets set STRIPE_PLATFORM_PUBLISHABLE_KEY="pk_test_YOUR_KEY_HERE"
   supabase secrets set STRIPE_CONNECT_CLIENT_ID="ca_YOUR_CLIENT_ID_HERE"
   ```

6. **Verify Secrets**
   ```bash
   # Check secrets (they won't show values, just confirm they exist)
   supabase secrets list
   ```

✅ **That's it for Stripe!** You can now proceed to Phase 2.

---

## 🔧 Detailed Setup Instructions

### Option 1: Stripe Connect (Recommended First Gateway)

#### Step 1: Create Stripe Account

1. Go to https://stripe.com
2. Click "Start now" or "Sign up"
3. Enter your business information:
   - Business name
   - Email address
   - Country
   - Business type
4. Complete basic account setup
5. Verify your email address

#### Step 2: Enable Stripe Connect

1. Log into Stripe Dashboard
2. Go to **Settings** → **Connect** (in left sidebar)
3. Click **"Get Started"** or **"Enable Connect"**
4. Choose account type:
   - **Standard accounts** (recommended) - Full Stripe accounts for companies
   - **Express accounts** - Simplified accounts (easier onboarding)
5. For now, choose **Standard accounts**
6. Complete Connect setup wizard

#### Step 3: Configure Connect Settings

1. Still in **Settings** → **Connect**
2. Scroll to **"Connect platform settings"**
3. Note your **Client ID** (starts with `ca_...`) - you'll need this!
4. Set redirect URLs:
   - Development: `http://localhost:3000/auth/stripe/callback`
   - Production: `https://yourdomain.com/auth/stripe/callback`
   - (We'll set these up properly in Phase 3)

#### Step 4: Get API Keys

1. In Stripe Dashboard, go to **Developers** → **API Keys**
2. Make sure you're in **Test mode** (toggle at top right)
3. Find **Publishable key** (starts with `pk_test_...`)
   - This is safe to expose (used client-side)
   - Copy it
4. Find **Secret key** (starts with `sk_test_...`)
   - Click "Reveal test key" if hidden
   - ⚠️ **Keep this secret!** Never expose it publicly
   - Copy it

#### Step 5: Store Secrets in Supabase

Run these commands in Terminal:

```bash
cd "/Users/malikcampbell/NFG APP V3"

# Set Stripe secrets (replace with your actual keys)
supabase secrets set STRIPE_PLATFORM_SECRET_KEY="sk_test_YOUR_SECRET_KEY"
supabase secrets set STRIPE_PLATFORM_PUBLISHABLE_KEY="pk_test_YOUR_PUBLISHABLE_KEY"
supabase secrets set STRIPE_CONNECT_CLIENT_ID="ca_YOUR_CLIENT_ID"

# Verify secrets are set
supabase secrets list | grep STRIPE
```

**Expected output:**
```
✅ STRIPE_PLATFORM_SECRET_KEY (hidden)
✅ STRIPE_PLATFORM_PUBLISHABLE_KEY (hidden)
✅ STRIPE_CONNECT_CLIENT_ID (hidden)
```

---

### Option 2: PayPal Business (Optional - Add Later)

#### Step 1: Create PayPal Business Account

1. Go to https://www.paypal.com/business
2. Click "Get Started"
3. Sign up for PayPal Business account
4. Complete business verification

#### Step 2: Create PayPal App

1. Go to https://developer.paypal.com
2. Log in with your PayPal Business account
3. Go to **Dashboard** → **My Apps & Credentials**
4. Click **"Create App"**
5. Fill in:
   - App name: "NFG Facilities Platform"
   - Merchant: Your business account
6. Click **"Create App"**

#### Step 3: Get PayPal Credentials

1. After creating app, you'll see:
   - **Client ID**
   - **Secret** (click "Show" to reveal)
2. Copy both values

#### Step 4: Store PayPal Secrets

```bash
supabase secrets set PAYPAL_CLIENT_ID="YOUR_PAYPAL_CLIENT_ID"
supabase secrets set PAYPAL_CLIENT_SECRET="YOUR_PAYPAL_SECRET"
supabase secrets set PAYPAL_MODE="sandbox"  # Use "live" for production
```

---

### Option 3: Square Connect (Optional - Add Later)

#### Step 1: Create Square Developer Account

1. Go to https://developer.squareup.com
2. Click "Get Started"
3. Sign up for free developer account
4. Complete verification

#### Step 2: Create Square Application

1. In Square Developer Dashboard
2. Go to **Applications**
3. Click **"Create Application"**
4. Fill in:
   - Application name: "NFG Facilities Platform"
   - Product: Payments
5. Click **"Create Application"**

#### Step 3: Get Square Credentials

1. In your application settings
2. Find **Application ID**
3. Generate **Access Token** (sandbox or production)
4. Copy both values

#### Step 4: Store Square Secrets

```bash
supabase secrets set SQUARE_APPLICATION_ID="YOUR_APP_ID"
supabase secrets set SQUARE_ACCESS_TOKEN="YOUR_ACCESS_TOKEN"
supabase secrets set SQUARE_ENVIRONMENT="sandbox"  # Use "production" for production
```

---

## 🔍 Verify Your Setup

### Check Stripe Connection

1. **Test API Keys:**
   ```bash
   # Test Stripe API connection (optional)
   curl https://api.stripe.com/v1/charges \
     -u sk_test_YOUR_SECRET_KEY: \
     -d "amount=100" \
     -d "currency=usd"
   ```
   (This will fail with "missing payment method" but confirms API key works)

2. **Check Connect Settings:**
   - Go to Stripe Dashboard → Settings → Connect
   - Verify Client ID is visible
   - Verify Connect is enabled

### Check Supabase Secrets

```bash
# List all Stripe secrets
supabase secrets list | grep STRIPE

# Should show:
# ✅ STRIPE_PLATFORM_SECRET_KEY
# ✅ STRIPE_PLATFORM_PUBLISHABLE_KEY
# ✅ STRIPE_CONNECT_CLIENT_ID
```

---

## 📝 Complete Secrets Checklist

**Required for Stripe:**
- [ ] `STRIPE_PLATFORM_SECRET_KEY` - Your Stripe secret key (`sk_test_...`)
- [ ] `STRIPE_PLATFORM_PUBLISHABLE_KEY` - Your Stripe publishable key (`pk_test_...`)
- [ ] `STRIPE_CONNECT_CLIENT_ID` - Your Stripe Connect Client ID (`ca_...`)

**Optional - PayPal (add later):**
- [ ] `PAYPAL_CLIENT_ID` - PayPal Client ID
- [ ] `PAYPAL_CLIENT_SECRET` - PayPal Secret
- [ ] `PAYPAL_MODE` - "sandbox" or "live"

**Optional - Square (add later):**
- [ ] `SQUARE_APPLICATION_ID` - Square Application ID
- [ ] `SQUARE_ACCESS_TOKEN` - Square Access Token
- [ ] `SQUARE_ENVIRONMENT` - "sandbox" or "production"

---

## 🎯 Next Steps

Once you have at least Stripe set up:

1. ✅ **Phase 1 Complete** - You have platform accounts configured
2. ➡️ **Move to Phase 2** - Database schema updates
3. ➡️ **Then Phase 3** - UI for companies to connect their accounts

---

## 🔐 Security Notes

### Test vs Live Keys

- **Test Mode (Sandbox):**
  - Use `pk_test_...` and `sk_test_...` keys
  - Perfect for development and testing
  - No real money processed
  - Use test card numbers (e.g., 4242 4242 4242 4242)

- **Live Mode (Production):**
  - Use `pk_live_...` and `sk_live_...` keys
  - Real money processed
  - Only use when ready for production
  - Requires completed business verification

**Recommendation:** Start with Test mode, switch to Live when ready.

### Secret Key Security

- ⚠️ **Never commit secret keys to Git**
- ⚠️ **Never expose secret keys in client-side code**
- ⚠️ **Only use Supabase secrets or environment variables**
- ✅ **Publishable keys are safe to expose** (used client-side)

---

## 🆘 Troubleshooting

### "Invalid API Key" Error

- Check that you copied the full key (no spaces before/after)
- Verify you're using test keys for test mode
- Make sure keys match your Stripe account

### "Connect Client ID Not Found"

- Go to Stripe Dashboard → Settings → Connect
- Verify Connect is enabled
- Copy the Client ID again (should start with `ca_`)

### "Secrets Not Showing in Supabase"

1. Make sure you're logged into Supabase CLI:
   ```bash
   supabase login
   ```

2. Link to your project:
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```

3. Set secrets again

---

## 📚 Resources

- **Stripe Connect Docs:** https://stripe.com/docs/connect
- **Stripe Dashboard:** https://dashboard.stripe.com
- **PayPal Developer:** https://developer.paypal.com
- **Square Developer:** https://developer.squareup.com
- **Supabase Secrets:** https://supabase.com/docs/guides/functions/secrets

---

**Ready for Phase 2?** Once you have Stripe secrets set, we'll update the database schema! 🚀
