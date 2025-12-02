# 🏦 Bank Account Linking Options

**Question:** Can companies link their bank accounts directly (not just through Stripe/PayPal/Square)?

**Answer:** Yes! Multiple options available.

---

## 🎯 Bank Account Linking Use Cases

### 1. Company Pays Platform (Direct Bank Transfer)
- Company links bank account
- Platform charges company's bank account directly (ACH)
- Lower fees than credit cards
- Recurring subscription payments

### 2. Company Receives Payments (Direct Bank Deposit)
- Company links bank account
- Clients pay via ACH/bank transfer
- Money goes directly to company's bank account
- Lower fees than credit cards

### 3. Both Directions
- One bank account for both:
  - Paying platform fees
  - Receiving client payments

---

## 🔧 Bank Account Linking Options

### Option 1: Stripe ACH (Recommended)

**How it works:**
- Company connects Stripe account
- Stripe links company's bank account
- Supports ACH payments (direct bank transfers)
- Lower fees than credit cards (0.8% + $0.25 vs 2.9% + $0.30)

**Benefits:**
- ✅ Direct bank account linking
- ✅ Lower fees for ACH
- ✅ Supports both directions (pay/receive)
- ✅ Recurring ACH payments
- ✅ Bank account verification via micro-deposits
- ✅ Works with Stripe Connect

**Implementation:**
```javascript
// Link bank account via Stripe
const account = await stripe.accounts.create({
  type: 'express',
  country: 'US',
  capabilities: {
    card_payments: { requested: true },
    transfers: { requested: true },
    us_bank_account_ach_payments: { requested: true }, // ACH support
  },
});

// Company links bank account during onboarding
// Stripe handles verification (micro-deposits)
```

**Fees:**
- ACH: 0.8% + $0.25 per transaction
- Credit Card: 2.9% + $0.30 per transaction
- **Much cheaper for large payments!**

---

### Option 2: PayPal Bank Account

**How it works:**
- Company connects PayPal Business account
- PayPal links company's bank account
- Supports ACH/bank transfers
- Lower fees for bank transfers

**Benefits:**
- ✅ Direct bank account linking
- ✅ Lower fees for bank transfers
- ✅ Many companies already have PayPal
- ✅ Supports both directions

**Fees:**
- Bank Transfer: 1% (capped at $10)
- Credit Card: 2.9% + $0.30

---

### Option 3: Square Bank Account

**How it works:**
- Company connects Square account
- Square links company's bank account
- Supports ACH payments
- Lower fees for bank transfers

**Benefits:**
- ✅ Direct bank account linking
- ✅ Lower fees for ACH
- ✅ Supports both directions

---

### Option 4: Plaid Integration (Direct Bank Linking)

**How it works:**
- Use Plaid API to link bank accounts directly
- Company connects bank account via Plaid
- Platform can charge bank account directly (ACH)
- No payment processor needed for ACH

**Benefits:**
- ✅ **Direct bank account access**
- ✅ No payment processor middleman for ACH
- ✅ Lower fees (just ACH processing fees)
- ✅ Bank account verification
- ✅ Supports both directions

**Implementation:**
```javascript
// 1. Company links bank via Plaid
const plaidLink = await plaidClient.linkTokenCreate({
  user: { client_user_id: companyId },
  client_name: 'NFG Facilities',
  products: ['auth', 'transactions'],
  country_codes: ['US'],
  language: 'en',
});

// 2. Company authorizes bank account
// Plaid handles OAuth flow with bank

// 3. Platform can charge bank account directly
const achPayment = await plaidClient.processorPaymentInitiate({
  processor_token: bankAccountToken,
  amount: 99.00, // Subscription fee
  currency: 'USD',
});
```

**Fees:**
- Plaid: Free for basic linking
- ACH Processing: ~$0.25-$0.50 per transaction
- **Cheapest option for large payments!**

**Plaid Features:**
- ✅ Bank account verification
- ✅ ACH payments
- ✅ Account balance checking
- ✅ Transaction history
- ✅ Secure OAuth flow

---

### Option 5: Manual Bank Transfer (No Linking)

**How it works:**
- Company provides bank account details
- Platform sends invoice with bank details
- Company initiates bank transfer manually
- Platform records payment manually

**Benefits:**
- ✅ No API integration needed
- ✅ Zero fees
- ✅ Simple for companies
- ✅ Works for both directions

**Drawbacks:**
- ❌ Manual process
- ❌ No automatic verification
- ❌ Slower payment processing

---

## 🏗️ Recommended Architecture

### Hybrid Approach (Best of All Worlds)

```
Company Payment Options:
├── Stripe Connect
│   ├── Credit Cards (2.9% + $0.30)
│   └── ACH/Bank Account (0.8% + $0.25) ✅
├── PayPal Business
│   ├── Credit Cards (2.9% + $0.30)
│   └── Bank Account (1% capped at $10) ✅
├── Square Connect
│   ├── Credit Cards
│   └── ACH/Bank Account ✅
├── Plaid Direct
│   └── Direct Bank Account (ACH only) ✅
└── Manual
    └── Bank Transfer (no linking) ✅
```

**Recommendation:**
1. **Stripe Connect with ACH** (primary) - Supports cards + bank
2. **Plaid Direct** (optional) - For companies that want direct bank only
3. **Manual** (fallback) - Always available

---

## 💰 Fee Comparison

| Method | Credit Card | ACH/Bank Transfer |
|--------|-------------|-------------------|
| **Stripe** | 2.9% + $0.30 | 0.8% + $0.25 |
| **PayPal** | 2.9% + $0.30 | 1% (max $10) |
| **Square** | 2.9% + $0.30 | ~1% |
| **Plaid Direct** | N/A | ~$0.25-$0.50 flat |
| **Manual** | N/A | $0 (free) |

**For $1,000 payment:**
- Credit Card: ~$29.30
- Stripe ACH: ~$8.25
- PayPal Bank: ~$10.00
- Plaid ACH: ~$0.50
- Manual: $0

**For $100 payment:**
- Credit Card: ~$3.20
- Stripe ACH: ~$1.05
- PayPal Bank: ~$1.00
- Plaid ACH: ~$0.50
- Manual: $0

**Conclusion:** ACH is much cheaper for large payments!

---

## 🎨 UI Flow: Bank Account Linking

### Stripe Connect with ACH

```
┌─────────────────────────────────────────┐
│ Connect Payment Method                  │
├─────────────────────────────────────────┤
│                                         │
│ Choose payment method:                  │
│                                         │
│ ⚪ Credit/Debit Card                    │
│    (2.9% + $0.30 per transaction)      │
│                                         │
│ ✅ Bank Account (ACH)                   │
│    (0.8% + $0.25 per transaction)      │
│    Lower fees!                         │
│                                         │
│ [Continue]                              │
│                                         │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Link Your Bank Account                  │
├─────────────────────────────────────────┤
│                                         │
│ Enter bank account details:            │
│                                         │
│ Account Type: [Checking ▼]              │
│ Routing Number: [123456789]             │
│ Account Number: [****1234]              │
│                                         │
│ [Link Bank Account]                     │
│                                         │
│ We'll verify with 2 small deposits     │
│ (takes 1-2 business days)              │
│                                         │
└─────────────────────────────────────────┘
```

### Plaid Direct Linking

```
┌─────────────────────────────────────────┐
│ Link Bank Account (Direct)              │
├─────────────────────────────────────────┤
│                                         │
│ Connect your bank account securely:    │
│                                         │
│ [Connect via Plaid]                    │
│                                         │
│ Secure • Verified • Direct             │
│                                         │
│ Supports:                               │
│ ✅ ACH payments                         │
│ ✅ Lower fees                           │
│ ✅ Direct bank access                   │
│                                         │
└─────────────────────────────────────────┘
```

---

## 🔧 Implementation Details

### Stripe ACH Setup

```javascript
// 1. Enable ACH in Stripe Connect account
const account = await stripe.accounts.create({
  type: 'express',
  country: 'US',
  capabilities: {
    us_bank_account_ach_payments: { requested: true },
  },
});

// 2. Company links bank account
// Stripe handles this during onboarding

// 3. Charge via ACH
const paymentIntent = await stripe.paymentIntents.create({
  amount: 9900, // $99.00
  currency: 'usd',
  payment_method_types: ['us_bank_account'], // ACH
  application_fee_amount: 500, // $5.00 platform fee
}, {
  stripeAccount: companyStripeAccountId,
});
```

### Plaid Direct Setup

```javascript
// 1. Initialize Plaid Link
const plaidLink = await plaidClient.linkTokenCreate({
  user: { client_user_id: companyId },
  client_name: 'NFG Facilities',
  products: ['auth'],
  country_codes: ['US'],
});

// 2. Company authorizes bank account
// Plaid handles OAuth flow

// 3. Get bank account token
const processorToken = await plaidClient.processorTokenCreate({
  access_token: plaidAccessToken,
  account_id: bankAccountId,
  processor: 'ach', // or 'stripe', 'dwolla', etc.
});

// 4. Charge bank account via ACH
const achPayment = await stripe.charges.create({
  amount: 9900,
  currency: 'usd',
  source: processorToken.processor_token, // Bank account token
});
```

---

## 📋 Database Schema Updates

### Add Bank Account Fields

```sql
-- Add to company_profiles
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS bank_account_linked BOOLEAN DEFAULT FALSE;
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS bank_account_type TEXT CHECK (bank_account_type IN ('stripe_ach', 'paypal_bank', 'square_ach', 'plaid_direct', 'manual'));
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS bank_account_token VARCHAR(255); -- Encrypted token
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS bank_account_last4 VARCHAR(4); -- Last 4 digits
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS bank_account_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS bank_account_verification_method TEXT; -- 'micro_deposits', 'instant', 'manual'

-- New table for bank account details (encrypted)
CREATE TABLE IF NOT EXISTS bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES company_profiles(id) ON DELETE CASCADE,
  bank_name TEXT,
  account_type TEXT CHECK (account_type IN ('checking', 'savings')),
  routing_number_encrypted TEXT, -- Encrypted
  account_number_encrypted TEXT, -- Encrypted
  last4 VARCHAR(4),
  verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'failed')),
  linked_via TEXT CHECK (linked_via IN ('stripe', 'paypal', 'square', 'plaid', 'manual')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  verified_at TIMESTAMPTZ
);
```

---

## 🔐 Security Considerations

### Bank Account Data

- ⚠️ **Never store full account numbers** in plain text
- ✅ **Encrypt sensitive data** (routing/account numbers)
- ✅ **Use tokens** (Stripe/Plaid tokens, not raw numbers)
- ✅ **Verify accounts** (micro-deposits or instant verification)
- ✅ **Comply with PCI/ACH regulations**

### Verification Methods

1. **Micro-Deposits** (Stripe/Plaid)
   - Deposit 2 small amounts ($0.01-$0.99)
   - Company confirms amounts
   - Takes 1-2 business days

2. **Instant Verification** (Plaid)
   - Company logs into bank via Plaid
   - Instant verification
   - No waiting

3. **Manual Verification**
   - Company provides bank statement
   - Platform verifies manually
   - Slower but works for all banks

---

## ✅ Recommended Implementation

### Phase 1: Stripe ACH (Start Here)
- Enable ACH in Stripe Connect
- Companies link bank accounts via Stripe
- Supports both cards and ACH
- Lower fees for ACH

### Phase 2: Add Plaid (Optional)
- For companies that want direct bank only
- Lower fees for large payments
- More control

### Phase 3: Manual Bank Transfer
- Always available as fallback
- Zero fees
- Simple for companies

---

## 🎯 Summary

**Yes, companies can link bank accounts directly!**

**Options:**
1. ✅ **Stripe ACH** - Via Stripe Connect (recommended)
2. ✅ **PayPal Bank** - Via PayPal Business
3. ✅ **Square ACH** - Via Square Connect
4. ✅ **Plaid Direct** - Direct bank linking (lowest fees)
5. ✅ **Manual** - No linking needed

**Benefits:**
- ✅ Lower fees (ACH is cheaper than cards)
- ✅ Direct bank access
- ✅ Recurring payments
- ✅ Better for large amounts

**Recommendation:** Start with Stripe ACH, add Plaid later if needed.

---

**Ready to implement bank account linking?** 🚀
