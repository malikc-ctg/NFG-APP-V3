# ⚡ Stripe Webhook Setup - 5 Minutes

## ✅ What Just Got Built

A complete Stripe webhook handler that automatically:
- ✅ Updates invoices when payments succeed
- ✅ Records payment failures
- ✅ Handles subscription payments
- ✅ Updates payment records
- ✅ Marks invoices as paid automatically

**No more manual payment updates!** 🎉

---

## 🚀 Quick Setup (5 minutes)

### Step 1: Get Your Webhook URL

After deploying, your webhook URL is:
```
https://YOUR_PROJECT_REF.supabase.co/functions/v1/stripe-webhook
```

Replace `YOUR_PROJECT_REF` with your Supabase project reference.

### Step 2: Add Webhook in Stripe Dashboard

1. Go to [Stripe Dashboard](https://dashboard.stripe.com) → **Developers** → **Webhooks**
2. Click **"Add endpoint"**
3. Paste your webhook URL
4. Select these events to listen to:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.succeeded`
   - `invoice.payment_succeeded` (for subscriptions)
   - `invoice.payment_failed` (for subscriptions)

5. Click **"Add endpoint"**

### Step 3: Copy Webhook Secret (Optional but Recommended)

1. After creating the endpoint, click on it
2. Find **"Signing secret"**
3. Copy it (starts with `whsec_`)

### Step 4: Add Secret to Supabase (Optional)

```bash
cd "/Users/malikcampbell/NFG APP V3"
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_your_secret_here
```

**Note:** The webhook works without this, but adding it enables signature verification for security.

---

## ✅ That's It!

Now when payments happen:
- ✅ Invoices update automatically
- ✅ Payment records created automatically
- ✅ Subscription statuses update automatically
- ✅ No manual work needed!

---

## 🧪 Test It

1. Create a test payment in Stripe
2. Check your `invoices` table - should update automatically
3. Check your `payments` table - should have new record

---

## 📊 What Events Are Handled

| Event | What It Does |
|-------|-------------|
| `payment_intent.succeeded` | Updates invoice, creates payment record |
| `payment_intent.payment_failed` | Records failure, updates payment intent |
| `charge.succeeded` | Backup handler for charge events |
| `invoice.payment_succeeded` | Handles subscription payments |
| `invoice.payment_failed` | Marks subscription as past_due |

---

## 🔍 Troubleshooting

### Webhook not receiving events?
- Check Stripe Dashboard → Webhooks → Your endpoint → **"Recent events"**
- Make sure the URL is correct
- Check Supabase Edge Function logs

### Payments not updating?
- Check Edge Function logs in Supabase Dashboard
- Verify `payment_intents` table has the Stripe payment intent ID
- Make sure invoice exists in database

---

**Done! Your payments are now fully automated!** 🚀

