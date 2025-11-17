# 💰 Billing & Invoicing System - Game Plan

## Overview
Complete billing and invoicing system to generate invoices from jobs/bookings, track payments, manage expenses, and handle client billing history.

---

## 📋 Phase 1: Database Schema

### 1.1 Invoices Table
```sql
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number VARCHAR(50) UNIQUE NOT NULL, -- INV-2024-001
  client_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  site_id BIGINT REFERENCES sites(id) ON DELETE SET NULL,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  
  -- Invoice Details
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  
  -- Financial
  subtotal NUMERIC(12,2) DEFAULT 0.00,
  tax_rate NUMERIC(5,2) DEFAULT 0.00, -- e.g., 13.00 for 13%
  tax_amount NUMERIC(12,2) DEFAULT 0.00,
  discount_amount NUMERIC(12,2) DEFAULT 0.00,
  discount_percent NUMERIC(5,2) DEFAULT 0.00,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  paid_amount NUMERIC(12,2) DEFAULT 0.00,
  balance_due NUMERIC(12,2) DEFAULT 0.00,
  
  -- Metadata
  notes TEXT,
  terms TEXT, -- Payment terms
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ
);
```

### 1.2 Invoice Line Items Table
```sql
CREATE TABLE invoice_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  
  -- Item Details
  description TEXT NOT NULL,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL, -- Optional link to service
  
  -- Pricing
  quantity NUMERIC(10,2) DEFAULT 1.00,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  line_total NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  
  -- Ordering
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 1.3 Payments Table
```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  
  -- Payment Details
  amount NUMERIC(12,2) NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'check', 'credit_card', 'bank_transfer', 'other')),
  reference_number VARCHAR(100), -- Check number, transaction ID, etc.
  
  -- Metadata
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 1.4 Expenses Table
```sql
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Links
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL, -- Optional: link to job
  site_id BIGINT REFERENCES sites(id) ON DELETE SET NULL, -- Optional: link to site
  
  -- Expense Details
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('supplies', 'equipment', 'travel', 'labor', 'other')),
  amount NUMERIC(12,2) NOT NULL,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Receipt
  receipt_url TEXT, -- Supabase storage URL
  
  -- Metadata
  vendor_name VARCHAR(255),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 1.5 Service Pricing (Extend existing services table)
```sql
-- Add pricing to existing services table
ALTER TABLE services ADD COLUMN IF NOT EXISTS unit_price NUMERIC(12,2) DEFAULT 0.00;
ALTER TABLE services ADD COLUMN IF NOT EXISTS price_type TEXT DEFAULT 'fixed' CHECK (price_type IN ('fixed', 'hourly', 'per_square_foot', 'custom'));
```

### 1.6 Indexes & Triggers
- Indexes for faster queries (invoice_number, client_id, status, due_date)
- Triggers to auto-update balance_due, paid_at, status
- Auto-generate invoice_number (INV-YYYY-###)

---

## 📋 Phase 2: Core Invoice Features

### 2.1 Invoice Creation
**From Jobs:**
- "Create Invoice" button on job detail modal
- Auto-populate line items based on:
  - Job services (if linked)
  - Job type (with default pricing)
  - Estimated hours × hourly rate
  - Manual line items

**From Bookings:**
- Similar to jobs, pull services from booking_services
- Use service pricing if available

**Standalone Invoice:**
- Create invoice without job/booking link
- Manual line items only

### 2.2 Invoice Management Page (`invoices.html`)
- **List View:**
  - Table with: Invoice #, Client, Site, Amount, Status, Due Date, Actions
  - Filters: Status, Client, Date Range
  - Search by invoice number or client name
  - Status badges (draft, sent, paid, overdue)
  
- **Summary Cards:**
  - Total Invoices
  - Outstanding Balance
  - Overdue Invoices
  - This Month Revenue

### 2.3 Invoice Detail Modal
- View full invoice details
- Edit (if draft)
- Mark as sent
- Add payment
- View payment history
- Download PDF
- Email invoice

---

## 📋 Phase 3: PDF Invoice Generation

### 3.1 Invoice Template
- Company header/logo
- Client information
- Invoice details (number, dates, status)
- Line items table
- Subtotals, tax, discounts
- Total amount
- Payment terms
- Balance due
- Footer with company info

### 3.2 PDF Generation (jsPDF)
- Generate PDF on "Download" button
- Save to Supabase storage (optional)
- Email PDF attachment (using existing edge function pattern)

---

## 📋 Phase 4: Payment Tracking

### 4.1 Add Payment
- Payment modal/form
- Link to invoice
- Payment amount (cannot exceed balance due)
- Payment method
- Reference number
- Payment date
- Auto-update invoice status and balance

### 4.2 Payment History
- Show all payments for an invoice
- Payment list on invoice detail
- Payment date, amount, method

### 4.3 Auto Status Updates
- When payment = total → status = 'paid', paid_at = NOW()
- When due_date < TODAY and status != 'paid' → status = 'overdue'
- When balance_due = 0 → status = 'paid'

---

## 📋 Phase 5: Expense Tracking

### 5.1 Expense Management (`expenses.html` or tab in invoices)
- **List View:**
  - Table: Date, Description, Category, Amount, Job/Site, Receipt
  - Filters: Category, Date Range, Job, Site
  - Search functionality
  
- **Summary Cards:**
  - Total Expenses
  - Expenses This Month
  - By Category breakdown
  - By Job/Site breakdown

### 5.2 Add Expense
- Expense form modal
- Link to job/site (optional)
- Category selection
- Amount, date, description
- Upload receipt (Supabase storage)
- Vendor name

### 5.3 Expense Reports
- Export to CSV
- Charts: Expenses by category, over time
- Link expenses to jobs for profitability

---

## 📋 Phase 6: Client Billing Views

### 6.1 Client Invoice History
- View all invoices for a client
- Filter by status, date range
- Outstanding balance summary

### 6.2 Billing Reports
- Revenue by client
- Revenue by site
- Revenue trends (monthly/yearly)
- Outstanding receivables
- Aging report (0-30, 31-60, 61-90, 90+ days)

---

## 📋 Phase 7: Integration Points

### 7.1 Job Integration
- Show invoice status on job card/modal
- "Create Invoice" button on completed jobs
- Link invoice to job for reference

### 7.2 Site Integration
- Show outstanding invoices for site
- Total revenue per site
- Site billing history

### 7.3 Reports Integration
- Add "Billing" or "Financial" tab to reports page
- Revenue charts
- Expense charts
- Profit/loss summaries

---

## 🎨 UI/UX Design

### Invoice List Page
```
┌─────────────────────────────────────────┐
│ Invoices                    [+ New]     │
├─────────────────────────────────────────┤
│ [Cards: Total | Outstanding | Overdue]  │
├─────────────────────────────────────────┤
│ Filters: [Status ▼] [Client ▼] [Date]  │
│ Search: [________________]              │
├─────────────────────────────────────────┤
│ #       Client    Amount    Status  ... │
│ INV-001 ABC Co    $1,500    Paid    ... │
│ INV-002 XYZ Inc   $2,300    Sent    ... │
└─────────────────────────────────────────┘
```

### Invoice Detail Modal
```
┌──────────────────────────────────────┐
│ Invoice # INV-2024-001        [Edit] │
├──────────────────────────────────────┤
│ Client: ABC Company                  │
│ Site: Main Office                    │
│ Issue Date: Jan 15, 2024             │
│ Due Date: Feb 14, 2024               │
│ Status: [Sent]                       │
├──────────────────────────────────────┤
│ Line Items:                          │
│ ┌─────────────────────────────────┐ │
│ │ Cleaning Service    $1,200      │ │
│ │ Supplies           $300         │ │
│ ├─────────────────────────────────┤ │
│ │ Subtotal:          $1,500       │ │
│ │ Tax (13%):         $195         │ │
│ │ Total:             $1,695       │ │
│ │ Paid:              $1,695       │ │
│ │ Balance:           $0.00        │ │
│ └─────────────────────────────────┘ │
├──────────────────────────────────────┤
│ Payments:                            │
│ - Jan 20, 2024: $1,695 (Check #123) │
├──────────────────────────────────────┤
│ [Add Payment] [Download PDF] [Email] │
└──────────────────────────────────────┘
```

---

## 🔧 Technical Implementation

### File Structure
```
├── invoices.html          (New page)
├── js/
│   ├── invoices.js        (Invoice management logic)
│   ├── invoice-pdf.js     (PDF generation)
│   └── expenses.js        (Expense tracking logic)
├── css/
│   └── invoices.css       (Invoice-specific styles)
└── sql/
    └── ADD_BILLING_TABLES.sql
```

### Key Functions
- `generateInvoiceNumber()` - Auto-generate INV-YYYY-###
- `createInvoiceFromJob(jobId)` - Create invoice from job
- `calculateInvoiceTotal(invoice)` - Calculate subtotal, tax, total
- `updateInvoiceStatus(invoiceId)` - Auto-update based on payments
- `generateInvoicePDF(invoice)` - Generate PDF using jsPDF
- `emailInvoice(invoiceId)` - Send invoice via email (edge function)

---

## 📊 Database Views (Optional)

### `invoices_with_balances`
- Join invoices with payments
- Calculate real-time balance
- Include client/site names

### `client_billing_summary`
- Total invoiced per client
- Total paid per client
- Outstanding balance per client

---

## ✅ Implementation Checklist

### Phase 1: Database
- [ ] Create invoices table
- [ ] Create invoice_line_items table
- [ ] Create payments table
- [ ] Create expenses table
- [ ] Add pricing to services table
- [ ] Add indexes and triggers
- [ ] Set up RLS policies

### Phase 2: Invoice Creation
- [ ] Create invoices.html page
- [ ] Invoice list view with filters
- [ ] Create invoice modal (from job/booking/standalone)
- [ ] Invoice line items management
- [ ] Calculate totals (subtotal, tax, total)
- [ ] Save invoice to database

### Phase 3: Invoice Management
- [ ] Invoice detail modal
- [ ] Edit invoice (draft only)
- [ ] Delete invoice (draft only)
- [ ] Status updates
- [ ] Invoice number generation

### Phase 4: PDF Generation
- [ ] Invoice PDF template
- [ ] Generate PDF using jsPDF
- [ ] Download PDF button
- [ ] Email PDF (edge function)

### Phase 5: Payment Tracking
- [ ] Add payment modal
- [ ] Payment form validation
- [ ] Update invoice balance
- [ ] Auto-update invoice status
- [ ] Payment history display

### Phase 6: Expense Tracking
- [ ] Expenses page/tab
- [ ] Add expense modal
- [ ] Receipt upload (Supabase storage)
- [ ] Expense list with filters
- [ ] Expense reports/charts

### Phase 7: Reports & Analytics
- [ ] Revenue reports
- [ ] Outstanding receivables
- [ ] Aging report
- [ ] Expense reports
- [ ] Charts/graphs

### Phase 8: Integration
- [ ] Link invoices to jobs
- [ ] "Create Invoice" on job modal
- [ ] Invoice status on job cards
- [ ] Site billing history
- [ ] Client billing summary

---

## 🎯 MVP Scope (Phase 1-5)
- Create invoices from jobs/bookings
- Manage invoice line items
- Generate PDF invoices
- Track payments
- Basic expense tracking
- Invoice list with filters

## 🚀 Full Scope (All Phases)
- Everything in MVP
- Advanced expense tracking with receipts
- Comprehensive billing reports
- Client billing portal views
- Email invoice functionality
- Aging reports
- Revenue analytics

---

## 📝 Notes
- **Tax Handling:** Consider configurable tax rates (per client/site/jurisdiction)
- **Multi-Currency:** Future enhancement if needed
- **Recurring Invoices:** Can be added later based on recurring jobs/bookings
- **Payment Methods:** Extend as needed (Stripe integration later)
- **Invoice Numbering:** Consider per-organization prefix if multi-tenant

---

**Recommended Implementation Order:**
1. Database schema (Phase 1)
2. Invoice creation & list (Phase 2)
3. PDF generation (Phase 3)
4. Payment tracking (Phase 4)
5. Expense tracking (Phase 5)
6. Reports & integration (Phase 6-8)

**Estimated Time:**
- Phase 1-2: 2-3 days
- Phase 3-4: 1-2 days
- Phase 5: 1 day
- Phase 6-8: 2-3 days
- **Total: 6-9 days for complete system**

