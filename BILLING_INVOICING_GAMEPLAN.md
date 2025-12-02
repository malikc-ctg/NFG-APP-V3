# 💰 Billing & Invoicing System - Implementation Gameplan

**Status:** Ready to implement  
**Time Estimate:** 2-3 weeks  
**Priority:** 🔥 CRITICAL - Revenue Generator

---

## 📋 Overview

Build a complete billing and invoicing system that allows admins to:
- Generate invoices from completed jobs
- Create manual invoices
- Track payments
- Manage expenses
- Send invoices to clients
- Generate PDF invoices
- Track payment status

---

## 🎯 Phase Breakdown

### **Phase 1: Core Invoice Management** (Week 1, Days 1-3)
**Goal:** Create, view, edit, delete invoices

**Tasks:**
1. Create `billing.html` page with invoice list
2. Create `js/billing.js` for invoice management
3. Invoice list view with filters (status, date, client)
4. Create invoice modal/form
5. Edit invoice functionality
6. Delete invoice (with confirmation)
7. Invoice detail view modal
8. Basic invoice number generation

**Deliverables:**
- `billing.html` - Main billing page
- `js/billing.js` - Core invoice logic
- Invoice CRUD operations working

---

### **Phase 2: Invoice Generation from Jobs** (Week 1, Days 4-5)
**Goal:** Auto-generate invoices from completed jobs

**Tasks:**
1. "Create Invoice from Job" button in job detail modal
2. Auto-populate invoice with job details
3. Convert job tasks to invoice line items
4. Calculate totals based on job data
5. Link invoice to job
6. Bulk invoice generation (multiple jobs)

**Deliverables:**
- Job-to-invoice conversion
- Bulk invoice creation
- Job-invoice linking

---

### **Phase 3: Line Items & Pricing** (Week 2, Days 1-2)
**Goal:** Manage invoice line items with pricing

**Tasks:**
1. Add/edit/remove line items in invoice form
2. Quantity and unit price calculations
3. Line total calculations
4. Subtotal, tax, discount calculations
5. Total amount calculation
6. Service catalog integration (optional)
7. Recurring line items (subscription services)

**Deliverables:**
- Line item management
- Automatic calculations
- Tax and discount support

---

### **Phase 4: PDF Generation** (Week 2, Days 3-4)
**Goal:** Generate professional PDF invoices

**Tasks:**
1. Install jsPDF library
2. Create invoice PDF template
3. Include company branding/logo
4. Format invoice details (number, dates, client info)
5. Format line items table
6. Include totals and payment terms
7. Download PDF functionality
8. Email PDF (optional - Phase 5)

**Deliverables:**
- PDF invoice generation
- Professional invoice template
- Download functionality

---

### **Phase 5: Payment Tracking** (Week 2, Days 5)
**Goal:** Record and track payments

**Tasks:**
1. Add payment modal/form
2. Payment method selection
3. Payment amount and date
4. Reference number (check #, transaction ID)
5. Update invoice balance automatically
6. Payment history view
7. Mark invoice as paid when balance = 0
8. Partial payment support

**Deliverables:**
- Payment recording
- Automatic balance updates
- Payment history

---

### **Phase 6: Invoice Status & Workflow** (Week 3, Days 1-2)
**Goal:** Manage invoice lifecycle

**Tasks:**
1. Invoice status workflow (draft → sent → paid)
2. "Send Invoice" functionality (email or mark as sent)
3. Overdue detection (auto-mark overdue)
4. Payment reminders (manual or auto)
5. Invoice cancellation
6. Status change notifications
7. Due date tracking

**Deliverables:**
- Complete invoice workflow
- Overdue detection
- Status management

---

### **Phase 7: Expense Tracking** (Week 3, Days 3-4)
**Goal:** Track business expenses

**Tasks:**
1. Expense entry form
2. Expense categories (supplies, equipment, travel, labor, other)
3. Link expenses to jobs/sites
4. Expense list view with filters
5. Expense reports
6. Receipt upload (optional)
7. Expense totals by category/period

**Deliverables:**
- Expense management
- Expense reporting
- Category tracking

---

### **Phase 8: Reports & Analytics** (Week 3, Day 5)
**Goal:** Financial reporting

**Tasks:**
1. Revenue reports (by period, client, site)
2. Outstanding invoices report
3. Payment history report
4. Expense reports
5. Profit/loss summary
6. Aging report (30/60/90 days overdue)
7. Export reports to CSV/PDF

**Deliverables:**
- Financial reports
- Analytics dashboard
- Export functionality

---

## 🗂️ File Structure

```
billing.html                    # Main billing page
js/billing.js                   # Core billing logic
js/invoice-pdf.js              # PDF generation
css/billing.css                # Billing-specific styles (optional)
ADD_BILLING_INVOICING_TABLES.sql  # Already exists ✅
```

---

## 📊 Database Schema (Already Exists)

✅ **Tables:**
- `invoices` - Main invoice records
- `invoice_line_items` - Line items for each invoice
- `payments` - Payment records
- `expenses` - Expense tracking

✅ **Features:**
- Auto invoice number generation
- Balance calculation triggers
- Payment tracking
- Expense categorization

---

## 🎨 UI/UX Design

### **Main Billing Page (`billing.html`)**
- **Header:** Summary cards (Total Revenue, Outstanding, Overdue, Paid This Month)
- **Filters:** Status, Date Range, Client, Site
- **Table:** Invoice list with columns:
  - Invoice Number
  - Client/Site
  - Issue Date
  - Due Date
  - Amount
  - Status
  - Balance Due
  - Actions (View, Edit, Delete, PDF)
- **Actions:** "New Invoice" button, "Create from Job" button

### **Invoice Form Modal**
- **Basic Info:**
  - Client selection
  - Site selection (if client selected)
  - Job selection (optional)
  - Issue date
  - Due date
  - Payment terms
  - Notes
- **Line Items:**
  - Add/Edit/Remove line items
  - Description, Quantity, Unit Price, Line Total
  - Subtotal, Tax Rate, Tax Amount
  - Discount (amount or %)
  - Total Amount
- **Actions:** Save Draft, Send Invoice, Cancel

### **Payment Modal**
- Payment amount
- Payment date
- Payment method (cash, check, credit card, bank transfer, other)
- Reference number
- Notes
- Auto-calculate remaining balance

---

## 🔧 Technical Implementation

### **Invoice Number Generation**
```javascript
// Format: INV-YYYY-XXX (e.g., INV-2024-001)
async function generateInvoiceNumber() {
  const year = new Date().getFullYear();
  const { data } = await supabase
    .from('invoices')
    .select('invoice_number')
    .like('invoice_number', `INV-${year}-%`)
    .order('invoice_number', { ascending: false })
    .limit(1);
  
  if (data && data.length > 0) {
    const lastNum = parseInt(data[0].invoice_number.split('-')[2]);
    return `INV-${year}-${String(lastNum + 1).padStart(3, '0')}`;
  }
  return `INV-${year}-001`;
}
```

### **PDF Generation (jsPDF)**
```javascript
import { jsPDF } from 'jspdf';

function generateInvoicePDF(invoice) {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(20);
  doc.text('INVOICE', 20, 20);
  
  // Invoice details
  doc.setFontSize(12);
  doc.text(`Invoice #: ${invoice.invoice_number}`, 20, 40);
  doc.text(`Date: ${invoice.issue_date}`, 20, 50);
  doc.text(`Due: ${invoice.due_date}`, 20, 60);
  
  // Client info
  doc.text(`Bill To:`, 120, 40);
  doc.text(invoice.client_name, 120, 50);
  
  // Line items table
  // ... table generation code
  
  // Totals
  doc.text(`Subtotal: $${invoice.subtotal}`, 150, 200);
  doc.text(`Tax: $${invoice.tax_amount}`, 150, 210);
  doc.text(`Total: $${invoice.total_amount}`, 150, 220);
  
  doc.save(`invoice-${invoice.invoice_number}.pdf`);
}
```

### **Auto-Balance Calculation**
```javascript
// Trigger in database handles this, but we can also calculate client-side
function calculateInvoiceTotals(lineItems, taxRate, discountAmount, discountPercent) {
  const subtotal = lineItems.reduce((sum, item) => 
    sum + (item.quantity * item.unit_price), 0
  );
  
  const discount = discountAmount || (subtotal * (discountPercent / 100));
  const tax = (subtotal - discount) * (taxRate / 100);
  const total = subtotal - discount + tax;
  
  return { subtotal, discount, tax, total };
}
```

---

## 🔐 Security & Permissions

### **RLS Policies Needed:**
- Admins: Full access (create, read, update, delete)
- Staff: Read-only access (view invoices)
- Clients: View own invoices only (via client portal)

### **Access Control:**
- Only admins can create/edit/delete invoices
- Staff can view and add payments
- Clients can view their invoices (read-only)

---

## 📧 Email Integration (Future)

### **Phase 9: Email Invoices** (Optional)
- Send invoice PDF via email
- Payment reminder emails
- Payment confirmation emails
- Use Supabase Edge Functions + Resend/SendGrid

---

## ✅ Testing Checklist

### **Phase 1 Testing:**
- [ ] Create new invoice
- [ ] Edit invoice
- [ ] Delete invoice
- [ ] View invoice details
- [ ] Filter invoices by status
- [ ] Filter invoices by date
- [ ] Filter invoices by client

### **Phase 2 Testing:**
- [ ] Create invoice from job
- [ ] Line items auto-populate from job
- [ ] Invoice linked to job correctly
- [ ] Bulk invoice creation works

### **Phase 3 Testing:**
- [ ] Add line items
- [ ] Edit line items
- [ ] Remove line items
- [ ] Calculations correct (subtotal, tax, total)
- [ ] Discount calculations work

### **Phase 4 Testing:**
- [ ] PDF generates correctly
- [ ] PDF includes all invoice details
- [ ] PDF formatting is professional
- [ ] PDF downloads successfully

### **Phase 5 Testing:**
- [ ] Add payment
- [ ] Balance updates automatically
- [ ] Invoice marked as paid when balance = 0
- [ ] Partial payments work
- [ ] Payment history displays

### **Phase 6 Testing:**
- [ ] Invoice status changes work
- [ ] Overdue detection works
- [ ] Send invoice marks as "sent"
- [ ] Cancellation works

### **Phase 7 Testing:**
- [ ] Create expense
- [ ] Link expense to job/site
- [ ] Expense categories work
- [ ] Expense reports generate

### **Phase 8 Testing:**
- [ ] Revenue reports accurate
- [ ] Outstanding invoices report works
- [ ] Payment history report works
- [ ] Reports export to CSV/PDF

---

## 🚀 Implementation Order

**Week 1:**
1. Phase 1: Core Invoice Management
2. Phase 2: Invoice Generation from Jobs
3. Phase 3: Line Items & Pricing

**Week 2:**
4. Phase 4: PDF Generation
5. Phase 5: Payment Tracking
6. Phase 6: Invoice Status & Workflow

**Week 3:**
7. Phase 7: Expense Tracking
8. Phase 8: Reports & Analytics
9. Testing & Polish

---

## 📝 Notes

- **Invoice Number Format:** `INV-YYYY-XXX` (e.g., INV-2024-001)
- **Default Payment Terms:** 30 days (configurable)
- **Tax Rate:** Configurable per invoice (default 0%)
- **Discount:** Can be amount or percentage
- **Status Flow:** draft → sent → paid (or cancelled)
- **Overdue:** Auto-detected when due_date < today and status = 'sent'

---

## 🎯 Success Criteria

✅ Admins can create invoices from jobs or manually  
✅ Invoices can be edited and deleted  
✅ PDF invoices generate correctly  
✅ Payments can be recorded and tracked  
✅ Invoice balances update automatically  
✅ Expenses can be tracked  
✅ Financial reports are accurate  
✅ Client portal shows invoices correctly  

---

**Ready to start Phase 1?** 🚀
