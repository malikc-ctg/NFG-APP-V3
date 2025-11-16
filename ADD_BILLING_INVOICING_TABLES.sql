-- ==========================================
-- BILLING & INVOICING SYSTEM
-- Phase 1: Database Schema
-- ==========================================
-- Creates tables for invoices, line items, payments, and expenses
-- Includes triggers for auto-balance updates and invoice number generation
-- ==========================================

-- ==========================================
-- 1. INVOICES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS invoices (
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

-- ==========================================
-- 2. INVOICE LINE ITEMS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS invoice_line_items (
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

-- ==========================================
-- 3. PAYMENTS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS payments (
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

-- ==========================================
-- 4. EXPENSES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS expenses (
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

-- ==========================================
-- 5. INDEXES FOR PERFORMANCE
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_site_id ON invoices(site_id);
CREATE INDEX IF NOT EXISTS idx_invoices_job_id ON invoices(job_id);
CREATE INDEX IF NOT EXISTS idx_invoices_booking_id ON invoices(booking_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_issue_date ON invoices(issue_date);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_created_by ON invoices(created_by);

CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice_id ON invoice_line_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_service_id ON invoice_line_items(service_id);

CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_created_by ON payments(created_by);

CREATE INDEX IF NOT EXISTS idx_expenses_job_id ON expenses(job_id);
CREATE INDEX IF NOT EXISTS idx_expenses_site_id ON expenses(site_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_created_by ON expenses(created_by);

-- ==========================================
-- 6. TRIGGERS
-- ==========================================

-- Function to auto-update invoice balance when payments are added/updated/deleted
CREATE OR REPLACE FUNCTION update_invoice_balance()
RETURNS TRIGGER AS $$
DECLARE
  invoice_record invoices%ROWTYPE;
  total_paid NUMERIC(12,2);
BEGIN
  -- Get the invoice record
  IF TG_OP = 'DELETE' THEN
    SELECT * INTO invoice_record FROM invoices WHERE id = OLD.invoice_id;
  ELSE
    SELECT * INTO invoice_record FROM invoices WHERE id = NEW.invoice_id;
  END IF;
  
  -- Calculate total paid amount
  SELECT COALESCE(SUM(amount), 0) INTO total_paid
  FROM payments
  WHERE invoice_id = invoice_record.id;
  
  -- Update invoice
  UPDATE invoices
  SET 
    paid_amount = total_paid,
    balance_due = total_amount - total_paid,
    paid_at = CASE 
      WHEN total_amount <= total_paid THEN NOW() 
      ELSE NULL 
    END,
    status = CASE
      WHEN total_amount <= total_paid THEN 'paid'
      WHEN due_date < CURRENT_DATE AND status != 'paid' AND status != 'cancelled' THEN 'overdue'
      WHEN status = 'paid' AND total_amount > total_paid THEN 'sent' -- Revert to sent if payment removed
      ELSE status
    END,
    updated_at = NOW()
  WHERE id = invoice_record.id;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger on payments insert/update/delete
DROP TRIGGER IF EXISTS trigger_update_invoice_balance_insert ON payments;
CREATE TRIGGER trigger_update_invoice_balance_insert
  AFTER INSERT ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_balance();

DROP TRIGGER IF EXISTS trigger_update_invoice_balance_update ON payments;
CREATE TRIGGER trigger_update_invoice_balance_update
  AFTER UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_balance();

DROP TRIGGER IF EXISTS trigger_update_invoice_balance_delete ON payments;
CREATE TRIGGER trigger_update_invoice_balance_delete
  AFTER DELETE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_balance();

-- Function to auto-generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
DECLARE
  year_prefix TEXT;
  next_number INTEGER;
  new_invoice_number TEXT;
BEGIN
  -- Only generate if invoice_number is null or empty
  IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
    year_prefix := 'INV-' || TO_CHAR(NOW(), 'YYYY') || '-';
    
    -- Get the next sequence number for this year
    SELECT COALESCE(
      MAX(CAST(SUBSTRING(invoice_number FROM '\d+$') AS INTEGER)), 
      0
    ) + 1 INTO next_number
    FROM invoices
    WHERE invoice_number LIKE year_prefix || '%';
    
    -- Format as 3-digit number (001, 002, etc.)
    new_invoice_number := year_prefix || LPAD(next_number::TEXT, 3, '0');
    
    NEW.invoice_number := new_invoice_number;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for invoice number generation
DROP TRIGGER IF EXISTS trigger_generate_invoice_number ON invoices;
CREATE TRIGGER trigger_generate_invoice_number
  BEFORE INSERT ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION generate_invoice_number();

-- Function to calculate line item total
CREATE OR REPLACE FUNCTION calculate_line_item_total()
RETURNS TRIGGER AS $$
BEGIN
  NEW.line_total := COALESCE(NEW.quantity, 1) * COALESCE(NEW.unit_price, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for line item total
DROP TRIGGER IF EXISTS trigger_calculate_line_item_total ON invoice_line_items;
CREATE TRIGGER trigger_calculate_line_item_total
  BEFORE INSERT OR UPDATE ON invoice_line_items
  FOR EACH ROW
  EXECUTE FUNCTION calculate_line_item_total();

-- Function to update invoice totals when line items change
CREATE OR REPLACE FUNCTION update_invoice_totals()
RETURNS TRIGGER AS $$
DECLARE
  invoice_record invoices%ROWTYPE;
  new_subtotal NUMERIC(12,2);
  new_tax_amount NUMERIC(12,2);
  new_total NUMERIC(12,2);
BEGIN
  -- Get invoice record
  IF TG_OP = 'DELETE' THEN
    SELECT * INTO invoice_record FROM invoices WHERE id = OLD.invoice_id;
  ELSE
    SELECT * INTO invoice_record FROM invoices WHERE id = NEW.invoice_id;
  END IF;
  
  -- Calculate new subtotal from line items
  SELECT COALESCE(SUM(line_total), 0) INTO new_subtotal
  FROM invoice_line_items
  WHERE invoice_id = invoice_record.id;
  
  -- Calculate tax amount
  new_tax_amount := new_subtotal * (COALESCE(invoice_record.tax_rate, 0) / 100);
  
  -- Calculate total (subtotal + tax - discount)
  new_total := new_subtotal + new_tax_amount - COALESCE(invoice_record.discount_amount, 0);
  
  -- Update invoice
  UPDATE invoices
  SET 
    subtotal = new_subtotal,
    tax_amount = new_tax_amount,
    total_amount = new_total,
    balance_due = new_total - COALESCE(paid_amount, 0),
    updated_at = NOW()
  WHERE id = invoice_record.id;
  
  -- Recalculate status based on new total
  UPDATE invoices
  SET 
    status = CASE
      WHEN paid_amount >= new_total AND new_total > 0 THEN 'paid'
      WHEN due_date < CURRENT_DATE AND status != 'paid' AND status != 'cancelled' THEN 'overdue'
      ELSE status
    END,
    paid_at = CASE 
      WHEN paid_amount >= new_total AND new_total > 0 THEN NOW() 
      ELSE paid_at 
    END
  WHERE id = invoice_record.id;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Triggers for invoice totals updates
DROP TRIGGER IF EXISTS trigger_update_invoice_totals_insert ON invoice_line_items;
CREATE TRIGGER trigger_update_invoice_totals_insert
  AFTER INSERT ON invoice_line_items
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_totals();

DROP TRIGGER IF EXISTS trigger_update_invoice_totals_update ON invoice_line_items;
CREATE TRIGGER trigger_update_invoice_totals_update
  AFTER UPDATE ON invoice_line_items
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_totals();

DROP TRIGGER IF EXISTS trigger_update_invoice_totals_delete ON invoice_line_items;
CREATE TRIGGER trigger_update_invoice_totals_delete
  AFTER DELETE ON invoice_line_items
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_totals();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS trigger_invoices_updated_at ON invoices;
CREATE TRIGGER trigger_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_expenses_updated_at ON expenses;
CREATE TRIGGER trigger_expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Function to auto-update invoice status to overdue based on due_date
CREATE OR REPLACE FUNCTION check_overdue_invoices()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.due_date < CURRENT_DATE AND NEW.status NOT IN ('paid', 'cancelled') THEN
    NEW.status := 'overdue';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to check overdue on insert/update
DROP TRIGGER IF EXISTS trigger_check_overdue_invoices ON invoices;
CREATE TRIGGER trigger_check_overdue_invoices
  BEFORE INSERT OR UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION check_overdue_invoices();

-- ==========================================
-- 7. ROW LEVEL SECURITY (RLS)
-- ==========================================

-- Enable RLS
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Policies: Users can view invoices they created, are clients for, or linked to their jobs
CREATE POLICY "Users can view invoices for their jobs" ON invoices
  FOR SELECT USING (
    created_by = auth.uid() 
    OR client_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM jobs 
      WHERE jobs.id = invoices.job_id 
      AND (jobs.created_by = auth.uid() OR jobs.client_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM sites 
      WHERE sites.id = invoices.site_id 
      AND sites.created_by = auth.uid()
    )
  );

-- Users can insert invoices they create
CREATE POLICY "Users can create invoices" ON invoices
  FOR INSERT WITH CHECK (
    created_by = auth.uid()
  );

-- Users can update invoices they created
CREATE POLICY "Users can update invoices they created" ON invoices
  FOR UPDATE USING (
    created_by = auth.uid()
  );

-- Users can delete invoices they created (draft only)
CREATE POLICY "Users can delete draft invoices they created" ON invoices
  FOR DELETE USING (
    created_by = auth.uid() AND status = 'draft'
  );

-- Invoice line items: Same access as parent invoice
CREATE POLICY "Users can view invoice line items" ON invoice_line_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM invoices 
      WHERE invoices.id = invoice_line_items.invoice_id 
      AND (
        invoices.created_by = auth.uid() 
        OR invoices.client_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM jobs 
          WHERE jobs.id = invoices.job_id 
          AND (jobs.created_by = auth.uid() OR jobs.client_id = auth.uid())
        )
      )
    )
  );

CREATE POLICY "Users can manage invoice line items" ON invoice_line_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM invoices 
      WHERE invoices.id = invoice_line_items.invoice_id 
      AND invoices.created_by = auth.uid()
    )
  );

-- Payments: Same access as parent invoice
CREATE POLICY "Users can view payments" ON payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM invoices 
      WHERE invoices.id = payments.invoice_id 
      AND (
        invoices.created_by = auth.uid() 
        OR invoices.client_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM jobs 
          WHERE jobs.id = invoices.job_id 
          AND (jobs.created_by = auth.uid() OR jobs.client_id = auth.uid())
        )
      )
    )
  );

CREATE POLICY "Users can create payments for invoices they manage" ON payments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM invoices 
      WHERE invoices.id = payments.invoice_id 
      AND invoices.created_by = auth.uid()
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "Users can update payments they created" ON payments
  FOR UPDATE USING (
    created_by = auth.uid()
  );

CREATE POLICY "Users can delete payments they created" ON payments
  FOR DELETE USING (
    created_by = auth.uid()
  );

-- Expenses: Users can view/manage expenses they created or for their jobs/sites
CREATE POLICY "Users can view expenses for their jobs or sites" ON expenses
  FOR SELECT USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM jobs 
      WHERE jobs.id = expenses.job_id 
      AND (jobs.created_by = auth.uid() OR jobs.client_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM sites 
      WHERE sites.id = expenses.site_id 
      AND sites.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can create expenses" ON expenses
  FOR INSERT WITH CHECK (
    created_by = auth.uid()
  );

CREATE POLICY "Users can update expenses they created" ON expenses
  FOR UPDATE USING (
    created_by = auth.uid()
  );

CREATE POLICY "Users can delete expenses they created" ON expenses
  FOR DELETE USING (
    created_by = auth.uid()
  );

-- ==========================================
-- 8. GRANT PERMISSIONS
-- ==========================================

GRANT ALL ON invoices TO authenticated;
GRANT ALL ON invoice_line_items TO authenticated;
GRANT ALL ON payments TO authenticated;
GRANT ALL ON expenses TO authenticated;

-- ==========================================
-- 9. INITIAL DATA / NOTES
-- ==========================================

-- Note: Invoice numbers will be auto-generated as INV-YYYY-### format
-- Example: INV-2024-001, INV-2024-002, etc.
-- The trigger will automatically increment the number for each year

-- Note: Balance updates happen automatically when:
-- 1. Payments are added/updated/deleted
-- 2. Line items are added/updated/deleted
-- 3. Invoice totals change

-- Note: Invoice status automatically updates to 'overdue' when:
-- 1. Due date passes and invoice is not paid
-- 2. Invoice is created/updated with past due date

-- Note: Invoice status automatically updates to 'paid' when:
-- 1. Total paid amount >= total invoice amount

-- ==========================================
-- END OF SCRIPT
-- ==========================================

