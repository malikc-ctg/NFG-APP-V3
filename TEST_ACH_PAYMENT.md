# 🧪 Quick ACH Payment Test

## ⚡ Fast Test (5 minutes)

### 1. Create Test Invoice
```
Reports → Billing → Create Invoice
- Amount: $500 (or more)
- Client: Any test client
- Save invoice
```

### 2. Get Payment Link
```
Copy invoice ID from invoices table
Or click "Pay" button
```

### 3. Test ACH Payment
```
1. Open payment page
2. Click "Bank Account" button
3. Enter test bank account:
   - Account: 000123456789
   - Routing: 110000000
   - Name: Test Account
4. Enter email
5. Click "Pay"
```

### 4. Verify Success
```
✅ Payment intent created
✅ Invoice status = "paid"
✅ Payment record in database
✅ Receipt email sent
```

---

## 🎯 Test Bank Accounts

### ✅ Success
```
Account: 000123456789
Routing: 110000000
```

### ❌ Decline
```
Account: 000111111116
Routing: 110000000
```

### ⚠️ Verification Required
```
Account: 000222222227
Routing: 110000000
```

---

## 🔍 Quick Verification

### Check Database
```sql
SELECT * FROM payments 
WHERE payment_method = 'bank_transfer'
ORDER BY created_at DESC 
LIMIT 5;
```

### Check Stripe Dashboard
```
https://dashboard.stripe.com/test/payments
Look for: us_bank_account payment method
```

---

## ✅ Expected Results

- Payment Intent: `processing` → `succeeded`
- Invoice Status: `sent` → `paid`
- Payment Record: Created in `payments` table
- Email: Receipt sent to billing email
- Payment History: Shows in Reports → Billing → Payment History

---

## 🐛 If Something Fails

1. **Check browser console** for errors
2. **Check Stripe Dashboard** for payment intent status
3. **Check database** for payment record
4. **Verify** you're using test mode keys
5. **Check** invoice amount is $500+ (defaults to ACH)

---

## 🎉 That's It!

Your ACH payment system is ready. Test it now! 🚀

