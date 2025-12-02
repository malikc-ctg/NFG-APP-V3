# ✅ Phase 1: Payment Gateway Platform Setup - Checklist

Use this checklist to track your progress through Phase 1.

---

## 🎯 Goal

Set up platform accounts for payment gateways and store API keys securely in Supabase.

---

## 📋 Stripe Connect Setup (Recommended First)

### Account Setup
- [ ] Create Stripe account (https://stripe.com)
- [ ] Complete business verification (basic info is fine for now)
- [ ] Enable Stripe Connect in dashboard
- [ ] Choose "Standard" account type
- [ ] Note your Client ID (`ca_...`)

### Get API Keys
- [ ] Go to Developers → API Keys
- [ ] Toggle to **Test Mode**
- [ ] Copy **Publishable key** (`pk_test_...`)
- [ ] Copy **Secret key** (`sk_test_...`)
- [ ] Copy **Connect Client ID** (`ca_...`)

### Store in Supabase
- [ ] Run setup script: `./setup-payment-gateways.sh`
- [ ] Or manually set secrets:
  ```bash
  supabase secrets set STRIPE_PLATFORM_SECRET_KEY="sk_test_..."
  supabase secrets set STRIPE_PLATFORM_PUBLISHABLE_KEY="pk_test_..."
  supabase secrets set STRIPE_CONNECT_CLIENT_ID="ca_..."
  ```

### Verify
- [ ] Run: `supabase secrets list | grep STRIPE`
- [ ] See all 3 Stripe secrets listed ✅

---

## 📋 PayPal Business Setup (Optional - Add Later)

### Account Setup
- [ ] Create PayPal Business account
- [ ] Complete business verification
- [ ] Go to PayPal Developer Dashboard
- [ ] Create new application
- [ ] Get Client ID and Secret

### Store in Supabase
- [ ] `supabase secrets set PAYPAL_CLIENT_ID="..."`
- [ ] `supabase secrets set PAYPAL_CLIENT_SECRET="..."`
- [ ] `supabase secrets set PAYPAL_MODE="sandbox"`

### Verify
- [ ] Run: `supabase secrets list | grep PAYPAL`
- [ ] See all 3 PayPal secrets listed ✅

---

## 📋 Square Connect Setup (Optional - Add Later)

### Account Setup
- [ ] Create Square Developer account
- [ ] Create new application
- [ ] Get Application ID and Access Token

### Store in Supabase
- [ ] `supabase secrets set SQUARE_APPLICATION_ID="..."`
- [ ] `supabase secrets set SQUARE_ACCESS_TOKEN="..."`
- [ ] `supabase secrets set SQUARE_ENVIRONMENT="sandbox"`

### Verify
- [ ] Run: `supabase secrets list | grep SQUARE`
- [ ] See all 3 Square secrets listed ✅

---

## ✅ Phase 1 Complete When:

- [x] At least Stripe secrets are configured
- [x] Secrets are stored in Supabase
- [x] Secrets verified with `supabase secrets list`

**Minimum requirement:** Stripe Connect setup is complete  
**Optional:** PayPal and Square can be added later

---

## ➡️ Next Step

Once Phase 1 is complete, proceed to **Phase 2: Database Schema Updates**

---

## 📚 Resources

- **Detailed Setup Guide:** `PAYMENT_GATEWAY_SETUP_PHASE1.md`
- **Setup Script:** `./setup-payment-gateways.sh`
- **Stripe Dashboard:** https://dashboard.stripe.com
- **Stripe Connect Docs:** https://stripe.com/docs/connect

---

**Status:** ⏳ In Progress  
**Started:** [Date]  
**Completed:** [Date]
