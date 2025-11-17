# 💰 Billing & Invoicing System - Reports Page Integration Game Plan

## Overview
Integrate billing and invoicing system into the Reports page as a new tab, with invoice generation available when jobs are completed.

---

## 🎯 Core Requirements

1. **Reports Page Tab**: Add "Billing" tab alongside "Overview" and "Time Tracking"
2. **Job Completion Integration**: Show "Generate Invoice" option when job status = 'completed'
3. **Invoice Management**: Full invoice list, creation, payment tracking within Reports page
4. **Financial Analytics**: Revenue charts, expense summaries, profit/loss in Billing tab

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
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  site_id BIGINT REFERENCES sites(id) ON DELETE SET NULL,
  
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

### 1.5 Indexes & Triggers
```sql
-- Indexes
CREATE INDEX idx_invoices_client_id ON invoices(client_id);
CREATE INDEX idx_invoices_site_id ON invoices(site_id);
CREATE INDEX idx_invoices_job_id ON invoices(job_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
CREATE INDEX idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX idx_expenses_job_id ON expenses(job_id);
CREATE INDEX idx_expenses_site_id ON expenses(site_id);

-- Function to auto-update invoice balance
CREATE OR REPLACE FUNCTION update_invoice_balance()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE invoices
  SET 
    paid_amount = COALESCE((SELECT SUM(amount) FROM payments WHERE invoice_id = NEW.invoice_id), 0),
    balance_due = total_amount - COALESCE((SELECT SUM(amount) FROM payments WHERE invoice_id = NEW.invoice_id), 0),
    paid_at = CASE 
      WHEN total_amount <= COALESCE((SELECT SUM(amount) FROM payments WHERE invoice_id = NEW.invoice_id), 0) 
      THEN NOW() 
      ELSE paid_at 
    END,
    status = CASE
      WHEN total_amount <= COALESCE((SELECT SUM(amount) FROM payments WHERE invoice_id = NEW.invoice_id), 0) 
      THEN 'paid'
      WHEN due_date < CURRENT_DATE AND status != 'paid'
      THEN 'overdue'
      ELSE status
    END
  WHERE id = NEW.invoice_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on payments
CREATE TRIGGER trigger_update_invoice_balance
AFTER INSERT OR UPDATE OR DELETE ON payments
FOR EACH ROW
EXECUTE FUNCTION update_invoice_balance();

-- Function to auto-generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
    NEW.invoice_number := 'INV-' || TO_CHAR(NOW(), 'YYYY') || '-' || 
      LPAD((COALESCE((SELECT MAX(CAST(SUBSTRING(invoice_number FROM '\d+$') AS INTEGER)) 
                      FROM invoices 
                      WHERE invoice_number LIKE 'INV-' || TO_CHAR(NOW(), 'YYYY') || '-%'), 0) + 1)::TEXT, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for invoice number
CREATE TRIGGER trigger_generate_invoice_number
BEFORE INSERT ON invoices
FOR EACH ROW
EXECUTE FUNCTION generate_invoice_number();
```

### 1.6 RLS Policies
```sql
-- Enable RLS
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Policies: Users can see invoices for their jobs/sites (admin sees all)
CREATE POLICY "Users can view invoices for their jobs" ON invoices
FOR SELECT USING (
  created_by = auth.uid() 
  OR client_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM jobs 
    WHERE jobs.id = invoices.job_id 
    AND jobs.created_by = auth.uid()
  )
);

-- Similar policies for other tables...
```

---

## 📋 Phase 2: Reports Page - Billing Tab Integration

### 2.1 HTML Structure (reports.html)

#### Add Billing Tab Button
```html
<!-- Tab Navigation (existing) -->
<div class="border-b border-nfgray dark:border-gray-700">
  <nav class="flex gap-2 -mb-px">
    <button id="tab-overview" class="tab-btn ...">Overview</button>
    <button id="tab-time-tracking" class="tab-btn ...">Time Tracking</button>
    <!-- NEW: Billing Tab -->
    <button 
      id="tab-billing" 
      class="tab-btn px-4 py-2 text-sm font-medium border-b-2 border-transparent text-gray-500 hover:text-nfgblue hover:border-gray-300 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
      data-tab="billing"
    >
      <i data-lucide="dollar-sign" class="w-4 h-4 inline mr-2"></i>
      Billing
    </button>
  </nav>
</div>
```

#### Add Billing Tab Content Container
```html
<!-- After Time Tracking tab content -->
<div id="tab-content-billing" class="hidden tab-content space-y-6">
  
  <!-- Summary Cards -->
  <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
    <!-- Total Revenue -->
    <div class="bg-white dark:bg-gray-800 border border-nfgray rounded-xl p-4 shadow-nfg">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm text-gray-500 dark:text-gray-400">Total Revenue</p>
          <p id="billing-total-revenue" class="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">$0</p>
        </div>
        <div class="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <i data-lucide="dollar-sign" class="w-5 h-5 text-green-600 dark:text-green-400"></i>
        </div>
      </div>
    </div>

    <!-- Outstanding Balance -->
    <div class="bg-white dark:bg-gray-800 border border-nfgray rounded-xl p-4 shadow-nfg">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm text-gray-500 dark:text-gray-400">Outstanding</p>
          <p id="billing-outstanding" class="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1">$0</p>
        </div>
        <div class="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
          <i data-lucide="alert-circle" class="w-5 h-5 text-orange-600 dark:text-orange-400"></i>
        </div>
      </div>
    </div>

    <!-- Overdue Invoices -->
    <div class="bg-white dark:bg-gray-800 border border-nfgray rounded-xl p-4 shadow-nfg">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm text-gray-500 dark:text-gray-400">Overdue</p>
          <p id="billing-overdue-count" class="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">0</p>
        </div>
        <div class="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
          <i data-lucide="clock-alert" class="w-5 h-5 text-red-600 dark:text-red-400"></i>
        </div>
      </div>
    </div>

    <!-- This Month Revenue -->
    <div class="bg-white dark:bg-gray-800 border border-nfgray rounded-xl p-4 shadow-nfg">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm text-gray-500 dark:text-gray-400">This Month</p>
          <p id="billing-month-revenue" class="text-2xl font-bold text-nfgblue dark:text-blue-400 mt-1">$0</p>
        </div>
        <div class="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
          <i data-lucide="trending-up" class="w-5 h-5 text-nfgblue dark:text-blue-400"></i>
        </div>
      </div>
    </div>
  </div>

  <!-- Revenue Chart -->
  <div class="bg-white dark:bg-gray-800 border border-nfgray rounded-xl p-6 shadow-nfg">
    <h3 class="text-lg font-semibold text-nfgblue dark:text-blue-400 mb-4">Revenue Trend</h3>
    <canvas id="revenue-chart" height="80"></canvas>
  </div>

  <!-- Invoices Section -->
  <div class="bg-white dark:bg-gray-800 border border-nfgray rounded-xl shadow-nfg">
    <div class="p-6 border-b border-nfgray dark:border-gray-700 flex items-center justify-between">
      <h3 class="text-lg font-semibold text-nfgblue dark:text-blue-400">Invoices</h3>
      <button id="create-invoice-btn" class="px-4 py-2 rounded-xl bg-nfgblue text-white hover:bg-nfgdark text-sm font-medium">
        <i data-lucide="plus" class="w-4 h-4 inline mr-2"></i>
        Create Invoice
      </button>
    </div>

    <!-- Filters -->
    <div class="p-4 border-b border-nfgray dark:border-gray-700 flex flex-wrap gap-3">
      <select id="invoice-status-filter" class="px-3 py-2 rounded-xl border border-nfgray focus:ring-2 focus:ring-nfgblue outline-none text-sm">
        <option value="">All Status</option>
        <option value="draft">Draft</option>
        <option value="sent">Sent</option>
        <option value="paid">Paid</option>
        <option value="overdue">Overdue</option>
      </select>
      <select id="invoice-client-filter" class="px-3 py-2 rounded-xl border border-nfgray focus:ring-2 focus:ring-nfgblue outline-none text-sm">
        <option value="">All Clients</option>
      </select>
      <input type="date" id="invoice-date-from" class="px-3 py-2 rounded-xl border border-nfgray focus:ring-2 focus:ring-nfgblue outline-none text-sm">
      <input type="date" id="invoice-date-to" class="px-3 py-2 rounded-xl border border-nfgray focus:ring-2 focus:ring-nfgblue outline-none text-sm">
      <button id="apply-invoice-filters" class="px-4 py-2 rounded-xl bg-nfgblue text-white hover:bg-nfgdark text-sm">
        Apply Filters
      </button>
      <button id="clear-invoice-filters" class="px-4 py-2 rounded-xl border border-nfgray hover:bg-nfglight text-sm">
        Clear
      </button>
    </div>

    <!-- Invoices Table -->
    <div class="overflow-x-auto">
      <table class="w-full">
        <thead class="bg-nfglight dark:bg-gray-700">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice #</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Site</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Job</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody id="invoices-table-body" class="divide-y divide-nfgray dark:divide-gray-700">
          <!-- Invoices will be rendered here -->
        </tbody>
      </table>
    </div>
  </div>

  <!-- Expenses Section (optional, can be separate tab or collapsible) -->
  <div class="bg-white dark:bg-gray-800 border border-nfgray rounded-xl shadow-nfg">
    <div class="p-6 border-b border-nfgray dark:border-gray-700 flex items-center justify-between">
      <h3 class="text-lg font-semibold text-nfgblue dark:text-blue-400">Expenses</h3>
      <button id="add-expense-btn" class="px-4 py-2 rounded-xl bg-green-600 text-white hover:bg-green-700 text-sm font-medium">
        <i data-lucide="plus" class="w-4 h-4 inline mr-2"></i>
        Add Expense
      </button>
    </div>
    <!-- Expenses content -->
  </div>
</div>
```

---

## 📋 Phase 3: Job Completion - Invoice Generation

### 3.1 Update Job Detail Modal (jobs.html)

#### Add Invoice Section to Job Modal
```html
<!-- In job detail modal, after job info, before tasks -->
<div id="job-invoice-section" class="hidden border-t border-nfgray dark:border-gray-700 pt-4">
  <div class="flex items-center justify-between">
    <div>
      <h4 class="font-semibold text-nfgblue dark:text-blue-400">Invoice</h4>
      <p id="job-invoice-status" class="text-sm text-gray-500 dark:text-gray-400">No invoice created</p>
    </div>
    <div id="job-invoice-actions" class="flex gap-2">
      <!-- Show if no invoice and job is completed -->
      <button id="generate-invoice-btn" class="px-4 py-2 rounded-xl bg-green-600 text-white hover:bg-green-700 text-sm font-medium">
        <i data-lucide="dollar-sign" class="w-4 h-4 inline mr-2"></i>
        Generate Invoice
      </button>
      <!-- Show if invoice exists -->
      <a id="view-invoice-link" href="#" class="hidden px-4 py-2 rounded-xl bg-nfgblue text-white hover:bg-nfgdark text-sm font-medium">
        View Invoice <span id="invoice-number-text"></span>
      </a>
    </div>
  </div>
</div>
```

### 3.2 JavaScript Logic for Job Invoice Generation

#### In jobs.html script section:
```javascript
// Check if job has invoice and update UI
async function checkJobInvoice(jobId) {
  try {
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('job_id', jobId)
      .maybeSingle();

    const invoiceSection = document.getElementById('job-invoice-section');
    const generateBtn = document.getElementById('generate-invoice-btn');
    const viewLink = document.getElementById('view-invoice-link');
    const invoiceStatus = document.getElementById('job-invoice-status');
    const invoiceNumberText = document.getElementById('invoice-number-text');

    if (invoice) {
      // Invoice exists - show view link
      invoiceSection.classList.remove('hidden');
      generateBtn.classList.add('hidden');
      viewLink.classList.remove('hidden');
      viewLink.href = `reports.html?tab=billing&invoice=${invoice.id}`;
      invoiceNumberText.textContent = invoice.invoice_number;
      invoiceStatus.textContent = `Invoice ${invoice.invoice_number} - ${invoice.status}`;
    } else {
      // Check if job is completed
      const { data: job } = await supabase
        .from('jobs')
        .select('status')
        .eq('id', jobId)
        .single();

      if (job && job.status === 'completed') {
        // Show generate button for completed jobs
        invoiceSection.classList.remove('hidden');
        generateBtn.classList.remove('hidden');
        viewLink.classList.add('hidden');
        invoiceStatus.textContent = 'Ready to generate invoice';
      } else {
        // Hide invoice section for non-completed jobs
        invoiceSection.classList.add('hidden');
      }
    }
  } catch (error) {
    console.error('Error checking job invoice:', error);
  }
}

// Generate invoice from job
async function generateInvoiceFromJob(jobId) {
  try {
    // Fetch job details
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select(`
        *,
        sites(*),
        user_profiles!jobs_client_id_fkey(full_name, email)
      `)
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      toast.error('Failed to load job details', 'Error');
      return;
    }

    // Check if invoice already exists
    const { data: existingInvoice } = await supabase
      .from('invoices')
      .select('id')
      .eq('job_id', jobId)
      .maybeSingle();

    if (existingInvoice) {
      toast.warning('Invoice already exists for this job', 'Duplicate');
      window.location.href = `reports.html?tab=billing&invoice=${existingInvoice.id}`;
      return;
    }

    // Open invoice creation modal with pre-filled job data
    openInvoiceCreationModal({
      jobId: job.id,
      clientId: job.client_id,
      siteId: job.site_id,
      jobTitle: job.title,
      siteName: job.sites?.name || 'Unknown Site',
      clientName: job.user_profiles?.full_name || 'Unknown Client'
    });

  } catch (error) {
    console.error('Error generating invoice from job:', error);
    toast.error('Failed to generate invoice', 'Error');
  }
}

// Attach event listener
document.getElementById('generate-invoice-btn')?.addEventListener('click', () => {
  if (currentJobId) {
    generateInvoiceFromJob(currentJobId);
  }
});

// Update invoice section when job modal opens
// Call checkJobInvoice(jobId) in the openJobDetailModal function
```

---

## 📋 Phase 4: Invoice Creation Modal

### 4.1 Invoice Creation Modal HTML (in reports.html or separate modal file)
```html
<!-- Invoice Creation Modal -->
<div id="invoice-modal" class="hidden fixed inset-0 bg-black/40 items-center justify-center p-4 z-50">
  <div class="bg-white dark:bg-gray-800 rounded-xl shadow-nfg border border-nfgray w-full max-w-3xl max-h-[90vh] overflow-y-auto">
    <div class="p-6 border-b border-nfgray dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800 z-10">
      <h2 class="text-xl font-semibold text-nfgblue dark:text-blue-400">Create Invoice</h2>
      <button class="close-modal p-2 rounded-lg hover:bg-nfglight dark:hover:bg-gray-700">
        <i data-lucide="x" class="w-5 h-5"></i>
      </button>
    </div>

    <form id="invoice-form" class="p-6 space-y-4">
      <!-- Job/Site Info (if from job) -->
      <div id="invoice-job-info" class="hidden bg-nfglight/30 dark:bg-gray-700/30 rounded-xl p-4">
        <p class="text-sm text-gray-600 dark:text-gray-400">
          <strong>Job:</strong> <span id="invoice-job-title"></span><br>
          <strong>Site:</strong> <span id="invoice-site-name"></span><br>
          <strong>Client:</strong> <span id="invoice-client-name"></span>
        </p>
      </div>

      <!-- Invoice Details -->
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium mb-1.5">Issue Date</label>
          <input type="date" id="invoice-issue-date" required class="w-full border border-nfgray rounded-xl p-2.5">
        </div>
        <div>
          <label class="block text-sm font-medium mb-1.5">Due Date</label>
          <input type="date" id="invoice-due-date" required class="w-full border border-nfgray rounded-xl p-2.5">
        </div>
      </div>

      <!-- Line Items -->
      <div>
        <div class="flex items-center justify-between mb-3">
          <label class="block text-sm font-medium">Line Items</label>
          <button type="button" id="add-line-item-btn" class="px-3 py-1.5 rounded-lg bg-nfgblue text-white text-sm">
            <i data-lucide="plus" class="w-4 h-4 inline mr-1"></i>
            Add Item
          </button>
        </div>
        <div id="invoice-line-items" class="space-y-2">
          <!-- Line items will be added here -->
        </div>
        <div class="mt-4 text-right space-y-2">
          <div class="flex justify-end gap-4">
            <span>Subtotal:</span>
            <span id="invoice-subtotal" class="font-semibold">$0.00</span>
          </div>
          <div class="flex justify-end gap-4">
            <span>Tax Rate (%):</span>
            <input type="number" id="invoice-tax-rate" step="0.01" min="0" max="100" class="w-20 border border-nfgray rounded px-2 py-1" value="0">
          </div>
          <div class="flex justify-end gap-4">
            <span>Tax Amount:</span>
            <span id="invoice-tax-amount" class="font-semibold">$0.00</span>
          </div>
          <div class="flex justify-end gap-4 border-t border-nfgray pt-2">
            <span>Total:</span>
            <span id="invoice-total" class="font-semibold text-lg text-nfgblue dark:text-blue-400">$0.00</span>
          </div>
        </div>
      </div>

      <!-- Notes -->
      <div>
        <label class="block text-sm font-medium mb-1.5">Notes</label>
        <textarea id="invoice-notes" rows="3" class="w-full border border-nfgray rounded-xl p-2.5"></textarea>
      </div>

      <div class="flex gap-3 pt-4">
        <button type="button" class="close-modal flex-1 py-2.5 rounded-xl border border-nfgray hover:bg-nfglight font-medium">
          Cancel
        </button>
        <button type="submit" class="flex-1 py-2.5 rounded-xl bg-nfgblue text-white hover:bg-nfgdark font-medium">
          Create Invoice
        </button>
      </div>
    </form>
  </div>
</div>
```

---

## 📋 Phase 5: JavaScript Functions (reports.html)

### 5.1 Tab Switching Logic
```javascript
// Add to existing initTabs() function
function initTabs() {
  const tabs = document.querySelectorAll('[data-tab]');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;
      
      // Update button styles
      tabs.forEach(t => {
        const isActive = t.dataset.tab === tabName;
        if (isActive) {
          t.className = 'tab-btn px-4 py-2 text-sm font-medium border-b-2 border-nfgblue text-nfgblue dark:text-blue-400 transition-colors';
        } else {
          t.className = 'tab-btn px-4 py-2 text-sm font-medium border-b-2 border-transparent text-gray-500 hover:text-nfgblue hover:border-gray-300 dark:text-gray-400 dark:hover:text-blue-400 transition-colors';
        }
      });
      
      // Show/hide content
      document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.add('hidden');
      });
      
      const targetContent = document.getElementById(`tab-content-${tabName}`);
      if (targetContent) {
        targetContent.classList.remove('hidden');
        
        // Load data when tab is activated
        if (tabName === 'billing') {
          loadBillingData();
        } else if (tabName === 'time-tracking') {
          loadTimeTrackingData();
        } else if (tabName === 'overview') {
          refreshReports();
        }
      }
    });
  });

  // Check URL hash for initial tab
  const urlParams = new URLSearchParams(window.location.search);
  const tabParam = urlParams.get('tab');
  if (tabParam === 'billing') {
    document.querySelector('[data-tab="billing"]')?.click();
  }
}
```

### 5.2 Load Billing Data
```javascript
async function loadBillingData() {
  try {
    // Load invoices
    await loadInvoices();
    
    // Load summary metrics
    await loadBillingSummary();
    
    // Load revenue chart
    await loadRevenueChart();
    
  } catch (error) {
    console.error('Error loading billing data:', error);
    toast.error('Failed to load billing data', 'Error');
  }
}

async function loadBillingSummary() {
  try {
    const { data: invoices, error } = await supabase
      .from('invoices')
      .select('total_amount, paid_amount, status, issue_date, due_date');

    if (error) throw error;

    const totalRevenue = invoices
      .filter(inv => inv.status === 'paid')
      .reduce((sum, inv) => sum + parseFloat(inv.paid_amount || 0), 0);

    const outstanding = invoices
      .filter(inv => inv.status !== 'paid' && inv.status !== 'cancelled')
      .reduce((sum, inv) => sum + (parseFloat(inv.total_amount || 0) - parseFloat(inv.paid_amount || 0)), 0);

    const overdueCount = invoices.filter(inv => 
      inv.status !== 'paid' && 
      new Date(inv.due_date) < new Date()
    ).length;

    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();
    const monthRevenue = invoices
      .filter(inv => {
        const date = new Date(inv.issue_date);
        return inv.status === 'paid' && 
               date.getMonth() === thisMonth && 
               date.getFullYear() === thisYear;
      })
      .reduce((sum, inv) => sum + parseFloat(inv.paid_amount || 0), 0);

    // Update UI
    document.getElementById('billing-total-revenue').textContent = `$${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    document.getElementById('billing-outstanding').textContent = `$${outstanding.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    document.getElementById('billing-overdue-count').textContent = overdueCount;
    document.getElementById('billing-month-revenue').textContent = `$${monthRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  } catch (error) {
    console.error('Error loading billing summary:', error);
  }
}

async function loadInvoices() {
  try {
    // Apply filters
    const statusFilter = document.getElementById('invoice-status-filter')?.value || '';
    const clientFilter = document.getElementById('invoice-client-filter')?.value || '';
    const dateFrom = document.getElementById('invoice-date-from')?.value || '';
    const dateTo = document.getElementById('invoice-date-to')?.value || '';

    let query = supabase
      .from('invoices')
      .select(`
        *,
        user_profiles!invoices_client_id_fkey(full_name, email),
        sites(name),
        jobs(title)
      `)
      .order('created_at', { ascending: false });

    if (statusFilter) query = query.eq('status', statusFilter);
    if (clientFilter) query = query.eq('client_id', clientFilter);
    if (dateFrom) query = query.gte('issue_date', dateFrom);
    if (dateTo) query = query.lte('issue_date', dateTo);

    const { data: invoices, error } = await query;

    if (error) throw error;

    renderInvoicesTable(invoices);

  } catch (error) {
    console.error('Error loading invoices:', error);
    toast.error('Failed to load invoices', 'Error');
  }
}

function renderInvoicesTable(invoices) {
  const tbody = document.getElementById('invoices-table-body');
  if (!tbody) return;

  if (invoices.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="px-4 py-8 text-center text-gray-500">No invoices found</td></tr>';
    return;
  }

  tbody.innerHTML = invoices.map(invoice => {
    const statusColors = {
      'draft': 'bg-gray-100 text-gray-700',
      'sent': 'bg-blue-100 text-blue-700',
      'paid': 'bg-green-100 text-green-700',
      'overdue': 'bg-red-100 text-red-700',
      'cancelled': 'bg-gray-100 text-gray-500'
    };

    return `
      <tr class="hover:bg-nfglight/30 dark:hover:bg-gray-700/30">
        <td class="px-4 py-3 text-sm font-medium">${invoice.invoice_number}</td>
        <td class="px-4 py-3 text-sm">${invoice.user_profiles?.full_name || 'N/A'}</td>
        <td class="px-4 py-3 text-sm">${invoice.sites?.name || 'N/A'}</td>
        <td class="px-4 py-3 text-sm">${invoice.jobs?.title || 'N/A'}</td>
        <td class="px-4 py-3 text-sm font-medium">$${parseFloat(invoice.total_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td class="px-4 py-3">
          <span class="px-2 py-1 rounded-lg text-xs font-medium ${statusColors[invoice.status] || 'bg-gray-100 text-gray-700'}">
            ${invoice.status}
          </span>
        </td>
        <td class="px-4 py-3 text-sm">${new Date(invoice.due_date).toLocaleDateString()}</td>
        <td class="px-4 py-3">
          <div class="flex gap-2">
            <button onclick="viewInvoice('${invoice.id}')" class="text-nfgblue hover:underline text-sm">View</button>
            <button onclick="downloadInvoicePDF('${invoice.id}')" class="text-gray-600 hover:underline text-sm">PDF</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}
```

---

## 📋 Phase 6: Implementation Checklist

### Database
- [ ] Create invoices table
- [ ] Create invoice_line_items table
- [ ] Create payments table
- [ ] Create expenses table
- [ ] Add indexes
- [ ] Add triggers (auto-update balance, generate invoice number)
- [ ] Set up RLS policies

### Reports Page Integration
- [ ] Add "Billing" tab button
- [ ] Add billing tab content container
- [ ] Add summary cards (Total Revenue, Outstanding, Overdue, This Month)
- [ ] Add invoice list table
- [ ] Add filters (status, client, date range)
- [ ] Add revenue chart
- [ ] Update tab switching logic

### Job Integration
- [ ] Add invoice section to job detail modal
- [ ] Add "Generate Invoice" button (for completed jobs)
- [ ] Add "View Invoice" link (if invoice exists)
- [ ] Check invoice existence on job modal open
- [ ] Handle job completion → show generate option

### Invoice Creation
- [ ] Create invoice modal HTML
- [ ] Implement line items management (add/remove)
- [ ] Calculate subtotal, tax, total
- [ ] Save invoice to database
- [ ] Link invoice to job (if from job)

### Invoice Management
- [ ] Load invoices with filters
- [ ] Render invoice table
- [ ] View invoice detail
- [ ] Add payment functionality
- [ ] Download PDF
- [ ] Email invoice (optional)

### Analytics
- [ ] Load billing summary metrics
- [ ] Revenue trend chart
- [ ] Outstanding receivables
- [ ] Expense tracking (optional)

---

## 🚀 Implementation Order

1. **Database Schema** (Phase 1)
2. **Reports Page Tab** (Phase 2) - Add tab structure
3. **Load Invoices** (Phase 5) - Basic invoice list
4. **Job Integration** (Phase 3) - Generate invoice from completed job
5. **Invoice Creation Modal** (Phase 4) - Full invoice creation
6. **Payment Tracking** (Phase 5) - Add payments
7. **Analytics** (Phase 5) - Summary cards and charts
8. **PDF Generation** - Export invoices
9. **Expenses** - Expense tracking (optional)

---

## 🎯 Key Features

✅ **Reports Page Tab**: Billing tab with full invoice management  
✅ **Job Completion**: "Generate Invoice" button appears when job is completed  
✅ **Invoice Management**: Create, view, edit, track payments  
✅ **Financial Analytics**: Revenue charts, outstanding balances, summaries  
✅ **Payment Tracking**: Record payments, update invoice status  
✅ **PDF Export**: Download invoices as PDF  
✅ **Integration**: Seamlessly integrated with existing job workflow  

---

This game plan integrates billing directly into the Reports page and adds invoice generation as part of the job completion workflow, exactly as requested!

