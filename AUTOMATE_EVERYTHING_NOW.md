# 🚀 Automate Everything - Step-by-Step Guide

## ✅ What You Have
- ✅ Resend API Key configured
- ✅ Email service function deployed
- ✅ All email templates ready

## 🎯 What To Do Now

### Step 1: Update Webhook to Send Payment Emails (2 minutes)

**File:** `supabase/functions/stripe-webhook/index.ts`

**Find:** Line ~195 (after payment record is created)

**Add this code:**

```typescript
    // Send payment confirmation email
    if (invoice?.client_id) {
      const { data: client } = await supabase
        .from('user_profiles')
        .select('email, full_name')
        .eq('id', invoice.client_id)
        .single()

      if (client?.email) {
        try {
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
                  invoice_number: invoice.invoice_number,
                  id: invoice.id
                },
                clientName: client.full_name || client.email,
                baseUrl: 'https://nfgone.ca'
              }
            }
          })
          console.log('✅ Payment confirmation email sent to:', client.email)
        } catch (emailError) {
          console.error('Failed to send payment email:', emailError)
          // Don't fail the webhook if email fails
        }
      }
    }
```

**Deploy:**
```bash
supabase functions deploy stripe-webhook
```

---

### Step 2: Add Email to Invoice Creation (3 minutes)

**Find where invoices are created** - likely in `reports.html` or a billing JavaScript file.

**After invoice is created, add:**

```javascript
// Import email service at top of file
import { sendInvoiceSentEmail } from './js/email-service.js'

// After invoice insert succeeds:
const { data: newInvoice } = await supabase
  .from('invoices')
  .insert({...})
  .select()
  .single()

// Send email automatically
if (newInvoice) {
  const { data: client } = await supabase
    .from('user_profiles')
    .select('email, full_name')
    .eq('id', newInvoice.client_id)
    .single()

  if (client?.email) {
    await sendInvoiceSentEmail(
      newInvoice,
      { email: client.email, name: client.full_name || client.email },
      'Northern Facilities Group'
    )
    console.log('✅ Invoice email sent to:', client.email)
  }
}
```

**Don't forget:** Add this to your HTML:
```html
<script type="module" src="./js/email-service.js"></script>
```

---

### Step 3: Add Email to Job Assignment (2 minutes)

**File:** `jobs.html`

**Find:** Around line 1500 where worker is assigned

**After successful assignment:**

```javascript
// After: await supabase.from('jobs').update({ assigned_worker_id: workerId })

// Get worker and job details
const { data: worker } = await supabase
  .from('user_profiles')
  .select('email, full_name')
  .eq('id', workerId)
  .single()

const { data: jobData } = await supabase
  .from('jobs')
  .select('*, sites:site_id(name)')
  .eq('id', currentJobId)
  .single()

const { data: site } = await supabase
  .from('sites')
  .select('name')
  .eq('id', jobData?.site_id)
  .single()

// Send email
if (worker?.email && jobData) {
  await sendJobAssignedEmail(
    jobData,
    site,
    worker.email,
    worker.full_name || worker.email
  )
}
```

**Add import at top:**
```html
<script type="module">
  import { sendJobAssignedEmail } from './js/email-service.js'
  window.sendJobAssignedEmail = sendJobAssignedEmail
</script>
```

---

### Step 4: Add Email to Booking Creation (2 minutes)

**File:** `bookings.html`

**Find:** Around line 820 after booking is created

**After booking insert succeeds:**

```javascript
// After: const { data: booking } = await supabase.from('bookings').insert({...})

// Get client info
const { data: client } = await supabase
  .from('user_profiles')
  .select('email, full_name')
  .eq('id', booking.client_id)
  .single()

// Send confirmation email
if (client?.email) {
  await sendBookingCreatedEmail(
    booking,
    client.full_name || client.email,
    client.email
  )
  console.log('✅ Booking confirmation sent to:', client.email)
}
```

**Add import:**
```html
<script type="module" src="./js/email-service.js"></script>
```

---

### Step 5: Add Email to Job Completion (2 minutes)

**File:** `jobs.html`

**Find:** Where job status changes to 'completed'

**Add after job completion:**

```javascript
// When job is marked complete
if (updatedJob.status === 'completed') {
  const { data: client } = await supabase
    .from('user_profiles')
    .select('email, full_name')
    .eq('id', updatedJob.client_id)
    .single()

  if (client?.email) {
    await sendJobCompletedEmail(
      updatedJob,
      client.full_name || client.email,
      client.email
    )
  }
}
```

---

## 📋 Quick Checklist

Do these in order:

- [ ] **Step 1:** Update webhook to send payment emails
- [ ] **Step 2:** Add invoice email to invoice creation code
- [ ] **Step 3:** Add job assignment email to jobs.html
- [ ] **Step 4:** Add booking email to bookings.html  
- [ ] **Step 5:** Add job completion email to jobs.html
- [ ] **Test:** Create a test invoice/job/booking and verify email sends

---

## 🧪 Test It

### Test Payment Email:
Make a test payment → Check webhook logs → Email should send automatically!

### Test Invoice Email:
Create a test invoice → Check email arrives!

### Test Job Assignment:
Assign a job to yourself → Check email!

---

## ⏰ Optional: Payment Reminders

Want automatic payment reminders? I can help you set that up next - it requires a scheduled job.

---

## 🎯 That's It!

Once you add these integrations:
- ✅ **Payments** → Email sent automatically (via webhook)
- ✅ **Invoices** → Email sent when created
- ✅ **Job Assignments** → Worker gets email
- ✅ **Bookings** → Client gets confirmation
- ✅ **Job Completion** → Client gets notification

**Everything is automated!** 🚀

Want me to help you add these integrations to your specific files? Just tell me which one to start with!

