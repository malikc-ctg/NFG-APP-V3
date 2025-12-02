# ✅ Phase 1: Complete Checklist

**Follow this checklist to finish Phase 1:**

---

## 📋 Step-by-Step Checklist

### ✅ Step 1: Login to Supabase CLI
- [ ] Run: `supabase login`
- [ ] Verify: `supabase projects list` shows your projects

### ✅ Step 2: Link Your Project
- [ ] Run: `supabase link --project-ref YOUR_PROJECT_REF`
- [ ] Enter database password when prompted
- [ ] Verify link worked

### ✅ Step 3: Stripe Account
- [ ] Logged into Stripe Dashboard
- [ ] Account created/verified

### ✅ Step 4: Enable Stripe Connect
- [ ] Go to: Settings → Connect
- [ ] Click "Get Started" or "Enable Connect"
- [ ] Choose "Standard accounts"
- [ ] Complete setup wizard

### ✅ Step 5: Find Client ID
- [ ] Still in Settings → Connect
- [ ] Scroll to "Connect platform settings"
- [ ] Copy Client ID (starts with `ca_...`)
- [ ] **OR** try: Developers → Connect

**Still can't find it?** See `FIND_CLIENT_ID_EXACT_STEPS.md`

### ✅ Step 6: Get API Keys
- [ ] Go to: Developers → API Keys
- [ ] Toggle to **Test Mode** (top right)
- [ ] Copy **Publishable key** (`pk_test_...`)
- [ ] Copy **Secret key** (`sk_test_...`)

### ✅ Step 7: Store Secrets in Supabase

**Option A: Use Setup Script**
```bash
cd "/Users/malikcampbell/NFG APP V3"
./setup-payment-gateways.sh
```
Choose option 1 (Stripe), paste your keys

**Option B: Manual**
```bash
supabase secrets set STRIPE_PLATFORM_SECRET_KEY="sk_test_..."
supabase secrets set STRIPE_PLATFORM_PUBLISHABLE_KEY="pk_test_..."
supabase secrets set STRIPE_CONNECT_CLIENT_ID="ca_..."
```

### ✅ Step 8: Verify Setup
```bash
./verify-phase1-setup.sh
```

**Expected:**
```
✅ STRIPE_PLATFORM_SECRET_KEY - SET
✅ STRIPE_PLATFORM_PUBLISHABLE_KEY - SET
✅ STRIPE_CONNECT_CLIENT_ID - SET

✅ Phase 1: COMPLETE!
```

---

## 🎯 Phase 1 Complete When:

- [x] All 3 secrets are set
- [x] Verification script passes
- [x] Ready for Phase 2

---

## 🆘 Need Help Finding Client ID?

**Common locations:**
1. Settings → Connect → Scroll to "Connect platform settings"
2. Developers → Connect
3. After enabling Connect, refresh the page

**Format:** `ca_1234567890abcdefghijklmnopqrstuvwxyz`

**If you still can't find it:**
- Make sure Connect is enabled
- Complete the setup wizard
- Try refreshing the page
- Check both Settings → Connect and Developers → Connect

---

**Once all checkboxes are done, Phase 1 is complete!** ✅
