# 🚀 Phase 1: Step-by-Step Setup Guide

**Follow these steps in order to complete Phase 1.**

---

## ✅ Step 1: Login to Supabase CLI

**If you're not logged in, run:**

```bash
cd "/Users/malikcampbell/NFG APP V3"
supabase login
```

This will open your browser to authenticate. After logging in, you'll be ready to proceed.

**Verify login:**
```bash
supabase projects list
```

You should see your projects listed.

---

## ✅ Step 2: Link to Your Supabase Project

**If you haven't linked your project yet:**

```bash
supabase link --project-ref YOUR_PROJECT_REF
```

**To find your Project Ref:**
1. Go to Supabase Dashboard
2. Look at the URL: `https://supabase.com/dashboard/project/YOUR_PROJECT_REF`
3. Copy the project ref (the part after `/project/`)

**Example:**
```bash
supabase link --project-ref zqcbldgheimqrnqmbbed
```

---

## ✅ Step 3: Create/Login to Stripe Account

1. Go to: **https://stripe.com**
2. Click **"Sign in"** (if you have an account) or **"Start now"** (if new)
3. Complete account setup if new:
   - Enter business information
   - Verify email
   - Complete basic business details

**✅ Checkpoint:** You're logged into Stripe Dashboard

---

## ✅ Step 4: Enable Stripe Connect & Find Client ID

1. In Stripe Dashboard, go to **Settings** → **Connect** (left sidebar)
2. Click **"Get Started"** or **"Enable Connect"** (if not already enabled)
3. Choose **"Standard accounts"** (recommended)
4. Complete the setup wizard
5. **Find your Client ID:**
   - After setup, stay on the **Settings → Connect** page
   - Scroll down to **"Connect platform settings"** section
   - Look for **"Client ID"** - it starts with `ca_...`
   - **Alternative location:** Developers → Connect (left sidebar)
   - Click the copy icon or manually copy it

**Still can't find it?** See `FIND_STRIPE_CLIENT_ID.md` for detailed help!

**✅ Checkpoint:** Stripe Connect enabled, Client ID copied

---

## ✅ Step 5: Get API Keys

1. In Stripe Dashboard, go to **Developers** → **API Keys**
2. **Use Test Mode** (switch at top right)
   - Test Mode = Safe testing, no real money
   - Live Mode = Real payments (use later for production)
   - **For development, use Test Mode** ✅
3. Find **"Publishable key"** (starts with `pk_test_...`)
   - Click "Reveal" if hidden
   - **Copy it** (you'll need it in Step 6)
4. Find **"Secret key"** (starts with `sk_test_...`)
   - Click "Reveal test key" if hidden
   - ⚠️ **Keep this secret!** Never share it publicly
   - **Copy it** (you'll need it in Step 6)

**Note:** Test Mode is for development/testing. You'll switch to Live Mode keys when going to production.

**✅ Checkpoint:** You have both API keys copied

---

## ✅ Step 6: Store Keys in Supabase

**Option A: Use the Setup Script (Easiest)**

```bash
cd "/Users/malikcampbell/NFG APP V3"
./setup-payment-gateways.sh
```

Choose option **1** (Stripe Connect), then paste your keys when prompted:
- Stripe Secret Key: `sk_test_...`
- Stripe Publishable Key: `pk_test_...`
- Stripe Connect Client ID: `ca_...`

**Option B: Manual Setup**

```bash
cd "/Users/malikcampbell/NFG APP V3"

# Replace with your actual keys
supabase secrets set STRIPE_PLATFORM_SECRET_KEY="sk_test_YOUR_SECRET_KEY"
supabase secrets set STRIPE_PLATFORM_PUBLISHABLE_KEY="pk_test_YOUR_PUBLISHABLE_KEY"
supabase secrets set STRIPE_CONNECT_CLIENT_ID="ca_YOUR_CLIENT_ID"
```

**✅ Checkpoint:** Secrets are stored in Supabase

---

## ✅ Step 7: Verify Setup

Run the verification script:

```bash
cd "/Users/malikcampbell/NFG APP V3"
./verify-phase1-setup.sh
```

**Expected output:**
```
✅ STRIPE_PLATFORM_SECRET_KEY - SET
✅ STRIPE_PLATFORM_PUBLISHABLE_KEY - SET
✅ STRIPE_CONNECT_CLIENT_ID - SET

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Phase 1: COMPLETE!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Or manually check:**
```bash
supabase secrets list | grep STRIPE
```

You should see all 3 Stripe secrets listed.

---

## ✅ Phase 1 Complete Checklist

- [ ] Logged into Supabase CLI
- [ ] Linked to Supabase project
- [ ] Logged into Stripe Dashboard
- [ ] Stripe Connect enabled
- [ ] Client ID obtained (`ca_...`)
- [ ] API keys obtained (Test mode)
- [ ] Secrets stored in Supabase
- [ ] Verification script passes

---

## 🎯 Next Steps

Once Phase 1 is complete:
- ✅ **Phase 2:** Database Schema Updates
- ✅ We'll create all payment tables
- ✅ Then build the UI

---

## 🆘 Need Help?

**"I can't find Connect in Settings"**
- Make sure you're in the main Stripe Dashboard
- Look for "Connect" under Settings in left sidebar
- You may need to complete business verification first

**"Secrets not saving"**
- Make sure you're logged in: `supabase login`
- Make sure you're linked: `supabase link --project-ref YOUR_REF`
- Check for typos in the secret names

**"Where's my Project Ref?"**
- Go to Supabase Dashboard
- Look at URL: `https://supabase.com/dashboard/project/YOUR_PROJECT_REF`
- Copy the part after `/project/`

---

**Ready? Start with Step 1!** 🚀
