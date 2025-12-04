# 📧 Automated Emails Setup - Complete Guide

## ✅ What's Been Built

A comprehensive automated email system that sends professional emails for:

- ✅ **Invoice Sent** - When invoice is created
- ✅ **Payment Received** - When payment is processed
- ✅ **Payment Reminder** - Before due date
- ✅ **Invoice Overdue** - After due date
- ✅ **Job Assigned** - When worker gets new job
- ✅ **Job Completed** - When job is finished
- ✅ **Booking Created** - When booking is confirmed

---

## 🚀 Quick Setup (10 minutes)

### Step 1: Get Resend API Key

1. Go to [resend.com](https://resend.com)
2. Sign up (free tier: 100 emails/day)
3. Go to **API Keys** → **Create API Key**
4. Copy your key (starts with `re_`)

### Step 2: Set Up Secrets

```bash
cd "/Users/malikcampbell/NFG APP V3"

# Set Resend API key
supabase secrets set RESEND_API_KEY=re_your_key_here

# Set from email (use your verified domain)
supabase secrets set RESEND_FROM_EMAIL="NFG <noreply@yourdomain.com>"
```

**Or use Resend's test domain:**
```bash
supabase secrets set RESEND_FROM_EMAIL="NFG <onboarding@resend.dev>"
```

### Step 3: Deploy Function

```bash
supabase functions deploy send-automated-email
```

### Step 4: Test It!

Call the function from your code:
```javascript
await supabase.functions.invoke('send-automated-email', {
  body: {
    emailType: 'invoice_sent',
    recipientEmail: 'client@example.com',
    data: {
      invoice: { invoice_number: 'INV-001', total_amount: '100.00', due_date: '2025-02-01' },
      client: { name: 'John Doe' },
      companyName: 'Northern Facilities Group',
      baseUrl: 'https://nfgone.ca'
    }
  }
})
```

---

## 📧 Email Types

### 1. Invoice Sent
```javascript
{
  emailType: 'invoice_sent',
  recipientEmail: 'client@example.com',
  data: {
    invoice: { id, invoice_number, total_amount, due_date },
    client: { name, email },
    companyName: 'NFG',
    baseUrl: 'https://nfgone.ca'
  }
}
```

### 2. Payment Received
```javascript
{
  emailType: 'payment_received',
  recipientEmail: 'client@example.com',
  data: {
    payment: { amount, payment_method, payment_date, receipt_url },
    invoice: { invoice_number },
    clientName: 'John Doe',
    baseUrl: 'https://nfgone.ca'
  }
}
```

### 3. Payment Reminder
```javascript
{
  emailType: 'payment_reminder',
  recipientEmail: 'client@example.com',
  data: {
    invoice: { invoice_number, balance_due, due_date },
    clientName: 'John Doe',
    baseUrl: 'https://nfgone.ca'
  }
}
```

### 4. Invoice Overdue
```javascript
{
  emailType: 'invoice_overdue',
  recipientEmail: 'client@example.com',
  data: {
    invoice: { invoice_number, balance_due, due_date },
    clientName: 'John Doe',
    baseUrl: 'https://nfgone.ca'
  }
}
```

### 5. Job Assigned
```javascript
{
  emailType: 'job_assigned',
  recipientEmail: 'worker@example.com',
  data: {
    job: { id, title, scheduled_date, priority, description },
    site: { name },
    workerName: 'Jane Smith',
    baseUrl: 'https://nfgone.ca'
  }
}
```

### 6. Job Completed
```javascript
{
  emailType: 'job_completed',
  recipientEmail: 'client@example.com',
  data: {
    job: { id, title, completed_by },
    client: { name },
    baseUrl: 'https://nfgone.ca'
  }
}
```

### 7. Booking Created
```javascript
{
  emailType: 'booking_created',
  recipientEmail: 'client@example.com',
  data: {
    booking: { id, title, scheduled_date, scheduled_time },
    client: { name },
    baseUrl: 'https://nfgone.ca'
  }
}
```

---

## 🔗 Integration Points

### When Invoice is Created
```javascript
// In your invoice creation code
await supabase.functions.invoke('send-automated-email', {
  body: {
    emailType: 'invoice_sent',
    recipientEmail: clientEmail,
    data: {
      invoice: invoiceData,
      client: clientData,
      companyName: 'Northern Facilities Group',
      baseUrl: window.location.origin
    }
  }
})
```

### When Payment is Received
```javascript
// In payment processing (or webhook)
await supabase.functions.invoke('send-automated-email', {
  body: {
    emailType: 'payment_received',
    recipientEmail: clientEmail,
    data: {
      payment: paymentData,
      invoice: invoiceData,
      clientName: clientName,
      baseUrl: window.location.origin
    }
  }
})
```

### When Job is Assigned
```javascript
// In job assignment code
await supabase.functions.invoke('send-automated-email', {
  body: {
    emailType: 'job_assigned',
    recipientEmail: workerEmail,
    data: {
      job: jobData,
      site: siteData,
      workerName: workerName,
      baseUrl: window.location.origin
    }
  }
})
```

---

## ⏰ Automated Triggers (Database Level)

To automatically send emails when events happen, create database triggers:

### Invoice Created Trigger
```sql
CREATE OR REPLACE FUNCTION send_invoice_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Call Edge Function via pg_net (requires setup)
  -- Or use a queue system
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER invoice_created_email
  AFTER INSERT ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION send_invoice_email();
```

**Note:** Direct database triggers calling Edge Functions require `pg_net` extension. Alternatively, call from your application code after creating records.

---

## 📅 Scheduled Reminders

For payment reminders and overdue invoices, set up a scheduled job:

### Option 1: GitHub Actions (Free)
Create `.github/workflows/send-payment-reminders.yml`:
```yaml
name: Send Payment Reminders

on:
  schedule:
    - cron: '0 9 * * *'  # Daily at 9 AM

jobs:
  send-reminders:
    runs-on: ubuntu-latest
    steps:
      - name: Send Reminders
        run: |
          curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/send-payment-reminders \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}"
```

### Option 2: Cron Job Service
Use cron-job.org or EasyCron to call a reminder function daily.

---

## 🎨 Customization

### Change Email Template
Edit `supabase/functions/send-automated-email/index.ts`:
- Modify `createEmailTemplate()` function
- Update colors, fonts, layout
- Add your branding

### Change From Email
Update the secret:
```bash
supabase secrets set RESEND_FROM_EMAIL="Your Name <your-email@yourdomain.com>"
```

---

## ✅ Testing Checklist

- [ ] Invoice sent email
- [ ] Payment received email
- [ ] Payment reminder email
- [ ] Invoice overdue email
- [ ] Job assigned email
- [ ] Job completed email
- [ ] Booking created email

---

## 💰 Costs

**Resend Free Tier:**
- 100 emails/day
- 3,000 emails/month

**Resend Paid:**
- $20/month for 50,000 emails
- Perfect for production

---

## 🚀 You're Done!

Your automated email system is ready! Emails will be sent automatically when you call the function from your code.

**Next Steps:**
1. Integrate email calls into your invoice/payment/job creation code
2. Set up payment reminders (scheduled job)
3. Test all email types
4. Customize templates to match your brand

---

**Questions?** Check the Edge Function logs in Supabase Dashboard → Functions → send-automated-email → Logs

