# 💳 Payment Processing Integration - Multi-Gateway & Multi-Tenant Gameplan

**Status:** Ready to implement  
**Time Estimate:** 2-3 weeks  
**Priority:** 🔥 HIGH - Revenue Accelerator

---

## 📋 Overview

Integrate **multi-gateway payment processing** to enable **dual-direction payments**:
1. **Company Receives Payments** - Clients pay company invoices (money to company's account)
2. **Company Pays Platform** - Companies pay subscription/platform fees (money to platform's account)
3. **Manual Payments** - Fallback for companies that don't want online processing

**Key Features:**
- ✅ Companies choose their preferred payment gateway (Stripe, PayPal, Square, or Manual)
- ✅ Each company connects their own gateway account
- ✅ **Client payments** go directly to company's gateway account
- ✅ **Platform fees** go to platform's account (from company's connected account)
- ✅ **Manual payments** as default option (no gateway required)
- ✅ Companies manage their own payment settings
- ✅ Your platform acts as a marketplace/connector
- ✅ Instant payment processing (if gateway connected)
- ✅ Faster cash flow
- ✅ Professional payment experience
- ✅ Automated payment receipts

**See `PAYMENT_ARCHITECTURE_DUAL_FLOW.md` for detailed architecture.**

---

## 🎯 Goals

### Client Payment Flow (Company Receives)
1. **Multi-Gateway Support** - Support Stripe, PayPal, Square, and manual payments
2. **Payment Gateway Selection** - Companies choose their preferred processor
3. **Client Invoice Payments** - Clients pay company invoices via company's connected gateway
4. **Direct Payments** - Money goes directly to company's account
5. **Platform Fees** - Optional platform fee (% of transaction)
6. **Payment Links** - Generate secure payment links (works with any gateway)
7. **Client Portal Payments** - Allow clients to pay invoices from their portal

### Platform Payment Flow (Company Pays Platform)
8. **Subscription Management** - Companies pay monthly/yearly subscription fees
9. **Platform Fee Collection** - Charge companies for platform usage
10. **Recurring Billing** - Automatic subscription renewals
11. **Payment Method Management** - Companies update payment methods for subscriptions

### General Features
12. **Multi-Tenant Payment Processing** - Each company processes payments through their own account
13. **Secure Payment Processing** - Handle credit cards, ACH, and other payment methods
14. **Payment Confirmation** - Automatic receipts and confirmations
15. **Webhook Handling** - Real-time payment status updates per company/gateway
16. **Refund Processing** - Handle refunds through company's payment gateway
17. **Manual Payment Fallback** - Companies can use cash/check/bank transfer without gateway

---

## 🔧 Technology Stack - Multi-Gateway Support

### Supported Payment Processors

**1. Stripe (Recommended)**
- Stripe Connect for multi-tenant
- Each company connects their Stripe account
- OAuth-based connection
- Most popular choice

**2. PayPal**
- PayPal Business integration
- Companies connect their PayPal account
- OAuth or API keys

**3. Square**
- Square Connect API
- Companies connect their Square account
- OAuth-based connection

**4. Manual/Offline Payments**
- Cash, Check, Bank Transfer
- Company records payments manually
- No online processing required

### Architecture:
```
Your Platform
    ↓
Payment Gateway Selection
    ↓
┌─────────────┬─────────────┬─────────────┬─────────────┐
│   Stripe    │   PayPal    │   Square    │   Manual    │
│  Connect    │   Business  │   Connect   │  (Cash/     │
│             │             │             │   Check)    │
└─────────────┴─────────────┴─────────────┴─────────────┘
    ↓              ↓              ↓              ↓
Company A    Company B      Company C      Company D
Account      Account         Account       (Manual)
```

### Payment Gateway Abstraction
- Companies choose their preferred processor
- Each processor has its own integration
- Unified payment interface for all gateways
- **Manual payments as default** - Companies can use cash/check/bank transfer
- Fallback to manual payments if no gateway connected

---

## 🎯 Manual Payments (Default Option)

**Many companies don't need online payment processing!**

### Manual Payment Flow:
1. Company selects "Manual Payments" as their payment method
2. No gateway connection required
3. No online payment processing
4. Payments recorded manually through existing "Add Payment" flow
5. Perfect for:
   - Companies that prefer traditional payment methods
   - Companies that don't want to pay gateway fees
   - Companies that handle payments offline
   - Companies not ready for online payments yet

### How Manual Payments Work:
- ✅ "Pay Invoice" button **hidden** for manual payment companies
- ✅ "Record Payment" button shown (existing functionality)
- ✅ Admin records payment manually (cash, check, bank transfer)
- ✅ Payment method stored: `payment_method = 'cash'`, `'check'`, `'bank_transfer'`, etc.
- ✅ All existing payment tracking works as-is
- ✅ No changes needed to current payment recording system

### Benefits:
- ✅ **Zero setup** - Works immediately
- ✅ **No fees** - Companies don't pay gateway fees
- ✅ **Simple** - Companies control their own payment collection
- ✅ **Flexible** - Can switch to online payments later

---

## 📋 Phase Breakdown

### **Phase 1: Payment Gateway Platform Setup** (Day 1-2)

**Goal:** Set up platform accounts for multiple payment gateways

**Tasks:**
1. Create Stripe Connect account (if offering Stripe)
2. Create PayPal Developer account (if offering PayPal)
3. Create Square Developer account (if offering Square)
4. Configure each gateway's platform settings
5. Store platform API keys securely
6. Set up webhook endpoints for each gateway
7. Test platform connections

**Deliverables:**
- Stripe Connect enabled (if offering)
- PayPal Business API configured (if offering)
- Square Connect configured (if offering)
- Platform API keys stored securely in Supabase secrets
- Test mode working for each gateway

**Setup Steps:**
```bash
# Store Platform keys in Supabase secrets (optional - only if offering that gateway)

# Stripe Connect
supabase secrets set STRIPE_PLATFORM_SECRET_KEY=sk_test_...
supabase secrets set STRIPE_PLATFORM_PUBLISHABLE_KEY=pk_test_...
supabase secrets set STRIPE_CONNECT_CLIENT_ID=ca_...

# PayPal (if offering)
supabase secrets set PAYPAL_CLIENT_ID=...
supabase secrets set PAYPAL_CLIENT_SECRET=...
supabase secrets set PAYPAL_MODE=sandbox  # or 'live'

# Square (if offering)
supabase secrets set SQUARE_APPLICATION_ID=...
supabase secrets set SQUARE_ACCESS_TOKEN=...
supabase secrets set SQUARE_ENVIRONMENT=sandbox  # or 'production'
```

**Gateway Setup:**
- **Stripe**: Dashboard → Settings → Connect → Enable Connect
- **PayPal**: Developer Dashboard → Create App → Get Credentials
- **Square**: Developer Dashboard → Create Application → Get Keys

**Note:** You can start with just one gateway (e.g., Stripe) and add more later.

---

### **Phase 2: Database Schema Updates** (Day 2-3)

**Goal:** Extend database to support multiple payment gateways (multi-tenant)

**Tasks:**
1. Add payment gateway configuration to `company_profiles` table
2. Add gateway-specific fields to `payments` table
3. Create `payment_intents` table for tracking payment attempts (multi-gateway)
4. Create `payment_gateway_connections` table for storing company gateway connections
5. Link payments to company gateway accounts
6. Add indexes for performance
7. Update RLS policies

**SQL Changes:**
```sql
-- ==========================================
-- MULTI-GATEWAY PAYMENT PROCESSING
-- ==========================================

-- 1. Add payment gateway fields to company_profiles
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS payment_gateway TEXT CHECK (payment_gateway IN ('stripe', 'paypal', 'square', 'manual', NULL));
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS payment_gateway_connected BOOLEAN DEFAULT FALSE;
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS payment_gateway_account_id VARCHAR(255); -- Gateway-specific account ID
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS payment_gateway_account_status TEXT; -- 'pending', 'active', 'restricted', 'disabled'
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS payment_gateway_dashboard_link TEXT;
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS payment_gateway_metadata JSONB; -- Store gateway-specific data

-- Index
CREATE INDEX IF NOT EXISTS idx_company_profiles_payment_gateway ON company_profiles(payment_gateway);
CREATE INDEX IF NOT EXISTS idx_company_profiles_payment_gateway_account ON company_profiles(payment_gateway_account_id);

-- 2. Add gateway fields to payments table
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_gateway TEXT CHECK (payment_gateway IN ('stripe', 'paypal', 'square', 'manual'));
ALTER TABLE payments ADD COLUMN IF NOT EXISTS gateway_payment_id VARCHAR(255); -- Gateway-specific payment ID (stripe_payment_intent_id, paypal_order_id, etc.)
ALTER TABLE payments ADD COLUMN IF NOT EXISTS gateway_account_id VARCHAR(255); -- Company's gateway account ID
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'processing', 'succeeded', 'failed', 'refunded', 'partially_refunded', 'canceled'));
ALTER TABLE payments ADD COLUMN IF NOT EXISTS failure_reason TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS receipt_url TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS gateway_metadata JSONB; -- Store gateway-specific payment data

-- 3. Create payment_gateway_connections table (store company gateway connections)
CREATE TABLE IF NOT EXISTS payment_gateway_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES company_profiles(id) ON DELETE CASCADE,
  gateway TEXT NOT NULL CHECK (gateway IN ('stripe', 'paypal', 'square')),
  gateway_account_id VARCHAR(255) NOT NULL,
  connection_status TEXT DEFAULT 'pending' CHECK (connection_status IN ('pending', 'active', 'restricted', 'disabled', 'disconnected')),
  connection_data JSONB, -- Store gateway-specific connection info
  connected_at TIMESTAMPTZ,
  disconnected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, gateway) -- One connection per gateway per company
);

-- 4. Create payment_intents table (track payment attempts - works for all gateways)
CREATE TABLE IF NOT EXISTS payment_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  gateway TEXT NOT NULL CHECK (gateway IN ('stripe', 'paypal', 'square')),
  gateway_payment_id VARCHAR(255) NOT NULL, -- Gateway-specific ID (stripe_payment_intent_id, paypal_order_id, etc.)
  gateway_account_id VARCHAR(255) NOT NULL, -- Company's gateway account
  amount NUMERIC(12,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'usd',
  status TEXT NOT NULL,
  client_secret TEXT, -- For Stripe
  payment_approval_url TEXT, -- For PayPal/Square
  payment_method_types TEXT[],
  metadata JSONB,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(gateway, gateway_payment_id) -- Unique per gateway
);

-- 5. Create gateway_oauth_sessions table (track OAuth connection attempts)
CREATE TABLE IF NOT EXISTS gateway_oauth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES company_profiles(id) ON DELETE CASCADE,
  gateway TEXT NOT NULL CHECK (gateway IN ('stripe', 'paypal', 'square')),
  state_token VARCHAR(255) UNIQUE NOT NULL, -- OAuth state token
  gateway_account_id VARCHAR(255), -- Set after successful connection
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired', 'failed')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payments_gateway ON payments(payment_gateway);
CREATE INDEX IF NOT EXISTS idx_payments_gateway_payment_id ON payments(gateway_payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_gateway_account ON payments(gateway_account_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_status ON payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_payment_intents_invoice_id ON payment_intents(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_gateway ON payment_intents(gateway, gateway_payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_gateway_account ON payment_intents(gateway_account_id);
CREATE INDEX IF NOT EXISTS idx_gateway_connections_company ON payment_gateway_connections(company_id);
CREATE INDEX IF NOT EXISTS idx_gateway_oauth_sessions_company ON gateway_oauth_sessions(company_id);
CREATE INDEX IF NOT EXISTS idx_gateway_oauth_sessions_state ON gateway_oauth_sessions(state_token);
```

---

### **Phase 3: Payment Gateway Selection & Connection** (Day 3-5)

**Goal:** Allow companies to choose and connect their payment gateway

**Tasks:**
1. Create Payment Settings page in company settings
2. Display gateway selection options:
   - Stripe (if offering Stripe)
   - PayPal (if offering PayPal)
   - Square (if offering Square)
   - Manual Payments (always available)
3. Implement OAuth flows for each gateway
4. Handle OAuth callbacks for each gateway
5. Store connected gateway account IDs
6. Handle "Manual Payments" selection (no connection needed)
7. Create onboarding flows for each gateway

**UI Flow:**
1. Company admin goes to Settings → Payment Settings
2. Sees payment gateway options:
   ```
   ┌─────────────────────────────────────────┐
   │ Payment Processing                      │
   ├─────────────────────────────────────────┤
   │ Select Payment Gateway:                 │
   │                                         │
   │ ⚪ Stripe                               │
   │    [Connect Stripe Account]             │
   │                                         │
   │ ⚪ PayPal                               │
   │    [Connect PayPal Account]             │
   │                                         │
   │ ⚪ Square                               │
   │    [Connect Square Account]             │
   │                                         │
   │ ✅ Manual Payments (Default)            │
   │    Cash, Check, Bank Transfer           │
   │    [No connection needed]               │
   └─────────────────────────────────────────┘
   ```
3. Company selects gateway
4. If online gateway: OAuth flow starts
5. If manual: Set payment_gateway = 'manual'
6. Connection stored and activated

**Manual Payments (Default):**
- Companies can choose "Manual Payments"
- No gateway connection required
- Payments recorded manually (already works)
- "Pay Invoice" button hidden, manual payment entry only
- Perfect for companies that don't want online processing

**Files to Create:**
- `settings-payment.html` or section in `settings.html`
- `js/payment-gateway-connection.js` - Handle gateway OAuth flows
- Supabase Edge Functions:
  - `stripe-connect-oauth`
  - `paypal-connect-oauth`
  - `square-connect-oauth`

**Edge Functions Needed:**
- `create-gateway-connection-link` - Generate OAuth link for selected gateway
- `gateway-oauth-callback` - Handle OAuth callback for any gateway
- `disconnect-gateway` - Disconnect company's gateway

---

### **Phase 4: Stripe Edge Functions** (Day 4-5)

**Goal:** Create Supabase Edge Functions to handle Stripe Connect operations securely

**Tasks:**
1. Create `create-payment-intent` function (uses company's Stripe account)
2. Create `stripe-webhook` function (handle Stripe events from all connected accounts)
3. Create `stripe-connect-oauth` function (handle OAuth flow)
4. Install Stripe SDK
5. Handle payment success/failure per company
6. Update invoice status automatically
7. Route webhooks to correct company

**File Structure:**
```
supabase/functions/
  ├── stripe-connect-oauth/
  │   └── index.ts  (OAuth connection flow)
  ├── create-payment-intent/
  │   └── index.ts  (create payment intent using company's Stripe account)
  ├── stripe-webhook/
  │   └── index.ts  (handle webhooks from all connected accounts)
  └── process-refund/
      └── index.ts  (refund through company's Stripe account)
```

**Key Functions:**
- `createConnectAccountLink()` - Generate OAuth link for company
- `handleConnectCallback()` - Process OAuth callback, store account ID
- `createPaymentIntent()` - Create PaymentIntent using company's Stripe account ID
- `handleWebhook()` - Process Stripe events, identify which company's account
- `processRefund()` - Refund through company's Stripe account

**Important:** All Stripe operations use the company's `stripe_account_id` from `company_profiles`

---

### **Phase 5: Payment Link Generation** (Day 6-7)

**Goal:** Generate secure payment links using company's payment gateway (or show manual payment option)

**Tasks:**
1. Create "Pay Invoice" button in invoice detail modal
   - Show only if company has connected gateway
   - Hide if gateway is 'manual'
2. Generate payment link with PaymentIntent (using company's gateway)
3. Create public payment page (no login required)
4. Display invoice details on payment page
5. Secure payment link (time-limited, one-time use)
6. Link payments to company's gateway account
7. For manual payments: Show "Record Payment" instead of "Pay Invoice"

**Features:**
- Payment link in invoice email (if gateway connected)
- Payment link in invoice detail modal (if gateway connected)
- Public payment page (accessible without login)
- Invoice details displayed before payment
- Secure token-based access
- Payments routed to company's gateway account
- Manual payment option (record cash/check/bank transfer)

**UI Flow (Online Gateway):**
1. Admin/Client clicks "Pay Invoice" button
2. System identifies company from invoice
3. System checks company's payment gateway
4. If gateway connected: Generate payment link using company's gateway
5. Opens payment page
6. Client enters payment info
7. Payment processed via company's gateway
8. Payment goes to company's bank account
9. Confirmation shown, invoice updated

**UI Flow (Manual Payments):**
1. Admin/Client views invoice
2. "Pay Invoice" button not shown
3. Instead: "Record Payment" button (existing functionality)
4. Admin records payment manually (cash, check, bank transfer)
5. Payment recorded in system (already works)

---

### **Phase 6: Payment Form & Processing (Multi-Gateway)** (Day 7-8)

**Goal:** Create secure payment form that works with multiple gateways

**Tasks:**
1. Install gateway SDKs in frontend (Stripe.js, PayPal SDK, Square SDK)
2. Create unified payment form component
3. Detect company's payment gateway from invoice
4. Load appropriate payment form based on gateway:
   - Stripe: Stripe Elements
   - PayPal: PayPal Buttons
   - Square: Square Payment Form
5. Get company's gateway credentials (from company_profiles)
6. Handle payment submission (using company's gateway account)
7. Show loading states
8. Handle errors gracefully
9. Display payment confirmation

**Files to Create:**
- `payment.html` - Public payment page (multi-gateway)
- `js/payment.js` - Payment form logic (gateway-agnostic)
- `js/stripe-payment.js` - Stripe-specific logic
- `js/paypal-payment.js` - PayPal-specific logic
- `js/square-payment.js` - Square-specific logic
- `css/payment.css` - Payment form styles

**Features:**
- Gateway detection from invoice/company
- Stripe Elements (if Stripe)
- PayPal Checkout (if PayPal)
- Square Payment Form (if Square)
- Unified payment confirmation
- Card validation (gateway-specific)
- Error handling
- Loading states
- Success confirmation
- Receipt download
- Payments go to company's gateway account

**Manual Payment Handling:**
- If gateway is 'manual', "Pay Invoice" button is hidden
- Payment page shows message: "This company uses manual payments. Please contact them directly to pay, or record the payment manually."
- Or redirects back to invoice detail with manual payment instructions

---

### **Phase 7: Client Portal Integration** (Day 7-8)

**Goal:** Add payment functionality to client portal

**Tasks:**
1. Add "Pay Now" button to invoice list in client portal
2. Integrate payment form in client portal
3. Show payment history in client portal
4. Display payment receipts
5. Show payment status on invoices

**UI Updates:**
- "Pay Now" button on unpaid invoices
- Payment form modal
- Payment history section
- Receipt download

---

### **Phase 8: Webhook Handling** (Day 8-9)

**Goal:** Handle Stripe webhooks from all connected company accounts

**Tasks:**
1. Create webhook endpoint (handles events from all connected accounts)
2. Verify webhook signatures (security)
3. Identify which company's Stripe account sent the event
4. Route event to correct company's data
5. Handle payment events:
   - `payment_intent.succeeded` - Mark payment as successful
   - `payment_intent.payment_failed` - Mark payment as failed
   - `charge.refunded` - Handle refunds
   - `account.updated` - Update company's Stripe connection status
6. Update invoice status automatically
7. Send confirmation emails

**Important:** Each company needs to configure webhook URL in their Stripe dashboard:
- URL: `https://your-project.supabase.co/functions/v1/stripe-webhook`
- Events: `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`, etc.

**Events to Handle:**
- `payment_intent.succeeded` → Identify company by account_id, update payment status, mark invoice as paid
- `payment_intent.payment_failed` → Update payment status, notify client
- `charge.refunded` → Update payment status, adjust invoice balance
- `payment_intent.canceled` → Mark payment intent as canceled
- `account.updated` → Update company's Stripe connection status

---

### **Phase 9: Payment Receipts & Confirmation** (Day 9-10)

**Goal:** Generate and send payment receipts

**Tasks:**
1. Generate payment receipt PDF
2. Email receipt to client
3. Store receipt URL in database
4. Download receipt from invoice detail
5. Payment confirmation page

**Features:**
- Automatic receipt generation after payment
- Email receipt to client
- Download receipt PDF
- Receipt includes invoice number, payment amount, date, method

---

### **Phase 10: Refund Processing** (Day 10-11)

**Goal:** Handle refunds through company's Stripe account

**Tasks:**
1. Add "Refund" button in payment details
2. Create refund modal/form
3. Process partial or full refunds (via company's Stripe account)
4. Update invoice balance automatically
5. Generate refund receipt
6. Email refund confirmation
7. Refund comes from company's Stripe account balance

**UI:**
- "Refund" button in payment detail modal
- Refund amount input (full or partial)
- Refund reason field
- Confirmation dialog
- Refunds processed through company's connected Stripe account

---

### **Phase 11: Company Payment Settings** (Day 11-12)

**Goal:** Company settings page for payment gateway management

**Tasks:**
1. Create Payment Settings page in company settings
2. Show current payment gateway selection
3. Gateway connection status for each option
4. "Connect Gateway" buttons for each gateway
5. "Disconnect Gateway" option (with confirmation)
6. Link to gateway dashboard (company's dashboard)
7. View payment processing status
8. Switch between gateways
9. View connected account details
10. Manual payment option (always available)

**UI Features:**
- Current gateway badge (Stripe / PayPal / Square / Manual)
- Connection status (Connected / Not Connected / Pending)
- Gateway account ID display
- "Connect [Gateway] Account" button (OAuth flow)
- "Switch to [Other Gateway]" button
- "Disconnect" button (with confirmation)
- "Open [Gateway] Dashboard" link
- Account status (Active, Restricted, etc.)
- Manual payment info: "Record payments manually (cash, check, bank transfer)"
- Onboarding completion status

**Payment Gateway Selection UI:**
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
│ [Disconnect Stripe]                     │
│                                         │
│ ─────────────────────────────────────── │
│                                         │
│ Switch to another gateway:              │
│                                         │
│ [Switch to PayPal]                      │
│ [Switch to Square]                      │
│ [Switch to Manual Payments]             │
│                                         │
└─────────────────────────────────────────┘
```

---

### **Phase 12: Testing & Security** (Day 12-13)

**Goal:** Comprehensive testing and security hardening

**Tasks:**
1. Test payment flows (success, failure, partial)
2. Test refund processing
3. Test webhook handling
4. Security audit:
   - Verify webhook signature validation
   - Ensure no card data is stored
   - Validate payment amounts
   - Test rate limiting
5. Test error handling
6. Test edge cases (concurrent payments, etc.)

**Test Cases:**
- ✅ Successful payment
- ✅ Failed payment (insufficient funds, declined card)
- ✅ Partial payment
- ✅ Full refund
- ✅ Partial refund
- ✅ Duplicate payment prevention
- ✅ Overpayment handling
- ✅ Expired payment links
- ✅ Webhook event processing

---

## 🗄️ Database Schema Changes

**See Phase 2 for complete SQL schema.** Key tables:

### Updates to `company_profiles` table:
- `payment_gateway` - Selected gateway ('stripe', 'paypal', 'square', 'manual', NULL)
- `payment_gateway_connected` - Boolean flag
- `payment_gateway_account_id` - Gateway-specific account ID
- `payment_gateway_account_status` - Account status
- `payment_gateway_dashboard_link` - Link to gateway dashboard
- `payment_gateway_metadata` - JSONB for gateway-specific data

### New `payment_gateway_connections` table:
- Stores all gateway connections per company
- Supports multiple gateways (company can switch)
- Tracks connection status per gateway

### Updates to `payments` table:
- `payment_gateway` - Gateway used ('stripe', 'paypal', 'square', 'manual')
- `gateway_payment_id` - Gateway-specific payment ID
- `gateway_account_id` - Company's gateway account ID
- `payment_status` - Payment status
- `gateway_metadata` - Gateway-specific payment data

### New `payment_intents` table (multi-gateway):
- Works for all gateways (Stripe, PayPal, Square)
- Stores gateway-specific payment IDs
- Links to company's gateway account

---

## 🎨 UI/UX Design

### Payment Page (Public)
```
┌─────────────────────────────────────┐
│         NFG Facilities              │
│     Invoice Payment                 │
├─────────────────────────────────────┤
│ Invoice #: INV-2024-001             │
│ Client: ABC Company                 │
│ Amount Due: $1,500.00               │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Card Number                     │ │
│ │ ┌─────────────────────────────┐ │ │
│ │ │ 4242 4242 4242 4242         │ │ │
│ │ └─────────────────────────────┘ │ │
│ │                                 │ │
│ │ Expiry        CVC               │ │
│ │ ┌────┐        ┌────┐           │ │
│ │ │12/25│        │123 │           │ │
│ │ └────┘        └────┘           │ │
│ │                                 │ │
│ │  [Pay $1,500.00]                │ │
│ └─────────────────────────────────┘ │
│                                     │
│ 🔒 Secure payment by Stripe         │
└─────────────────────────────────────┘
```

### Payment Success Page
```
┌─────────────────────────────────────┐
│           ✅ Payment Successful!     │
├─────────────────────────────────────┤
│                                     │
│  Invoice #: INV-2024-001            │
│  Amount Paid: $1,500.00             │
│  Date: January 15, 2024             │
│                                     │
│  Receipt will be emailed to:        │
│  client@example.com                 │
│                                     │
│  [Download Receipt]                 │
│                                     │
└─────────────────────────────────────┘
```

---

## 🔐 Security Considerations

1. **PCI Compliance**
   - Never store card numbers
   - Use Stripe Elements (PCI-compliant)
   - All card data goes directly to Stripe

2. **Webhook Security**
   - Verify webhook signatures
   - Validate event payloads
   - Rate limiting on webhook endpoint

3. **Payment Link Security**
   - Time-limited tokens
   - Single-use links (optional)
   - Amount validation
   - Invoice status validation

4. **Access Control**
   - Only allow payment for unpaid invoices
   - Prevent overpayment beyond balance
   - Validate payment amounts server-side

---

## 📧 Email Notifications

### Payment Confirmation Email
- Subject: "Payment Received - Invoice #INV-2024-001"
- Include: Invoice number, amount paid, payment date, receipt PDF

### Payment Failed Email
- Subject: "Payment Failed - Invoice #INV-2024-001"
- Include: Invoice number, amount, failure reason, retry link

### Refund Confirmation Email
- Subject: "Refund Processed - Invoice #INV-2024-001"
- Include: Invoice number, refund amount, refund date, receipt PDF

---

## 🔄 Payment Flow

### Standard Payment Flow:
1. Client clicks "Pay Invoice" button
2. System creates Stripe PaymentIntent
3. Client enters payment info (Stripe Elements)
4. Client submits payment
5. Stripe processes payment
6. Webhook received: `payment_intent.succeeded`
7. Payment record created in database
8. Invoice status updated to "paid"
9. Receipt generated and emailed
10. Success page shown to client

### Failed Payment Flow:
1. Client submits payment
2. Stripe declines payment
3. Webhook received: `payment_intent.payment_failed`
4. Payment record created with "failed" status
5. Error message shown to client
6. Payment failed email sent
7. Client can retry payment

---

## 📊 Stripe Dashboard Integration

**Features to Use:**
- Payment dashboard (view all transactions)
- Refund management
- Dispute handling
- Customer management
- Reporting and analytics
- Tax handling (Stripe Tax)

---

## 🧪 Testing Checklist

### Payment Processing:
- [ ] Successful card payment
- [ ] Declined card payment
- [ ] Insufficient funds
- [ ] Invalid card number
- [ ] Expired card
- [ ] Partial payment (if allowed)
- [ ] Overpayment handling

### Webhooks:
- [ ] Payment succeeded event
- [ ] Payment failed event
- [ ] Refund processed event
- [ ] Webhook signature validation
- [ ] Duplicate webhook prevention

### Edge Cases:
- [ ] Concurrent payment attempts
- [ ] Payment for already paid invoice
- [ ] Payment link expiration
- [ ] Refund for partial payment
- [ ] Multiple refunds for single payment

### Security:
- [ ] No card data stored in database
- [ ] Webhook signature verification
- [ ] Payment amount validation
- [ ] Invoice status validation
- [ ] Access control checks

---

## 🔑 Key Differences: Multi-Gateway vs Single Gateway

### Single Gateway (Stripe Only):
- ❌ Only Stripe supported
- ❌ Companies must use Stripe or nothing
- ❌ Less flexible

### Multi-Gateway (NEW):
- ✅ Companies choose their gateway (Stripe, PayPal, Square)
- ✅ Manual payments always available (no gateway required)
- ✅ Payments go directly to company's gateway account
- ✅ No money handling on your part
- ✅ Companies manage their own tax/compliance
- ✅ Your platform is just a connector
- ✅ Maximum flexibility

### Manual Payments (Always Available):
- ✅ No gateway required
- ✅ Companies record payments manually
- ✅ Works for cash, check, bank transfer
- ✅ Perfect for companies that don't want online processing
- ✅ Can switch to online gateway anytime

---

## 🚀 Implementation Order

**Week 1:**
1. Phase 1: Stripe Connect Platform Setup
2. Phase 2: Database Schema Updates
3. Phase 3: Stripe Connect OAuth Flow
4. Phase 4: Stripe Edge Functions (with Connect)
5. Phase 5: Payment Link Generation

**Week 2:**
6. Phase 6: Payment Form (using company's Stripe)
7. Phase 7: Client Portal Integration
8. Phase 8: Webhook Handling (multi-account)
9. Phase 9: Payment Receipts
10. Phase 10: Refund Processing

**Week 3:**
11. Phase 11: Company Payment Settings
12. Phase 12: Testing & Security

---

## 💰 Pricing & Fees

**Stripe Connect Fees:**
- Platform account: **FREE** (you don't pay Stripe fees)
- Company accounts: 2.9% + $0.30 per transaction (companies pay Stripe)
- No monthly fees for Connect
- No setup fees

**Your Platform:**
- You can charge a platform fee (optional):
  - Take % of each transaction
  - Or charge monthly subscription
  - Or both

**Company Experience:**
- Companies create their own Stripe account
- Companies pay Stripe fees directly
- Payments go directly to company's bank account
- Companies manage their own Stripe dashboard
- Companies handle their own tax/compliance

**Revenue Model Options:**
1. **Free** - No fees, just provide the platform
2. **Platform Fee** - Take 0.5-2% of each transaction
3. **Monthly Fee** - Charge companies monthly subscription
4. **Combination** - Monthly fee + small platform fee

---

## 📝 Files to Create/Modify

### New Files:
- `supabase/functions/stripe-connect-oauth/index.ts` - OAuth connection flow
- `supabase/functions/create-connect-account-link/index.ts` - Generate OAuth link
- `supabase/functions/create-payment-intent/index.ts` - Create payment (uses company's Stripe)
- `supabase/functions/stripe-webhook/index.ts` - Handle webhooks (multi-account)
- `supabase/functions/process-refund/index.ts` - Refund (via company's Stripe)
- `payment.html` - Public payment page
- `js/payment.js` - Payment form logic (uses company's Stripe account)
- `js/stripe-connect.js` - OAuth connection handling
- `ADD_PAYMENT_PROCESSING_SCHEMA.sql` - Database schema updates

### Modified Files:
- `billing.html` - Add "Pay Now" buttons
- `js/billing.js` - Add payment functions (check company's Stripe connection)
- `settings.html` - Add Payment Settings section
- `client-portal.html` - Add payment functionality (if exists)
- Invoice detail modal - Add payment button (only if company connected Stripe)
- Invoice emails - Add payment links

### New Settings Page Section:
- Payment Settings tab in Settings
- Stripe connection status
- Connect/Disconnect buttons
- Stripe Dashboard link

---

## ✅ Success Criteria

✅ Companies can choose their payment gateway (Stripe, PayPal, Square, or Manual)  
✅ Companies can connect their own payment gateway accounts  
✅ Manual payments work as default (no gateway required)  
✅ "Pay Invoice" button only shows if company has connected gateway  
✅ Each company's payments go to their own gateway account  
✅ Clients can pay invoices online (if gateway connected)  
✅ Payment processing is secure and PCI-compliant (for online payments)  
✅ Payment status updates in real-time via webhooks (if gateway connected)  
✅ Receipts are automatically generated and emailed  
✅ Refunds can be processed easily (via company's gateway)  
✅ Payment history is tracked accurately per company  
✅ Failed payments are handled gracefully  
✅ Companies can manage their gateway connection independently  
✅ Companies can switch between gateways or use manual payments  
✅ Platform doesn't handle money directly (reduces liability)  

---

## 🔮 Future Enhancements

1. **Platform Fees** - Take a percentage of each transaction as platform fee
2. **Recurring Payments** - Auto-charge clients for recurring invoices
3. **Payment Plans** - Split large invoices into installments
4. **Multiple Payment Methods** - ACH, wire transfer, PayPal (per company)
5. **Saved Payment Methods** - Allow clients to save cards for future use
6. **Payment Reminders** - Auto-send payment reminders before due date
7. **Late Fees** - Automatically add late fees to overdue invoices
8. **Discount Codes** - Apply discount codes during payment
9. **Multi-currency** - Support payments in different currencies
10. **Stripe Express Accounts** - Simplified onboarding for companies
11. **Split Payments** - Split payments between multiple companies

---

## 🔐 Security Considerations (Multi-Tenant)

1. **Company Isolation**
   - Ensure payments use correct company's Stripe account
   - Validate company_id matches invoice company
   - Prevent cross-company payment access

2. **OAuth Security**
   - Validate OAuth state tokens
   - Secure redirect URLs
   - Verify Stripe account ownership

3. **Webhook Security**
   - Verify webhook signatures
   - Route events to correct company
   - Validate event authenticity

4. **Access Control**
   - Only company admins can connect/disconnect Stripe
   - Payments only accessible by invoice owner/company
   - RLS policies enforce company isolation

---

## 🎨 Conditional UI Based on Payment Gateway

### Invoice Detail Modal Logic:
```javascript
// Check company's payment gateway
const company = await getCompanyFromInvoice(invoice);
const gateway = company.payment_gateway;

if (gateway && gateway !== 'manual' && company.payment_gateway_connected) {
  // Show "Pay Invoice" button
  showPayInvoiceButton();
} else {
  // Hide "Pay Invoice" button
  hidePayInvoiceButton();
  // Show manual payment instructions
  showManualPaymentInstructions();
}
```

### Payment Link in Invoice Email:
- Only include payment link if company has connected gateway
- If manual: "Please contact us to arrange payment"

### Invoice Status Display:
- If gateway connected: Show "Pay Now" button
- If manual: Show "Record Payment" button
- Show gateway badge (Stripe, PayPal, Square, or Manual)

---

## 📚 Payment Gateway Documentation

### Stripe Connect:
- Stripe Connect Docs: https://stripe.com/docs/connect
- OAuth Flow: https://stripe.com/docs/connect/oauth-accounts
- Express Accounts: https://stripe.com/docs/connect/express-accounts

### PayPal Business:
- PayPal Developer: https://developer.paypal.com
- OAuth Integration: https://developer.paypal.com/docs/api-basics/manage-apps/
- Payments API: https://developer.paypal.com/docs/api/payments/

### Square Connect:
- Square Developer: https://developer.squareup.com
- OAuth Integration: https://developer.squareup.com/docs/oauth-api/overview
- Payments API: https://developer.squareup.com/docs/payments-api/overview

---

## 💡 Implementation Strategy

### Phase 1: Start Simple
1. Implement manual payments as default (already works!)
2. Add Stripe Connect (most popular)
3. Add PayPal/Square later if needed

### Phase 2: Add More Gateways
- Add PayPal support
- Add Square support
- Each gateway is independent

### Benefits:
- ✅ Companies can start immediately with manual payments
- ✅ Companies can upgrade to online payments when ready
- ✅ You can add gateways incrementally
- ✅ No disruption to existing payment flow

---

**Ready to implement?** Let's start with Phase 1! 🚀

**Note:** You can start with just manual payments + one gateway (e.g., Stripe), then add more gateways later.

