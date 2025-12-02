# 🔍 How to Find Your Stripe Connect Client ID

**The Client ID can be tricky to find. Here's exactly where to look:**

---

## 📍 Method 1: Settings → Connect (Easiest)

1. **Log into Stripe Dashboard:** https://dashboard.stripe.com
2. **Click "Settings"** in the left sidebar
3. **Click "Connect"** (under Settings)
4. **Look for "Connect platform settings"** section
5. **Find "Client ID"** - it starts with `ca_...`
6. **Click the copy icon** next to it, or manually copy it

**Visual Guide:**
```
Stripe Dashboard
├── Settings (left sidebar)
    └── Connect
        └── Connect platform settings
            └── Client ID: ca_xxxxxxxxxxxxx ← HERE!
```

---

## 📍 Method 2: Developers → Connect (Alternative)

1. **Log into Stripe Dashboard**
2. **Click "Developers"** in the left sidebar
3. **Click "Connect"** (under Developers)
4. **Look for "Client ID"** in the overview section
5. **Copy it** (starts with `ca_...`)

---

## 📍 Method 3: If Connect Isn't Enabled Yet

**If you don't see "Connect" in Settings:**

1. **Go to Settings → Connect**
2. **Click "Get Started"** or **"Enable Connect"**
3. **Choose "Standard accounts"**
4. **Complete the setup wizard**
5. **After setup, the Client ID will appear**

**Note:** You must complete the Connect setup wizard first!

---

## 🔍 What the Client ID Looks Like

**Format:** `ca_` followed by a long string

**Example:**
```
ca_1234567890abcdefghijklmnopqrstuvwxyz
```

**Length:** Usually 30-40 characters after `ca_`

---

## ⚠️ Common Issues

### "I don't see Connect in Settings"

**Solution:**
- Make sure you're logged into the **main Stripe Dashboard** (not a connected account)
- Look for "Connect" under Settings in the left sidebar
- If it's not there, you may need to enable it first (see Method 3)

### "I see Connect but no Client ID"

**Solution:**
- Make sure you've completed the Connect setup wizard
- Try refreshing the page
- Check if you're in the right account (platform account, not connected account)

### "I see a different ID format"

**Solution:**
- Make sure it starts with `ca_` (not `sk_` or `pk_`)
- The Client ID is different from API keys
- It's specifically for Connect OAuth

---

## 🎯 Quick Checklist

- [ ] Logged into Stripe Dashboard
- [ ] Navigated to Settings → Connect
- [ ] Completed Connect setup (if not done)
- [ ] Found "Connect platform settings" section
- [ ] Located Client ID (starts with `ca_`)
- [ ] Copied the Client ID

---

## 📸 Where to Look (Step-by-Step)

1. **Dashboard Home** → Click **"Settings"** (left sidebar, near bottom)
2. **Settings Page** → Click **"Connect"** (in the list)
3. **Connect Page** → Scroll down to **"Connect platform settings"**
4. **Client ID** → Should be visible, starts with `ca_`

**If you still can't find it:**
- Make sure Connect is enabled (complete setup wizard)
- Try Method 2 (Developers → Connect)
- Contact Stripe support if needed

---

## ✅ Once You Have It

**The Client ID should look like:**
```
ca_1234567890abcdefghijklmnopqrstuvwxyz
```

**Store it in Supabase:**
```bash
supabase secrets set STRIPE_CONNECT_CLIENT_ID="ca_YOUR_CLIENT_ID_HERE"
```

---

**Still having trouble?** Let me know what you see in your Stripe Dashboard and I'll help you find it!
