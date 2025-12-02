# 📋 Phase 6: Platform Payment Processing - Gameplan

## Goal
Charge companies for their platform subscriptions (ACH primary, card fallback)

## Overview
Automatically charge companies for their monthly/yearly subscriptions, handle payment failures, and update subscription status.

---

## Tasks Breakdown

### 6.1: Charge Subscription Edge Function
- [ ] Create `charge-subscription` Edge Function
- [ ] Fetch subscriptions due for payment
- [ ] Get company payment gateway info
- [ ] Handle Stripe charging (ACH + Card)
- [ ] Update subscription status
- [ ] Create payment records

### 6.2: ACH Payment Processing
- [ ] Check if company has bank account linked
- [ ] Create ACH payment intent
- [ ] Process ACH charge via Stripe
- [ ] Handle ACH delays (3-5 business days)
- [ ] Fallback to card if ACH not available

### 6.3: Credit Card Payment Processing
- [ ] Get company's payment method
- [ ] Create payment intent
- [ ] Process card charge
- [ ] Handle card failures
- [ ] Retry logic for declined cards

### 6.4: Payment Status Updates
- [ ] Update `platform_payments` table
- [ ] Update subscription status
- [ ] Handle successful payments
- [ ] Handle failed payments
- [ ] Update billing dates

### 6.5: Recurring Billing System
- [ ] Scheduled job to check due subscriptions
- [ ] Auto-charge on billing date
- [ ] Handle renewals
- [ ] Update period dates
- [ ] Send renewal notifications

### 6.6: Payment Failure Handling
- [ ] Mark subscription as past_due
- [ ] Send failure notifications
- [ ] Auto-retry logic
- [ ] Grace period handling
- [ ] Suspension after multiple failures

---

## Implementation Order

1. **Create Edge Function** (6.1)
2. **Implement Stripe charging** (6.2 & 6.3)
3. **Payment status updates** (6.4)
4. **Recurring billing** (6.5)
5. **Failure handling** (6.6)

---

## Files to Create

### New Files:
- `supabase/functions/charge-subscription/index.ts` - Main charging function
- `supabase/functions/process-subscription-payment/index.ts` - Payment processing
- `js/subscription-payment-handler.js` - Client-side payment handling (optional)

---

## Payment Flow

```
Monthly subscription due
    ↓
Check company payment gateway
    ↓
Try ACH first (if available)
    ↓
If ACH fails → Try Card
    ↓
If both fail → Mark past_due
    ↓
Update subscription status
    ↓
Create payment record
    ↓
Send receipt/notification
```

---

## Next Steps

Ready to begin Phase 6.1: Charge Subscription Edge Function

