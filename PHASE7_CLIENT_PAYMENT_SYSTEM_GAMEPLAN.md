# 📋 Phase 7: Client Payment System - Gameplan

## Goal
Enable clients to pay company invoices directly (credit cards + ACH)

## Overview
Create a public payment page where clients can securely pay invoices using Stripe Elements, with smart payment method selection (cards for small amounts, ACH for large amounts).

---

## Tasks Breakdown

### 7.1: Public Payment Page
- [ ] Create `payment.html` - Public payment page
- [ ] Invoice lookup by invoice number
- [ ] Display invoice details (amount, due date, items)
- [ ] Payment form with Stripe Elements
- [ ] Payment method selection (Card vs ACH)

### 7.2: Stripe Payment Elements Integration
- [ ] Install/import Stripe.js
- [ ] Create payment intent Edge Function
- [ ] Integrate Stripe Elements (card input)
- [ ] Handle payment submission
- [ ] Show payment status

### 7.3: Payment Method Optimization
- [ ] Smart payment method selection:
  - Cards for amounts < $500 (instant)
  - ACH for amounts >= $500 (lower fees)
- [ ] Show fee comparison
- [ ] Allow manual override

### 7.4: Invoice Payment Processing
- [ ] Create payment intent via Edge Function
- [ ] Process payment via Stripe
- [ ] Update invoice status
- [ ] Create payment record
- [ ] Send payment confirmation email

### 7.5: Payment Confirmation & Receipts
- [ ] Success page
- [ ] Payment receipt generation
- [ ] Email receipt to client
- [ ] Update invoice balance

### 7.6: Error Handling
- [ ] Payment failure handling
- [ ] Card declined messages
- [ ] ACH processing status
- [ ] Retry payment option

---

## Implementation Order

1. **Create payment page** (7.1)
2. **Stripe Elements integration** (7.2)
3. **Payment processing** (7.4)
4. **Smart payment method** (7.3)
5. **Confirmation & receipts** (7.5)
6. **Error handling** (7.6)

---

## Files to Create

### New Files:
- `payment.html` - Public payment page
- `js/payment.js` - Payment form logic
- `css/payment.css` - Payment page styling
- `supabase/functions/create-payment-intent/index.ts` - Create Stripe payment intent
- `supabase/functions/process-client-payment/index.ts` - Process client payment

### Update Files:
- Invoice detail view - Add "Pay Invoice" button/link
- Client portal - Link to payment page

---

## Payment Flow

```
Client receives invoice link
    ↓
Opens payment.html?invoice=INVOICE_NUMBER
    ↓
Invoice details loaded
    ↓
Select payment method (Card/ACH)
    ↓
Create payment intent
    ↓
Process payment
    ↓
Update invoice status
    ↓
Show success + send receipt
```

---

## URL Structure

- Payment page: `/payment.html?invoice=INV-001`
- Payment success: `/payment.html?success=true&invoice=INV-001`
- Payment failed: `/payment.html?failed=true&invoice=INV-001`

---

## Next Steps

Ready to begin Phase 7.1: Create Public Payment Page

