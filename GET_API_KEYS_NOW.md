# 🔑 Get Your Stripe API Keys (Quick Guide)

**You already have:**
- ✅ Client ID: `ca_TVb7FHd0Ww04yIY4wMjFt7GPDdUdKbko`

**Now get these 2 keys:**

---

## 📍 Step 1: Go to API Keys Page

1. In Stripe Dashboard, click **"Developers"** (left sidebar, bottom)
2. Click **"API Keys"** (under Developers)
3. **Make sure you're in Test Mode** (toggle at top right should say "Test mode")

---

## 📍 Step 2: Copy Your Keys

### Key 1: Publishable Key
- Find **"Publishable key"** (starts with `pk_test_...`)
- Click "Reveal" if hidden
- **Copy it**

### Key 2: Secret Key  
- Find **"Secret key"** (starts with `sk_test_...`)
- Click "Reveal test key" if hidden
- ⚠️ **Keep this secret!**
- **Copy it**

---

## 📍 Step 3: Store All Keys

**Run this script:**
```bash
cd "/Users/malikcampbell/NFG APP V3"
./store-stripe-keys-now.sh
```

**It will:**
- ✅ Use your Client ID automatically
- ✅ Ask for your API keys
- ✅ Store all 3 secrets in Supabase
- ✅ Verify everything is set

---

## ✅ Quick Checklist

- [ ] Go to Developers → API Keys
- [ ] Toggle to Test Mode
- [ ] Copy Publishable Key (`pk_test_...`)
- [ ] Copy Secret Key (`sk_test_...`)
- [ ] Run: `./store-stripe-keys-now.sh`
- [ ] Paste keys when prompted
- [ ] Verify all 3 secrets are set

---

**Once done, Phase 1 is complete!** 🎉
