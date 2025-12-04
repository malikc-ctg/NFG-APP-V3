# ⚡ Automated Emails - Quick Start

## ✅ What's Ready

Complete automated email system with 7 email types:
- Invoice Sent
- Payment Received  
- Payment Reminder
- Invoice Overdue
- Job Assigned
- Job Completed
- Booking Created

**Function deployed and ready to use!** 🚀

---

## 🔧 Setup (2 Steps)

### Step 1: Get Resend API Key

1. Go to [resend.com](https://resend.com) → Sign up (free!)
2. **API Keys** → Create new key
3. Copy key (starts with `re_`)

### Step 2: Add Secrets

```bash
cd "/Users/malikcampbell/NFG APP V3"

# Add Resend API key
supabase secrets set RESEND_API_KEY=re_your_key_here

# Add from email (use your domain or Resend's test domain)
supabase secrets set RESEND_FROM_EMAIL="NFG <noreply@yourdomain.com>"

# OR use Resend's test domain:
supabase secrets set RESEND_FROM_EMAIL="NFG <onboarding@resend.dev>"
```

**Done!** Emails are now ready to send! ✅

---

## 💻 How to Use

### Option 1: Use Helper Functions (Easiest)

Add to your HTML:
```html
<script type="module" src="./js/email-service.js"></script>
```

Then in your code:
```javascript
import { sendInvoiceSentEmail, sendPaymentReceivedEmail } from './js/email-service.js'

// Send invoice email
await sendInvoiceSentEmail(
  invoice,           // Invoice object
  client,            // Client object with email
  'Northern Facilities Group'  // Company name
)

// Send payment email
await sendPaymentReceivedEmail(
  payment,           // Payment object
  invoice,           // Invoice object
  'John Doe',        // Client name
  'client@example.com'  // Client email
)
```

### Option 2: Direct Function Call

```javascript
await supabase.functions.invoke('send-automated-email', {
  body: {
    emailType: 'invoice_sent',
    recipientEmail: 'client@example.com',
    data: {
      invoice: { invoice_number: 'INV-001', total_amount: '100.00', due_date: '2025-02-01' },
      client: { name: 'John Doe', email: 'client@example.com' },
      companyName: 'Northern Facilities Group',
      baseUrl: window.location.origin
    }
  }
})
```

---

## 📧 All Available Email Types

| Email Type | Function | Use Case |
|------------|----------|----------|
| `invoice_sent` | `sendInvoiceSentEmail()` | When invoice is created |
| `payment_received` | `sendPaymentReceivedEmail()` | When payment succeeds |
| `payment_reminder` | `sendPaymentReminderEmail()` | Before due date |
| `invoice_overdue` | `sendInvoiceOverdueEmail()` | After due date |
| `job_assigned` | `sendJobAssignedEmail()` | When worker gets job |
| `job_completed` | `sendJobCompletedEmail()` | When job finishes |
| `booking_created` | `sendBookingCreatedEmail()` | When booking confirmed |

---

## 🎯 Quick Integration Examples

### Send Email When Invoice Created
```javascript
// After creating invoice
const { data: invoice } = await supabase
  .from('invoices')
  .insert({...})
  .select()
  .single()

// Send email
await sendInvoiceSentEmail(invoice, client)
```

### Send Email When Payment Received
```javascript
// After payment (or in webhook)
await sendPaymentReceivedEmail(payment, invoice, clientName, clientEmail)
```

### Send Email When Job Assigned
```javascript
// After assigning job to worker
await sendJobAssignedEmail(job, site, workerEmail, workerName)
```

---

## 🧪 Test It

```javascript
// Test invoice email
await sendInvoiceSentEmail(
  {
    id: 'test-123',
    invoice_number: 'INV-001',
    total_amount: '150.00',
    due_date: '2025-02-15'
  },
  {
    name: 'Test Client',
    email: 'your-email@example.com'  // Use your real email
  }
)
```

Check your inbox! 📬

---

## 📚 Full Documentation

See `AUTOMATED_EMAILS_SETUP.md` for:
- Detailed setup instructions
- All email templates
- Scheduled reminders
- Customization guide

---

## ✅ Next Steps

1. ✅ Add Resend API key (2 minutes)
2. ✅ Test one email type
3. ✅ Integrate into your invoice/payment/job code
4. ✅ Set up payment reminders (optional)

**That's it! Your emails are automated!** 🎉

