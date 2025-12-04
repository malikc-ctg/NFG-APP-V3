# 🔄 Fully Automated Email Integration Guide

## ✅ Your Secrets Are Set!
I can see you already have:
- ✅ `RESEND_API_KEY` configured
- ✅ `RESEND_FROM_EMAIL` configured

**Now let's integrate emails into your code so they send automatically!**

---

## 🎯 Integration Points

### 1. **Invoice Created** → Send Invoice Email

**Where:** When invoices are created in `reports.html` or billing code

**Add this after invoice creation:**

```javascript
// After creating invoice in reports.html
import { sendInvoiceSentEmail } from './js/email-service.js'

// Get client email
const { data: client } = await supabase
  .from('user_profiles')
  .select('email, full_name')
  .eq('id', invoice.client_id)
  .single()

// Send email automatically
if (client?.email) {
  await sendInvoiceSentEmail(
    invoice,
    { email: client.email, name: client.full_name },
    'Northern Facilities Group'
  )
  console.log('✅ Invoice email sent to:', client.email)
}
```

---

### 2. **Payment Received** → Send Payment Confirmation

**Two places to add:**

#### A. In Webhook Handler (Automatic)

Update `supabase/functions/stripe-webhook/index.ts` around line 150:

```typescript
// After payment succeeds in handlePaymentSucceeded function
// Add this after creating payment record:

// Send payment confirmation email
if (invoice?.client_id) {
  const { data: client } = await supabase
    .from('user_profiles')
    .select('email, full_name')
    .eq('id', invoice.client_id)
    .single()

  if (client?.email) {
    await supabase.functions.invoke('send-automated-email', {
      body: {
        emailType: 'payment_received',
        recipientEmail: client.email,
        data: {
          payment: {
            amount: paymentAmount,
            payment_method: paymentIntent.payment_method_types?.[0] === 'us_bank_account' ? 'bank_transfer' : 'credit_card',
            payment_date: new Date().toISOString().split('T')[0],
            receipt_url: receiptUrl
          },
          invoice: {
            invoice_number: invoice.invoice_number
          },
          clientName: client.full_name || client.email,
          baseUrl: 'https://nfgone.ca'
        }
      }
    })
  }
}
```

#### B. In Manual Payment Processing

If you manually record payments, add email there too.

---

### 3. **Job Assigned** → Notify Worker

**Where:** `jobs.html` - When worker is assigned (around line 1500)

**Update the assign worker function:**

```javascript
// In jobs.html, after successfully assigning worker
const { error } = await supabase
  .from('jobs')
  .update({ assigned_worker_id: workerId })
  .eq('id', currentJobId)

if (error) {
  // Handle error
} else {
  // Send email to worker
  const { data: worker } = await supabase
    .from('user_profiles')
    .select('email, full_name')
    .eq('id', workerId)
    .single()

  const { data: site } = await supabase
    .from('sites')
    .select('name')
    .eq('id', job.site_id)
    .single()

  if (worker?.email) {
    await sendJobAssignedEmail(
      job,
      site,
      worker.email,
      worker.full_name || worker.email
    )
  }

  // ... rest of success code
}
```

**Don't forget to import at the top:**
```html
<script type="module">
  import { sendJobAssignedEmail } from './js/email-service.js'
  window.sendJobAssignedEmail = sendJobAssignedEmail
</script>
```

---

### 4. **Job Completed** → Notify Client

**Where:** `jobs.html` - When job status changes to 'completed'

**Add after job completion:**

```javascript
// When job is marked complete
if (job.status === 'completed') {
  // Get client info
  const { data: client } = await supabase
    .from('user_profiles')
    .select('email, full_name')
    .eq('id', job.client_id)
    .single()

  if (client?.email) {
    await sendJobCompletedEmail(
      job,
      client.full_name || client.email,
      client.email
    )
  }
}
```

---

### 5. **Booking Created** → Notify Client

**Where:** `bookings.html` - After booking is created (around line 820)

**Add after booking creation:**

```javascript
// After booking is created successfully
const { data: booking } = await supabase
  .from('bookings')
  .insert({...})
  .select()
  .single()

// Send confirmation email
const { data: client } = await supabase
  .from('user_profiles')
  .select('email, full_name')
  .eq('id', booking.client_id)
  .single()

if (client?.email) {
  await sendBookingCreatedEmail(
    booking,
    client.full_name || client.email,
    client.email
  )
}
```

**Import at top of bookings.html:**
```html
<script type="module" src="./js/email-service.js"></script>
```

---

## ⏰ Scheduled Reminders (Payment & Overdue)

### Setup Daily Reminder Job

Create `.github/workflows/payment-reminders.yml`:

```yaml
name: Send Payment Reminders

on:
  schedule:
    - cron: '0 9 * * *'  # Daily at 9 AM
  workflow_dispatch:  # Allow manual trigger

jobs:
  send-reminders:
    runs-on: ubuntu-latest
    steps:
      - name: Send Payment Reminders
        run: |
          curl -X POST \
            https://zqcbldgheimqrnqmbbed.supabase.co/functions/v1/send-payment-reminders \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}" \
            -H "Content-Type: application/json"
```

### Create Reminder Function

Create `supabase/functions/send-payment-reminders/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const today = new Date()
  const threeDaysFromNow = new Date(today)
  threeDaysFromNow.setDate(today.getDate() + 3)

  // Find invoices due in 3 days
  const { data: upcomingInvoices } = await supabase
    .from('invoices')
    .select('*, clients:client_id(email, full_name)')
    .eq('status', 'sent')
    .gte('balance_due', 0.01)
    .lte('due_date', threeDaysFromNow.toISOString().split('T')[0])
    .gte('due_date', today.toISOString().split('T')[0])

  // Send reminders
  for (const invoice of upcomingInvoices || []) {
    if (invoice.clients?.email) {
      await supabase.functions.invoke('send-automated-email', {
        body: {
          emailType: 'payment_reminder',
          recipientEmail: invoice.clients.email,
          data: {
            invoice: {
              invoice_number: invoice.invoice_number,
              balance_due: invoice.balance_due,
              due_date: invoice.due_date,
              id: invoice.id
            },
            clientName: invoice.clients.full_name || invoice.clients.email,
            baseUrl: 'https://nfgone.ca'
          }
        }
      })
    }
  }

  // Find overdue invoices
  const { data: overdueInvoices } = await supabase
    .from('invoices')
    .select('*, clients:client_id(email, full_name)')
    .eq('status', 'sent')
    .gte('balance_due', 0.01)
    .lt('due_date', today.toISOString().split('T')[0])

  // Send overdue notices
  for (const invoice of overdueInvoices || []) {
    if (invoice.clients?.email) {
      await supabase.functions.invoke('send-automated-email', {
        body: {
          emailType: 'invoice_overdue',
          recipientEmail: invoice.clients.email,
          data: {
            invoice: {
              invoice_number: invoice.invoice_number,
              balance_due: invoice.balance_due,
              due_date: invoice.due_date,
              id: invoice.id
            },
            clientName: invoice.clients.full_name || invoice.clients.email,
            baseUrl: 'https://nfgone.ca'
          }
        }
      })
    }
  }

  return new Response(
    JSON.stringify({ 
      success: true,
      reminders: upcomingInvoices?.length || 0,
      overdue: overdueInvoices?.length || 0
    }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
```

Deploy it:
```bash
supabase functions deploy send-payment-reminders
```

---

## 📋 Quick Checklist

### Immediate Integrations (Do Now):

- [ ] **Add email import** to `reports.html` (for invoices)
- [ ] **Add email import** to `jobs.html` (for job assignments/completions)
- [ ] **Add email import** to `bookings.html` (for booking confirmations)
- [ ] **Update webhook** to send payment emails automatically
- [ ] **Test one email** to make sure it works

### Scheduled Automation (Optional):

- [ ] **Create reminder function** (`send-payment-reminders`)
- [ ] **Deploy reminder function**
- [ ] **Set up GitHub Actions** for daily reminders
- [ ] **Test reminders** work correctly

---

## 🧪 Test Each Integration

### Test Invoice Email:
```javascript
// In browser console on reports.html
import { sendInvoiceSentEmail } from './js/email-service.js'
await sendInvoiceSentEmail(
  { id: 'test', invoice_number: 'INV-001', total_amount: '100.00', due_date: '2025-02-15' },
  { email: 'your-email@example.com', name: 'Test' },
  'NFG'
)
```

### Test Payment Email:
```javascript
await sendPaymentReceivedEmail(
  { amount: '50.00', payment_method: 'credit_card', payment_date: '2025-01-15' },
  { invoice_number: 'INV-001' },
  'Test Client',
  'your-email@example.com'
)
```

---

## 🎯 Summary

**To get fully automated:**

1. ✅ **Secrets are set** (already done!)
2. ⚠️ **Add email calls** to your code where events happen
3. ⚠️ **Add imports** to HTML files
4. ✅ **Webhook will auto-send** payment emails (after we update it)
5. ⚠️ **Set up reminders** for overdue invoices

**The emails will send automatically once you add the integration code!**

Want me to help you add these integrations to your specific files?

