# 🏦 ACH Bank Account Payment Testing Guide

## ✅ What's Already Built

Your payment system supports **ACH (bank account) payments** using Stripe's US Bank Account element. Here's what's implemented:

- ✅ ACH payment option in payment page
- ✅ Stripe `usBankAccount` element integration
- ✅ Payment intent creation with ACH support
- ✅ Automatic method selection (ACH for $500+, Card for <$500)
- ✅ Bank account validation
- ✅ Payment processing via Stripe

---

## 🧪 Testing ACH Payments

### Prerequisites

1. **Stripe Test Mode**: Make sure you're using Stripe test keys
2. **Test Bank Account**: Use Stripe's test bank account numbers
3. **Invoice**: Create a test invoice (preferably $500+ to default to ACH)

---

## 📋 Step-by-Step Testing

### Step 1: Create Test Invoice

1. Go to **Reports → Billing**
2. Click **"Create Invoice"**
3. Fill in:
   - Client: Any test client
   - Amount: **$500 or more** (to default to ACH)
   - Due Date: Any future date
4. Click **"Create Invoice"**

### Step 2: Open Payment Page

1. Copy the invoice ID from the invoice
2. Visit: `payment.html?invoice_id=YOUR_INVOICE_ID`
3. Or click the **"Pay"** button in the invoices table

### Step 3: Select ACH Payment

1. On the payment page, click **"Bank Account"** button
2. The ACH payment form will appear

### Step 4: Enter Test Bank Account

Use Stripe's test bank account numbers:

#### ✅ **Success Test Account**
```
Account Number: 000123456789
Routing Number: 110000000
Account Holder Name: Test Account
```

#### ❌ **Decline Test Account**
```
Account Number: 000111111116
Routing Number: 110000000
Account Holder Name: Test Account
```

#### ⚠️ **Requires Verification**
```
Account Number: 000222222227
Routing Number: 110000000
Account Holder Name: Test Account
```

### Step 5: Complete Payment

1. Enter billing email
2. Click **"Pay $XXX.XX"**
3. Stripe will process the payment

---

## 🎯 What to Expect

### Successful ACH Payment

1. **Immediate**: Payment Intent created with status `processing`
2. **5-7 Days**: Payment status changes to `succeeded` (in test mode, this happens faster)
3. **Email**: Receipt sent to billing email
4. **Invoice**: Updated to `paid` status
5. **Database**: Payment record created in `payments` table

### Payment Status Flow

```
processing → succeeded (after verification)
```

In **test mode**, ACH payments complete almost immediately.

---

## 🔍 Verification Steps

### 1. Check Payment Intent Status

After submitting payment, check:
- Browser console for payment intent status
- Stripe Dashboard → Payments → Payment Intents

### 2. Check Database

```sql
-- Check payments table
SELECT * FROM payments 
WHERE invoice_id = 'YOUR_INVOICE_ID'
ORDER BY created_at DESC;

-- Check invoice status
SELECT id, invoice_number, status, balance_due 
FROM invoices 
WHERE id = 'YOUR_INVOICE_ID';
```

### 3. Check Stripe Dashboard

1. Go to https://dashboard.stripe.com/test/payments
2. Find your payment intent
3. Check:
   - Status: Should be `succeeded`
   - Payment Method: `us_bank_account`
   - Amount: Correct invoice amount

---

## 🐛 Common Issues & Solutions

### Issue 1: "Bank account element not showing"

**Solution:**
- Make sure invoice amount is $500+ (defaults to ACH)
- Check browser console for errors
- Verify Stripe publishable key is set correctly

### Issue 2: "Payment requires verification"

**Solution:**
- This is normal for ACH payments
- In test mode, verification happens automatically
- Use test account: `000222222227` to test verification flow

### Issue 3: "Payment failed"

**Solution:**
- Check Stripe Dashboard for error details
- Verify test bank account numbers are correct
- Check browser console for error messages

### Issue 4: "ACH option not available"

**Solution:**
- Check `create-payment-intent` function includes `us_bank_account`
- Verify invoice amount (ACH preferred for $500+)
- Check Stripe account has ACH enabled

---

## 🧪 Test Scenarios

### Scenario 1: Small Amount (< $500)
- **Expected**: Card payment shown first, ACH as option
- **Test**: Create $100 invoice, verify card is default

### Scenario 2: Large Amount (≥ $500)
- **Expected**: ACH payment shown first, Card as option
- **Test**: Create $500 invoice, verify ACH is default

### Scenario 3: Successful ACH Payment
- **Expected**: Payment processes, invoice marked paid
- **Test**: Use success test account, verify all steps

### Scenario 4: Failed ACH Payment
- **Expected**: Error message shown, invoice remains unpaid
- **Test**: Use decline test account, verify error handling

### Scenario 5: ACH Verification Required
- **Expected**: Payment requires verification, then succeeds
- **Test**: Use verification test account, verify flow

---

## 📊 Stripe Test Bank Accounts

| Account Number | Routing | Result | Use Case |
|---------------|---------|--------|----------|
| `000123456789` | `110000000` | ✅ Success | Normal payment |
| `000111111116` | `110000000` | ❌ Decline | Test failures |
| `000222222227` | `110000000` | ⚠️ Verify | Test verification |

**Routing Number**: Always use `110000000` for test accounts

---

## 🔧 Debugging Tips

### Enable Stripe Test Mode

Make sure you're using test keys:
- Publishable Key: `pk_test_...`
- Secret Key: `sk_test_...`

### Check Browser Console

Look for:
- Payment intent creation
- Stripe Elements errors
- Network request failures

### Check Stripe Dashboard

Monitor:
- Payment Intents → Check status
- Events → See webhook events
- Logs → View API calls

---

## ✅ Testing Checklist

- [ ] Create test invoice ($500+)
- [ ] Open payment page
- [ ] Select ACH payment method
- [ ] Enter test bank account
- [ ] Submit payment
- [ ] Verify payment intent created
- [ ] Check invoice status updated
- [ ] Verify payment record in database
- [ ] Check receipt email sent
- [ ] Test with different amounts
- [ ] Test success/failure scenarios

---

## 🚀 Production Notes

### ACH Payment Processing Time

- **Test Mode**: Instant (simulated)
- **Live Mode**: 5-7 business days
- **Fees**: Lower than credit cards (typically 0.8% + $0.25)

### Requirements for Live ACH

1. **Stripe Account**: Must have ACH enabled
2. **Verification**: Stripe handles automatically
3. **Compliance**: Stripe handles PCI compliance
4. **Webhooks**: Set up to handle payment status updates

---

## 📝 Next Steps

After testing:
1. ✅ Verify all test scenarios pass
2. ✅ Check payment history shows ACH payments
3. ✅ Test webhook updates (if configured)
4. ✅ Verify email receipts include payment method
5. ✅ Test with real bank account (in test mode)

---

## 🎉 You're Ready!

Your ACH payment system is fully implemented and ready for testing. Use the test bank accounts above to verify everything works correctly!

**Questions?** Check Stripe docs: https://stripe.com/docs/payments/ach-debit

