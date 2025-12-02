# 🚀 Payment Gateway Onboarding Flows

**Problem:** Companies may not have Stripe/PayPal/Square accounts when they sign up.

**Solution:** Multiple onboarding options to handle all scenarios.

---

## 🎯 Onboarding Options

### Option 1: Stripe Express Accounts (Recommended - Auto-Create)

**Best for:** Companies that don't have Stripe accounts yet

**How it works:**
1. Company clicks "Connect Stripe" in settings
2. Platform generates Stripe Express account link
3. Company redirected to Stripe onboarding page
4. Company enters:
   - Business name
   - Email
   - Business type
   - Bank account (for payouts)
5. Stripe **automatically creates account**
6. Company completes verification (if needed)
7. Company redirected back to platform
8. Account connected ✅

**Benefits:**
- ✅ **No pre-existing account needed**
- ✅ Stripe handles account creation
- ✅ Takes 5-10 minutes
- ✅ Simplified onboarding (Express accounts)
- ✅ Automatic account activation

**Implementation:**
```javascript
// Generate Stripe Express account link
const accountLink = await stripe.accountLinks.create({
  account: accountId, // Stripe creates this
  refresh_url: 'https://yourapp.com/settings/payment?refresh=true',
  return_url: 'https://yourapp.com/settings/payment?success=true',
  type: 'account_onboarding', // Creates new account
});
```

---

### Option 2: Standard Stripe Account (Existing Account)

**Best for:** Companies that already have Stripe accounts

**How it works:**
1. Company clicks "Connect Stripe" in settings
2. Platform generates OAuth link
3. Company redirected to Stripe login
4. Company logs into existing Stripe account
5. Company authorizes connection
6. Company redirected back to platform
7. Account connected ✅

**Benefits:**
- ✅ Use existing Stripe account
- ✅ Full account features (not Express)
- ✅ Company already familiar with Stripe

**Implementation:**
```javascript
// Generate OAuth link for existing account
const oauthLink = `https://connect.stripe.com/oauth/authorize?response_type=code&client_id=${CLIENT_ID}&scope=read_write&redirect_uri=${REDIRECT_URI}`;
```

---

### Option 3: Guided Account Creation

**Best for:** Companies that want full control

**How it works:**
1. Company clicks "Connect Stripe"
2. Platform detects no account
3. Shows message: "Create Stripe account first"
4. Provides link to Stripe signup (with referral)
5. Company creates account on Stripe.com
6. Company returns to platform
7. Connect existing account (Option 2)

**Benefits:**
- ✅ Company has full control
- ✅ Can use existing account if they have one
- ✅ Standard account (more features)

**UI Flow:**
```
┌─────────────────────────────────────────┐
│ Connect Stripe Account                  │
├─────────────────────────────────────────┤
│                                         │
│ Don't have a Stripe account?           │
│                                         │
│ 1. Create account at stripe.com        │
│    [Create Stripe Account]              │
│                                         │
│ 2. Return here to connect              │
│                                         │
│ ─────────────────────────────────────── │
│                                         │
│ Already have an account?               │
│                                         │
│ [Connect Existing Account]              │
│                                         │
└─────────────────────────────────────────┘
```

---

### Option 4: PayPal/Square Onboarding

**Best for:** Companies that prefer PayPal or Square

**PayPal Flow:**
1. Company clicks "Connect PayPal"
2. Platform generates PayPal OAuth link
3. Company redirected to PayPal login
4. Company logs in (or creates account)
5. Company authorizes connection
6. Account connected ✅

**Square Flow:**
1. Company clicks "Connect Square"
2. Platform generates Square OAuth link
3. Company redirected to Square login
4. Company logs in (or creates account)
5. Company authorizes connection
6. Account connected ✅

**Benefits:**
- ✅ More options for companies
- ✅ Some companies already have these accounts
- ✅ Flexibility

---

### Option 5: Manual Payments (No Account Needed)

**Best for:** Companies that don't want online payments

**How it works:**
1. Company clicks "Payment Settings"
2. Sees options: Stripe, PayPal, Square, **Manual**
3. Company selects "Manual Payments"
4. No account creation needed
5. Works immediately ✅

**Benefits:**
- ✅ **Zero setup required**
- ✅ No account creation
- ✅ Works for both directions:
  - Company pays platform (check/bank transfer)
  - Company receives from clients (manual recording)

**UI Flow:**
```
┌─────────────────────────────────────────┐
│ Payment Method                           │
├─────────────────────────────────────────┤
│                                         │
│ ⚪ Stripe (Online payments)             │
│    [Connect Stripe Account]             │
│                                         │
│ ⚪ PayPal (Online payments)              │
│    [Connect PayPal Account]             │
│                                         │
│ ⚪ Square (Online payments)              │
│    [Connect Square Account]             │
│                                         │
│ ✅ Manual Payments (No account needed)  │
│    Cash, Check, Bank Transfer           │
│    [Select Manual]                      │
│                                         │
└─────────────────────────────────────────┘
```

---

## 🎨 Recommended UI Flow

### Step 1: Payment Settings Page

```
┌─────────────────────────────────────────┐
│ Payment Gateway Settings                │
├─────────────────────────────────────────┤
│                                         │
│ Choose how you want to handle payments: │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ ✅ Stripe Express                   │ │
│ │    Auto-create account (5 min)     │ │
│ │    [Connect with Stripe Express]   │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ ⚪ Stripe Standard                   │ │
│ │    Use existing account             │ │
│ │    [Connect Existing Account]       │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ ⚪ PayPal                             │ │
│ │    Connect PayPal Business          │ │
│ │    [Connect PayPal]                 │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ ⚪ Square                             │ │
│ │    Connect Square account            │ │
│ │    [Connect Square]                  │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ ⚪ Manual Payments                   │ │
│ │    No account needed                 │ │
│ │    [Select Manual]                  │ │
│ └─────────────────────────────────────┘ │
│                                         │
└─────────────────────────────────────────┘
```

### Step 2: Stripe Express Onboarding

```
┌─────────────────────────────────────────┐
│ Setting up your Stripe account...       │
├─────────────────────────────────────────┤
│                                         │
│ You'll be redirected to Stripe to:     │
│                                         │
│ 1. Enter business information           │
│ 2. Add bank account (for payouts)       │
│ 3. Complete verification                │
│                                         │
│ This takes about 5-10 minutes.         │
│                                         │
│ [Continue to Stripe]                    │
│                                         │
└─────────────────────────────────────────┘
```

### Step 3: After Connection

```
┌─────────────────────────────────────────┐
│ ✅ Stripe Account Connected!             │
├─────────────────────────────────────────┤
│                                         │
│ Account Status: Active                   │
│ Account ID: acct_1234567890             │
│                                         │
│ You can now:                            │
│ ✅ Receive payments from clients         │
│ ✅ Pay platform subscription             │
│                                         │
│ [Open Stripe Dashboard]                 │
│ [Disconnect Account]                    │
│                                         │
└─────────────────────────────────────────┘
```

---

## 🔧 Implementation Details

### Stripe Express Account Creation

```javascript
// 1. Create Express account
const account = await stripe.accounts.create({
  type: 'express',
  country: 'US',
  email: companyEmail,
  capabilities: {
    card_payments: { requested: true },
    transfers: { requested: true },
  },
});

// 2. Generate onboarding link
const accountLink = await stripe.accountLinks.create({
  account: account.id,
  refresh_url: `${BASE_URL}/settings/payment?refresh=true`,
  return_url: `${BASE_URL}/settings/payment?success=true`,
  type: 'account_onboarding',
});

// 3. Redirect company to accountLink.url
```

### Handle OAuth Callback

```javascript
// After company completes onboarding
app.get('/auth/stripe/callback', async (req, res) => {
  const { code, state } = req.query;
  
  // Exchange code for account ID
  const response = await stripe.oauth.token({
    grant_type: 'authorization_code',
    code: code,
  });
  
  const accountId = response.stripe_user_id;
  
  // Store account ID in database
  await updateCompanyPaymentGateway(companyId, {
    gateway: 'stripe',
    account_id: accountId,
    connected: true,
  });
  
  res.redirect('/settings/payment?success=true');
});
```

---

## 📋 Decision Tree

```
Company wants to connect payment gateway
    ↓
Does company have Stripe account?
    ├── YES → Connect existing account (OAuth)
    └── NO → Create Express account (Auto-create)
         ↓
    Company completes onboarding
         ↓
    Account connected ✅
```

---

## ✅ Best Practice: Default to Express

**Recommendation:** Default to Stripe Express for new companies

**Why:**
- ✅ Simplest for companies (no pre-existing account needed)
- ✅ Fastest onboarding (5-10 minutes)
- ✅ Stripe handles account creation
- ✅ Companies can upgrade to Standard later if needed

**Flow:**
1. Company clicks "Connect Stripe"
2. Platform automatically creates Express account
3. Company completes onboarding
4. Account ready to use

---

## 🆘 Fallback: Manual Payments

**Always available as fallback:**

- Company doesn't want to create account → Manual payments
- Company can't complete verification → Manual payments
- Company prefers traditional methods → Manual payments
- Account connection fails → Manual payments

**Manual payments work for:**
- ✅ Company paying platform (check/bank transfer)
- ✅ Company receiving from clients (manual recording)

---

## 📚 Resources

- **Stripe Express Accounts:** https://stripe.com/docs/connect/express-accounts
- **Stripe OAuth:** https://stripe.com/docs/connect/oauth-accounts
- **PayPal OAuth:** https://developer.paypal.com/docs/api-basics/manage-apps/
- **Square OAuth:** https://developer.squareup.com/docs/oauth-api/overview

---

**Summary:** Companies don't need existing accounts! Stripe Express can create accounts automatically, or companies can choose manual payments. 🚀
