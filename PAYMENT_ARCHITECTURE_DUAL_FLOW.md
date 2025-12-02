# 💳 Payment Architecture: Dual-Direction Flow

**Goal:** Companies use their connected payment gateway for **two purposes**:
1. **Pay Platform** - Companies pay subscription/platform fees to you
2. **Receive Payments** - Companies receive payments from their clients

---

## 🎯 Three Transaction Types

### 1. Company Pays Platform (Subscription/Platform Fees)
**Flow:** Company → Platform
- Company connects their Stripe/PayPal/Square account
- Platform charges company's connected account
- Money goes to **platform's account** (your account)
- Examples:
  - Monthly subscription fees ($99, $149, $599)
  - Platform fees (% of transactions)
  - One-time setup fees

### 2. Company Receives Client Payments (Invoice Payments)
**Flow:** Client → Company
- Company connects their Stripe/PayPal/Square account
- Client pays invoice
- Money goes to **company's account** (not platform's)
- Platform can optionally take a small fee (%)
- Examples:
  - Client pays invoice for services
  - Recurring service payments
  - One-time project payments

### 3. Manual Payments (No Gateway)
**Flow:** Manual recording
- Company chooses "Manual Payments"
- No online processing
- Company records payments manually (cash, check, bank transfer)
- Works for both:
  - Company paying platform (manual invoice)
  - Company receiving from clients (manual recording)

---

## 🏗️ Architecture: Stripe Connect (Recommended)

**Stripe Connect** is perfect for this dual flow because it supports:

### ✅ Direct Charges (Company Receives)
```
Client pays invoice → Money goes to Company's Stripe account
```
- Client pays $1,000 invoice
- $1,000 goes to company's bank account
- Platform can take optional fee (e.g., 2% = $20 to platform)

### ✅ Application Fees (Company Pays Platform)
```
Platform charges company → Money goes to Platform's Stripe account
```
- Platform charges $99 monthly subscription
- $99 goes to platform's bank account
- Charged from company's connected account

### ✅ Both in One Account
- Company connects **one** Stripe account
- That account handles **both** directions:
  - Receives client payments (Direct Charges)
  - Pays platform fees (Application Fees)

---

## 💰 Revenue Models

### Model 1: Subscription Only
- Company pays monthly subscription ($99/$149/$599)
- Company receives client payments (100% to company)
- Platform takes subscription fee only

### Model 2: Platform Fee Only
- Company pays no subscription
- Company receives client payments
- Platform takes % of each transaction (e.g., 2%)

### Model 3: Hybrid (Recommended)
- Company pays monthly subscription ($99/$149/$599)
- Company receives client payments
- Platform takes small % of transactions (e.g., 0.5-1%)
- Best of both worlds

---

## 🔄 Payment Flows

### Flow 1: Company Pays Platform (Subscription)

```
1. Company connects Stripe account
2. Platform creates subscription
3. Platform charges company's connected account
4. Money goes to Platform's Stripe account
5. Platform receives payment
```

**Implementation:**
- Use Stripe Connect **Application Fees** or **Direct Charges with platform fee**
- Charge company's connected account
- Money goes to platform's account

### Flow 2: Client Pays Company (Invoice)

```
1. Company connects Stripe account
2. Client clicks "Pay Invoice"
3. Client enters payment info
4. Payment processed via company's connected account
5. Money goes to Company's Stripe account
6. Platform optionally takes small fee
```

**Implementation:**
- Use Stripe Connect **Direct Charges**
- Charge client, money goes to company's account
- Platform can take application fee (optional)

### Flow 3: Manual Payments

```
1. Company chooses "Manual Payments"
2. No gateway connection needed
3. Platform sends invoice (email/PDF)
4. Company pays via check/bank transfer
5. Platform records payment manually
```

**Implementation:**
- No gateway needed
- Manual payment recording
- Works for both directions

---

## 🎨 UI/UX Flow

### Company Settings → Payment Gateway

```
┌─────────────────────────────────────────┐
│ Payment Gateway Settings                │
├─────────────────────────────────────────┤
│                                         │
│ Current Gateway: ✅ Stripe              │
│ Status: Connected & Active              │
│ Account: acct_1234567890                │
│                                         │
│ [Open Stripe Dashboard]                 │
│                                         │
│ ─────────────────────────────────────── │
│                                         │
│ Payment Uses:                            │
│                                         │
│ ✅ Receive payments from clients        │
│    (Client invoices → Your account)    │
│                                         │
│ ✅ Pay platform subscription            │
│    (Monthly fees → Platform account)    │
│                                         │
└─────────────────────────────────────────┘
```

### Invoice Payment (Client Side)

```
┌─────────────────────────────────────────┐
│ Invoice #INV-2024-001                    │
├─────────────────────────────────────────┤
│ Amount Due: $1,500.00                    │
│                                         │
│ [Pay with Card] ← Uses company's Stripe │
│                                         │
│ Payment goes to:                         │
│ ABC Company (via Stripe)                 │
└─────────────────────────────────────────┘
```

### Platform Subscription (Company Side)

```
┌─────────────────────────────────────────┐
│ Subscription: Professional Plan          │
├─────────────────────────────────────────┤
│ Monthly Fee: $149.00                    │
│                                         │
│ Payment Method:                          │
│ ✅ Stripe Account (acct_123...)          │
│                                         │
│ [Update Payment Method]                  │
│                                         │
│ Next Payment: Jan 15, 2024              │
└─────────────────────────────────────────┘
```

---

## 🗄️ Database Schema Updates

### Add to `company_profiles`:

```sql
-- Payment gateway for receiving client payments
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS payment_gateway TEXT;
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS payment_gateway_account_id VARCHAR(255);
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS payment_gateway_connected BOOLEAN DEFAULT FALSE;

-- Payment gateway for paying platform (usually same as above)
-- Can be different if company wants separate accounts
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS platform_payment_gateway TEXT;
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS platform_payment_gateway_account_id VARCHAR(255);
```

**Note:** Most companies will use the same gateway for both, but we support separate accounts if needed.

### New `platform_subscriptions` table:

```sql
CREATE TABLE IF NOT EXISTS platform_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES company_profiles(id) ON DELETE CASCADE,
  plan_name TEXT NOT NULL, -- 'starter', 'professional', 'enterprise'
  amount NUMERIC(12,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'usd',
  billing_cycle TEXT DEFAULT 'monthly', -- 'monthly', 'yearly'
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'unpaid')),
  gateway TEXT, -- 'stripe', 'paypal', 'square', 'manual'
  gateway_subscription_id VARCHAR(255), -- Stripe subscription ID, etc.
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### New `platform_payments` table:

```sql
CREATE TABLE IF NOT EXISTS platform_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES company_profiles(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES platform_subscriptions(id) ON DELETE SET NULL,
  amount NUMERIC(12,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'usd',
  gateway TEXT NOT NULL, -- 'stripe', 'paypal', 'square', 'manual'
  gateway_payment_id VARCHAR(255), -- Stripe charge ID, etc.
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
  payment_type TEXT DEFAULT 'subscription' CHECK (payment_type IN ('subscription', 'platform_fee', 'setup_fee', 'manual')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ
);
```

---

## 🚀 Handling Companies Without Payment Accounts

### Problem: Company Doesn't Have Stripe/PayPal/Square Account

**Solution: Multiple Options**

#### Option 1: Stripe Express Accounts (Recommended)
**Stripe can create accounts for companies automatically!**

```
Company clicks "Connect Stripe"
    ↓
Company doesn't have Stripe account
    ↓
Stripe Express onboarding flow
    ↓
Stripe creates account for company
    ↓
Company completes verification
    ↓
Account connected ✅
```

**Benefits:**
- ✅ No pre-existing account needed
- ✅ Stripe handles account creation
- ✅ Simplified onboarding (Express accounts)
- ✅ Company completes setup in 5-10 minutes
- ✅ Automatic account activation

**How it works:**
1. Company clicks "Connect Stripe" in settings
2. Platform generates Stripe Express account link
3. Company redirected to Stripe onboarding
4. Company enters business info (name, email, bank account)
5. Stripe creates account automatically
6. Company redirected back to platform
7. Account connected and ready to use

#### Option 2: Manual Account Creation (Guided)
**Guide companies to create accounts first**

```
Company clicks "Connect Stripe"
    ↓
Company doesn't have Stripe account
    ↓
Show instructions: "Create Stripe account first"
    ↓
Link to: https://stripe.com (with referral)
    ↓
Company creates account
    ↓
Company returns to platform
    ↓
Connect existing account ✅
```

**Benefits:**
- ✅ Company has full control
- ✅ Can use existing Stripe account if they have one
- ✅ Standard account (more features than Express)

#### Option 3: Alternative Gateways
**Support PayPal/Square for companies that prefer them**

```
Company doesn't want Stripe
    ↓
Choose PayPal or Square
    ↓
Same onboarding flow
    ↓
Account connected ✅
```

**Benefits:**
- ✅ More options for companies
- ✅ Some companies already have PayPal/Square
- ✅ Flexibility

#### Option 4: Manual Payments (Always Available)
**No gateway account needed**

```
Company doesn't want online payments
    ↓
Choose "Manual Payments"
    ↓
No account creation needed
    ↓
Works immediately ✅
```

**Benefits:**
- ✅ Zero setup required
- ✅ No account creation
- ✅ Works for both directions:
  - Company pays platform (check/bank transfer)
  - Company receives from clients (manual recording)

---

## 🔧 Implementation Strategy

### Phase 1: Platform Setup ✅
- Set up Stripe Connect platform account
- Enable Stripe Express accounts (for auto-creation)
- Store platform API keys
- **Status:** In progress

### Phase 2: Database Schema
- Add payment gateway fields to `company_profiles`
- Create `platform_subscriptions` table
- Create `platform_payments` table
- Update `payments` table for client payments

### Phase 3: Gateway Connection (With Onboarding)
- **Stripe Express** - Auto-create accounts for companies
- **PayPal/Square** - Guide companies to create accounts
- **Manual** - No account needed
- Store connected account IDs
- Handle OAuth flows
- Handle account creation flows

### Phase 4: Client Payment Flow
- Client pays invoice → Money to company's account
- Platform can take optional fee
- Update invoice status
- Handle companies without accounts (show manual payment option)

### Phase 5: Platform Payment Flow
- Platform charges company subscription
- Money to platform's account
- Handle recurring subscriptions
- Handle failed payments
- Handle companies without accounts (manual invoicing)

---

## 💡 Best Practices

### 1. Same Gateway for Both (Recommended)
- Company connects one Stripe account
- Use for both receiving and paying
- Simpler setup and management

### 2. Separate Accounts (Optional)
- Company can use different accounts
- E.g., Stripe for receiving, PayPal for paying platform
- More complex but more flexible

### 3. Manual Payments Fallback
- Always support manual payments
- Companies can pay platform via check/bank transfer
- Companies can receive from clients manually

### 4. Fee Transparency
- Show platform fees clearly
- Show subscription costs upfront
- No hidden fees

---

## 🎯 Summary

**Three Transaction Types:**
1. ✅ **Company → Platform** (Subscription/Platform fees)
2. ✅ **Client → Company** (Invoice payments)
3. ✅ **Manual** (Cash/Check/Bank Transfer)

**Best Solution: Stripe Connect**
- Handles both directions
- One account connection
- Platform can take fees
- Supports all payment methods:
  - ✅ Credit/Debit Cards (2.9% + $0.30)
  - ✅ **ACH/Bank Account** (0.8% + $0.25) - Lower fees!
- **Stripe Express** can auto-create accounts for companies

**Bank Account Linking:**
- ✅ **Stripe ACH** - Link bank accounts via Stripe (recommended)
- ✅ **Plaid Direct** - Direct bank linking (lowest fees)
- ✅ **PayPal/Square Bank** - Via their platforms
- ✅ **Manual Bank Transfer** - No linking needed

**Handling Companies Without Accounts:**
- ✅ **Stripe Express** - Auto-create accounts (recommended)
- ✅ **Guided Creation** - Help companies create accounts
- ✅ **Alternative Gateways** - PayPal/Square options
- ✅ **Manual Payments** - Always available (no account needed)

**See:**
- `PAYMENT_GATEWAY_ONBOARDING_FLOWS.md` - Onboarding flows
- `PAYMENT_BANK_ACCOUNT_LINKING.md` - Bank account linking options
- `PAYMENT_OPTIMAL_SETUP.md` - **Optimal configuration for both scenarios**

**Next Steps:**
1. Complete Phase 1 (Platform setup)
2. Update database schema (Phase 2)
3. Implement gateway connection with onboarding (Phase 3)
4. Build both payment flows (Phases 4 & 5)

---

**Ready to proceed with this architecture?** 🚀
