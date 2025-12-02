# 🚀 Phase 1: Quick Start Guide

**Goal:** Get Stripe Connect set up in 15 minutes

---

## ✅ Step-by-Step Instructions

### Step 1: Create/Login to Stripe Account (5 min)

1. Go to: https://stripe.com
2. Click "Sign in" or "Start now"
3. If new account:
   - Enter email and create password
   - Complete basic business info
   - Verify email
4. If existing account:
   - Just log in

**✅ Checkpoint:** You're logged into Stripe Dashboard

---

### Step 2: Enable Stripe Connect (3 min)

1. In Stripe Dashboard, go to **Settings** → **Connect** (left sidebar)
2. Click **"Get Started"** or **"Enable Connect"**
3. Choose **"Standard accounts"** (recommended)
4. Complete the setup wizard
5. **Important:** Note your **Client ID** (starts with `ca_...`)
   - You'll find it in Settings → Connect → Settings
   - Copy it now!

**✅ Checkpoint:** Stripe Connect is enabled, you have Client ID

---

### Step 3: Get API Keys (2 min)

1. In Stripe Dashboard, go to **Developers** → **API Keys**
2. **Toggle to Test Mode** (switch at top right - should say "Test mode")
3. Find **"Publishable key"** (starts with `pk_test_...`)
   - Click "Reveal" if hidden
   - Copy it
4. Find **"Secret key"** (starts with `sk_test_...`)
   - Click "Reveal test key" if hidden
   - ⚠️ **Keep this secret!** Never share it
   - Copy it

**✅ Checkpoint:** You have both API keys copied

---

### Step 4: Store Keys in Supabase (3 min)

**Option A: Use the Setup Script (Easiest)**

```bash
cd "/Users/malikcampbell/NFG APP V3"
./setup-payment-gateways.sh
```

Follow the prompts and paste your keys when asked.

**Option B: Manual Setup**

```bash
cd "/Users/malikcampbell/NFG APP V3"

# Set Stripe secrets (replace with your actual keys)
supabase secrets set STRIPE_PLATFORM_SECRET_KEY="sk_test_YOUR_SECRET_KEY"
supabase secrets set STRIPE_PLATFORM_PUBLISHABLE_KEY="pk_test_YOUR_PUBLISHABLE_KEY"
supabase secrets set STRIPE_CONNECT_CLIENT_ID="ca_YOUR_CLIENT_ID"
```

**✅ Checkpoint:** Secrets are stored in Supabase

---

### Step 5: Verify Setup (2 min)

```bash
# Check that secrets are set
supabase secrets list | grep STRIPE
```

You should see:
```
✅ STRIPE_PLATFORM_SECRET_KEY
✅ STRIPE_PLATFORM_PUBLISHABLE_KEY
✅ STRIPE_CONNECT_CLIENT_ID
```

**✅ Checkpoint:** All 3 secrets are set

---

## 🎯 Phase 1 Complete When:

- [x] Stripe account created/logged in
- [x] Stripe Connect enabled
- [x] Client ID obtained (`ca_...`)
- [x] API keys obtained (Test mode)
- [x] Secrets stored in Supabase
- [x] Secrets verified

---

## 🆘 Troubleshooting

### "I can't find Connect in Settings"
- Make sure you're logged into the main Stripe Dashboard
- Look for "Connect" in the left sidebar under Settings
- If not there, you may need to complete business verification first

### "I don't see API Keys"
- Go to Developers → API Keys
- Make sure you're in Test mode (toggle at top)
- Keys should be visible

### "Secrets not saving"
- Make sure you're logged into Supabase CLI: `supabase login`
- Make sure you're linked to your project: `supabase link --project-ref YOUR_REF`
- Try setting secrets again

### "Where do I find my Project Ref?"
- Go to Supabase Dashboard
- Look at the URL: `https://supabase.com/dashboard/project/YOUR_PROJECT_REF`
- Copy the project ref from the URL

---

## ✅ Next Steps

Once Phase 1 is complete:
- ✅ Move to **Phase 2: Database Schema**
- ✅ We'll create all payment tables
- ✅ Then build the UI

---

**Ready? Let's do this!** 🚀
