-- ============================================
-- Supplier Management & Purchase Orders Schema
-- ============================================
-- Creates supplier tables and purchase order tracking
-- Run this once in Supabase SQL editor
-- ============================================

-- Drop tables if you need to reset (optional)
-- DROP TABLE IF EXISTS purchase_order_items CASCADE;
-- DROP TABLE IF EXISTS purchase_orders CASCADE;
-- DROP TABLE IF EXISTS inventory_item_suppliers CASCADE;
-- DROP TABLE IF EXISTS suppliers CASCADE;

-- ============================================
-- Suppliers
-- ============================================
CREATE TABLE IF NOT EXISTS suppliers (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  contact_name VARCHAR(150),
  email VARCHAR(150),
  phone VARCHAR(50),
  preferred_contact VARCHAR(50),
  address_line1 VARCHAR(150),
  address_line2 VARCHAR(150),
  city VARCHAR(100),
  province_state VARCHAR(100),
  postal_code VARCHAR(30),
  country VARCHAR(100),
  notes TEXT,
  rating SMALLINT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suppliers_active ON suppliers(is_active);

-- ============================================
-- Supplier ↔ Inventory relationship
-- ============================================
CREATE TABLE IF NOT EXISTS inventory_item_suppliers (
  id BIGSERIAL PRIMARY KEY,
  supplier_id BIGINT REFERENCES suppliers(id) ON DELETE CASCADE,
  item_id BIGINT REFERENCES inventory_items(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT FALSE,
  lead_time_days INTEGER,
  min_order_quantity INTEGER,
  cost_per_unit NUMERIC(12,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uniq_item_supplier UNIQUE (supplier_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_item_suppliers_item ON inventory_item_suppliers(item_id);
CREATE INDEX IF NOT EXISTS idx_item_suppliers_supplier ON inventory_item_suppliers(supplier_id);

-- ============================================
-- Purchase Orders
-- ============================================
CREATE TABLE IF NOT EXISTS purchase_orders (
  id BIGSERIAL PRIMARY KEY,
  po_number VARCHAR(40) UNIQUE NOT NULL,
  supplier_id BIGINT REFERENCES suppliers(id) ON DELETE SET NULL,
  site_id BIGINT REFERENCES sites(id) ON DELETE SET NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'draft', -- draft, pending, ordered, received, cancelled
  expected_date DATE,
  received_date DATE,
  ordered_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  total_items INTEGER DEFAULT 0,
  total_cost NUMERIC(14,2) DEFAULT 0,
  notes TEXT,
  emailed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS emailed_at TIMESTAMPTZ;
ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'unpaid';

CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_site ON purchase_orders(site_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);

-- ============================================
-- Purchase Order Items
-- ============================================
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id BIGSERIAL PRIMARY KEY,
  purchase_order_id BIGINT REFERENCES purchase_orders(id) ON DELETE CASCADE,
  item_id BIGINT REFERENCES inventory_items(id) ON DELETE CASCADE,
  quantity_ordered INTEGER NOT NULL,
  quantity_received INTEGER DEFAULT 0,
  cost_per_unit NUMERIC(12,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_po_items_po ON purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_po_items_item ON purchase_order_items(item_id);

-- ============================================
-- Purchase Order Payments (ledger)
-- ============================================
CREATE TABLE IF NOT EXISTS purchase_order_payments (
  id BIGSERIAL PRIMARY KEY,
  purchase_order_id BIGINT REFERENCES purchase_orders(id) ON DELETE CASCADE,
  amount NUMERIC(14,2) NOT NULL,
  method VARCHAR(50),
  reference TEXT,
  notes TEXT,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  recorded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_po_payments_po ON purchase_order_payments(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_po_payments_date ON purchase_order_payments(payment_date);

-- ============================================
-- Purchase Order Documents metadata
-- ============================================
CREATE TABLE IF NOT EXISTS purchase_order_documents (
  id BIGSERIAL PRIMARY KEY,
  purchase_order_id BIGINT REFERENCES purchase_orders(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  doc_type VARCHAR(50),
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_po_docs_po ON purchase_order_documents(purchase_order_id);

-- ============================================
-- Helper view (optional)
-- ============================================
DROP VIEW IF EXISTS purchase_orders_with_details CASCADE;
CREATE VIEW purchase_orders_with_details AS
SELECT 
  po.id,
  po.po_number,
  po.status,
  po.expected_date,
  po.received_date,
  po.total_items,
  po.total_cost,
  po.notes,
  po.emailed_at,
  po.payment_status,
  po.created_at,
  po.updated_at,
  s.id AS supplier_id,
  s.name AS supplier_name,
  s.contact_name AS supplier_contact,
  st.id AS site_id,
  st.name AS site_name,
  metrics.total_quantity_ordered,
  metrics.total_quantity_received,
  payments.total_paid
FROM purchase_orders po
LEFT JOIN suppliers s ON po.supplier_id = s.id
LEFT JOIN sites st ON po.site_id = st.id
LEFT JOIN LATERAL (
  SELECT 
    COALESCE(SUM(poi.quantity_ordered), 0) AS total_quantity_ordered,
    COALESCE(SUM(poi.quantity_received), 0) AS total_quantity_received
  FROM purchase_order_items poi
  WHERE poi.purchase_order_id = po.id
) metrics ON TRUE
LEFT JOIN LATERAL (
  SELECT COALESCE(SUM(pop.amount), 0) AS total_paid
  FROM purchase_order_payments pop
  WHERE pop.purchase_order_id = po.id
) payments ON TRUE
ORDER BY po.created_at DESC;

-- ============================================
-- Success message
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '===========================================';
  RAISE NOTICE '✅ Supplier & Purchase Order tables created';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Tables: suppliers, inventory_item_suppliers, purchase_orders, purchase_order_items';
  RAISE NOTICE '';
  RAISE NOTICE 'You can now insert suppliers & purchase orders via the UI.';
END $$;

-- ============================================
-- Permissions (Supabase REST access)
-- ============================================
ALTER TABLE suppliers DISABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_item_suppliers DISABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_documents DISABLE ROW LEVEL SECURITY;

GRANT ALL ON suppliers TO authenticated;
GRANT ALL ON inventory_item_suppliers TO authenticated;
GRANT ALL ON purchase_orders TO authenticated;
GRANT ALL ON purchase_order_items TO authenticated;
GRANT ALL ON purchase_order_payments TO authenticated;
GRANT ALL ON purchase_order_documents TO authenticated;

GRANT USAGE, SELECT ON SEQUENCE suppliers_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE inventory_item_suppliers_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE purchase_orders_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE purchase_order_items_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE purchase_order_payments_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE purchase_order_documents_id_seq TO authenticated;

