# 📧 Expense Receipt Email Game Plan

## Overview
Instead of storing expense receipts in Supabase Storage, send receipts via email to the user who created the expense (or to admins) when an expense is submitted.

---

## 🎯 Goals

1. **Email Receipts** - Send expense receipts as email attachments
2. **No Storage Required** - Eliminate need for Supabase Storage bucket for receipts
3. **Email to Creator** - Send receipt to the user who created the expense
4. **Professional Email** - Well-formatted email with expense details
5. **Receipt Tracking** - Track that receipt was emailed (optional flag in database)

---

## 📋 Implementation Steps

### Step 1: Create Supabase Edge Function for Email

**Location:** `supabase/functions/send-expense-receipt-email/index.ts`

**Function Purpose:**
- Receive expense data and receipt file (base64 encoded)
- Send email with receipt as attachment
- Use Resend API (same as purchase order emails)

**Function Parameters:**
```typescript
{
  expenseId: string,
  expenseData: {
    description: string,
    amount: number,
    category: string,
    expense_date: string,
    vendor_name?: string,
    notes?: string,
    job_title?: string,
    site_name?: string
  },
  userEmail: string,
  userName: string,
  receiptFile: {
    filename: string,
    content: string, // base64 encoded
    mimeType: string
  }
}
```

**Email Content:**
- Subject: "Expense Receipt: [Description] - $[Amount]"
- HTML body with expense details
- Receipt attached as PDF/image

---

### Step 2: Update Expense Form Submission

**Changes to `reports.html`:**

**Current Flow:**
1. User fills form
2. Upload receipt to Supabase Storage
3. Get receipt URL
4. Insert expense with receipt_url

**New Flow:**
1. User fills form
2. Convert receipt file to base64
3. Insert expense (without receipt_url)
4. Call Edge Function to email receipt
5. Optionally update expense with `receipt_emailed_at` timestamp

**Form Submission Handler:**
```javascript
// On form submit:
1. Validate form
2. Get receipt file (if exists)
3. Convert receipt to base64
4. Insert expense into database (without receipt_url)
5. If receipt exists:
   - Call Edge Function with expense data and receipt
   - Show success message
6. Refresh expense list
```

---

### Step 3: Receipt File Handling

**File Conversion:**
- Read file as ArrayBuffer
- Convert to base64
- Include filename and MIME type
- Pass to Edge Function

**File Size Limits:**
- Email attachments typically limited to 10-25 MB
- Add validation for file size
- Show error if file too large

**Supported Formats:**
- Images: JPEG, PNG, GIF, WebP
- Documents: PDF

---

### Step 4: Database Schema Update (Optional)

**Option A: Track Email Status**
Add column to `expenses` table:
```sql
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS receipt_emailed_at TIMESTAMPTZ;
```

**Option B: No Storage**
- Remove `receipt_url` column (or keep it null)
- Don't store receipt anywhere
- Receipt only exists in email

**Recommendation:** Option A - Track that receipt was emailed, but don't store the file.

---

### Step 5: Edge Function Implementation

**File:** `supabase/functions/send-expense-receipt-email/index.ts`

**Dependencies:**
- Resend API (already configured for purchase orders)
- Base64 decoding for receipt

**Email Template:**
```html
Subject: Expense Receipt: [Description] - $[Amount]

Body:
- Expense Details (description, amount, category, date)
- Job/Site information (if linked)
- Vendor name (if provided)
- Notes (if provided)
- Receipt attached
```

**Attachment:**
- Filename: `expense-receipt-[expense-id]-[timestamp].[ext]`
- Content: Base64 decoded receipt file
- MIME type: From file type

---

### Step 6: Error Handling

**Scenarios:**
1. **Receipt file too large** - Show error before submission
2. **Email send fails** - Log error, show warning to user
3. **Expense saved but email failed** - Expense still created, user notified
4. **No receipt provided** - Expense created normally, no email sent

**User Feedback:**
- Success: "Expense created. Receipt sent to your email."
- Partial success: "Expense created, but receipt email failed. Please contact support."
- Error: "Failed to create expense. Please try again."

---

## 🗄️ Database Changes

### Option 1: Track Email Status (Recommended)
```sql
-- Add column to track if receipt was emailed
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS receipt_emailed_at TIMESTAMPTZ;

-- Optional: Add index
CREATE INDEX IF NOT EXISTS idx_expenses_receipt_emailed ON expenses(receipt_emailed_at);
```

### Option 2: Remove Receipt URL Column
```sql
-- If we're not storing receipts at all
ALTER TABLE expenses DROP COLUMN IF EXISTS receipt_url;
```

**Recommendation:** Keep `receipt_url` column but leave it null. Add `receipt_emailed_at` to track email status.

---

## 🔧 Technical Implementation

### Files to Modify:

1. **`reports.html`**
   - Update expense form submission handler
   - Add file to base64 conversion
   - Call Edge Function after expense creation
   - Handle email success/failure

2. **`supabase/functions/send-expense-receipt-email/index.ts`** (NEW)
   - Create Edge Function
   - Send email with Resend
   - Attach receipt file
   - Return success/error

### Key Functions:

```javascript
// Convert file to base64
async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(',')[1]; // Remove data:image/...;base64, prefix
      resolve({
        content: base64,
        filename: file.name,
        mimeType: file.type
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Send receipt email via Edge Function
async function sendExpenseReceiptEmail(expenseId, expenseData, receiptFile, userEmail, userName) {
  const { data, error } = await supabase.functions.invoke('send-expense-receipt-email', {
    body: {
      expenseId,
      expenseData,
      userEmail,
      userName,
      receiptFile
    }
  });
  
  if (error) throw error;
  return data;
}
```

---

## 📧 Email Template Design

### Subject Line:
```
Expense Receipt: [Description] - $[Amount]
```

### Email Body:
```html
<h2>Expense Receipt</h2>

<p>Your expense has been recorded:</p>

<table>
  <tr><td><strong>Description:</strong></td><td>[Description]</td></tr>
  <tr><td><strong>Amount:</strong></td><td>$[Amount]</td></tr>
  <tr><td><strong>Category:</strong></td><td>[Category]</td></tr>
  <tr><td><strong>Date:</strong></td><td>[Date]</td></tr>
  [If Job: <tr><td><strong>Job:</strong></td><td>[Job Title]</td></tr>]
  [If Site: <tr><td><strong>Site:</strong></td><td>[Site Name]</td></tr>]
  [If Vendor: <tr><td><strong>Vendor:</strong></td><td>[Vendor Name]</td></tr>]
  [If Notes: <tr><td><strong>Notes:</strong></td><td>[Notes]</td></tr>]
</table>

<p>Your receipt is attached to this email.</p>

<p>Thank you,<br>NFG ONE</p>
```

---

## ✅ Implementation Checklist

### Phase 1: Edge Function Setup
- [ ] Create `send-expense-receipt-email` Edge Function
- [ ] Set up Resend API integration
- [ ] Create email template
- [ ] Handle base64 receipt attachment
- [ ] Test email sending

### Phase 2: Database Update
- [ ] Add `receipt_emailed_at` column to expenses table
- [ ] Update RLS policies if needed
- [ ] Test database changes

### Phase 3: Frontend Updates
- [ ] Add file to base64 conversion function
- [ ] Update expense form submission handler
- [ ] Add file size validation (max 10-15 MB)
- [ ] Call Edge Function after expense creation
- [ ] Update expense with `receipt_emailed_at` on success
- [ ] Handle email errors gracefully
- [ ] Show appropriate success/error messages

### Phase 4: UI Updates
- [ ] Update receipt upload section (remove storage reference)
- [ ] Add file size limit message
- [ ] Show email status in expense list (if receipt was emailed)
- [ ] Update expense detail view (show email status)

### Phase 5: Testing
- [ ] Test with image receipt
- [ ] Test with PDF receipt
- [ ] Test without receipt
- [ ] Test with large file (should fail validation)
- [ ] Test email delivery
- [ ] Test error handling

---

## 🧪 Testing Checklist

1. **Receipt Email:**
   - [ ] Image receipt sent successfully
   - [ ] PDF receipt sent successfully
   - [ ] Email contains correct expense details
   - [ ] Receipt attachment is correct
   - [ ] Email sent to correct user

2. **No Receipt:**
   - [ ] Expense created without receipt
   - [ ] No email sent
   - [ ] No errors

3. **Error Handling:**
   - [ ] Large file rejected before submission
   - [ ] Email failure doesn't prevent expense creation
   - [ ] User sees appropriate error messages

4. **Edge Cases:**
   - [ ] Invalid file type rejected
   - [ ] Missing user email handled
   - [ ] Edge Function timeout handled

---

## 🚀 Estimated Time

- **Edge Function Setup:** 1-2 hours
- **Database Update:** 15 minutes
- **Frontend Updates:** 1-2 hours
- **UI Updates:** 30 minutes
- **Testing:** 1 hour

**Total: 4-6 hours**

---

## 📝 Notes

### Advantages:
- ✅ No storage costs
- ✅ Receipts automatically archived in email
- ✅ Users have receipts in their inbox
- ✅ Simpler implementation (no storage bucket setup)

### Considerations:
- ⚠️ Email size limits (typically 10-25 MB)
- ⚠️ Receipts not stored in database (only in email)
- ⚠️ Users must have valid email addresses
- ⚠️ Email delivery depends on email service

### Alternative Options:
1. **Email + Optional Storage** - Email receipt AND store in storage (backup)
2. **Email to Admin Only** - Send receipts to admin email instead of user
3. **Email Summary** - Send daily/weekly expense summary with all receipts

---

## 🔄 Migration Path

If receipts are already being stored:
1. Keep `receipt_url` column for existing expenses
2. New expenses use email only
3. Optional: Migrate existing receipts to email (if needed)

---

**Ready to implement?** Say "yes" to proceed! 🚀

