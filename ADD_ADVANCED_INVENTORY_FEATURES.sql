-- ============================================
-- Advanced Inventory Features
-- ============================================
-- Phase 5: Batch/Lot Tracking, Expiration Dates, Warehouse Locations
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. Batch/Lot Number Tracking
-- ============================================
CREATE TABLE IF NOT EXISTS inventory_batches (
  id BIGSERIAL PRIMARY KEY,
  item_id BIGINT REFERENCES inventory_items(id) ON DELETE CASCADE,
  site_id BIGINT REFERENCES sites(id) ON DELETE CASCADE,
  batch_number VARCHAR(100) NOT NULL,
  lot_number VARCHAR(100),
  quantity INTEGER NOT NULL DEFAULT 0,
  expiration_date DATE,
  manufactured_date DATE,
  received_date TIMESTAMPTZ DEFAULT NOW(),
  supplier_id BIGINT REFERENCES suppliers(id) ON DELETE SET NULL,
  cost_per_unit DECIMAL(10, 2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(site_id, item_id, batch_number)
);

-- Indexes for batch tracking
CREATE INDEX IF NOT EXISTS idx_batches_item ON inventory_batches(item_id);
CREATE INDEX IF NOT EXISTS idx_batches_site ON inventory_batches(site_id);
CREATE INDEX IF NOT EXISTS idx_batches_expiration ON inventory_batches(expiration_date);
CREATE INDEX IF NOT EXISTS idx_batches_batch_number ON inventory_batches(batch_number);

-- ============================================
-- 2. Warehouse/Location Within Site
-- ============================================
CREATE TABLE IF NOT EXISTS warehouse_locations (
  id BIGSERIAL PRIMARY KEY,
  site_id BIGINT REFERENCES sites(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  location_type VARCHAR(50) DEFAULT 'warehouse', -- warehouse, storage_room, cabinet, shelf, etc.
  parent_location_id BIGINT REFERENCES warehouse_locations(id) ON DELETE SET NULL, -- For hierarchical locations
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(site_id, name)
);

-- Indexes for warehouse locations
CREATE INDEX IF NOT EXISTS idx_warehouse_locations_site ON warehouse_locations(site_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_locations_parent ON warehouse_locations(parent_location_id);

-- ============================================
-- 3. Bin Location Tracking
-- ============================================
-- Add bin_location column to site_inventory
ALTER TABLE site_inventory 
ADD COLUMN IF NOT EXISTS bin_location VARCHAR(100),
ADD COLUMN IF NOT EXISTS warehouse_location_id BIGINT REFERENCES warehouse_locations(id) ON DELETE SET NULL;

-- Add bin_location to inventory_batches
ALTER TABLE inventory_batches
ADD COLUMN IF NOT EXISTS bin_location VARCHAR(100),
ADD COLUMN IF NOT EXISTS warehouse_location_id BIGINT REFERENCES warehouse_locations(id) ON DELETE SET NULL;

-- Index for bin locations
CREATE INDEX IF NOT EXISTS idx_site_inventory_bin_location ON site_inventory(bin_location);
CREATE INDEX IF NOT EXISTS idx_site_inventory_warehouse_location ON site_inventory(warehouse_location_id);

-- ============================================
-- 4. Serial Number Tracking (Optional)
-- ============================================
CREATE TABLE IF NOT EXISTS inventory_serial_numbers (
  id BIGSERIAL PRIMARY KEY,
  item_id BIGINT REFERENCES inventory_items(id) ON DELETE CASCADE,
  site_id BIGINT REFERENCES sites(id) ON DELETE CASCADE,
  batch_id BIGINT REFERENCES inventory_batches(id) ON DELETE SET NULL,
  serial_number VARCHAR(255) NOT NULL UNIQUE,
  status VARCHAR(50) DEFAULT 'in_stock', -- in_stock, in_use, retired, lost
  assigned_to_job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  location_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for serial numbers
CREATE INDEX IF NOT EXISTS idx_serial_numbers_item ON inventory_serial_numbers(item_id);
CREATE INDEX IF NOT EXISTS idx_serial_numbers_site ON inventory_serial_numbers(site_id);
CREATE INDEX IF NOT EXISTS idx_serial_numbers_batch ON inventory_serial_numbers(batch_id);
CREATE INDEX IF NOT EXISTS idx_serial_numbers_status ON inventory_serial_numbers(status);

-- ============================================
-- 5. Views for Expiring Items
-- ============================================
CREATE OR REPLACE VIEW expiring_inventory AS
SELECT 
  b.id,
  b.batch_number,
  b.lot_number,
  b.expiration_date,
  b.quantity,
  b.site_id,
  s.name AS site_name,
  b.item_id,
  i.name AS item_name,
  i.unit,
  (b.expiration_date - CURRENT_DATE) AS days_until_expiration,
  CASE 
    WHEN b.expiration_date < CURRENT_DATE THEN 'expired'
    WHEN (b.expiration_date - CURRENT_DATE) <= 30 THEN 'expiring_soon'
    WHEN (b.expiration_date - CURRENT_DATE) <= 90 THEN 'expiring_soon'
    ELSE 'ok'
  END AS expiration_status
FROM inventory_batches b
JOIN sites s ON b.site_id = s.id
JOIN inventory_items i ON b.item_id = i.id
WHERE b.expiration_date IS NOT NULL
  AND b.quantity > 0
ORDER BY b.expiration_date ASC;

-- ============================================
-- 6. Function: Get Expiring Items Count
-- ============================================
CREATE OR REPLACE FUNCTION get_expiring_items_count(days_ahead INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM inventory_batches
  WHERE expiration_date IS NOT NULL
    AND expiration_date <= CURRENT_DATE + (days_ahead || ' days')::INTERVAL
    AND expiration_date >= CURRENT_DATE
    AND quantity > 0;
$$ LANGUAGE SQL;

-- ============================================
-- 7. Permissions
-- ============================================
ALTER TABLE inventory_batches DISABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse_locations DISABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_serial_numbers DISABLE ROW LEVEL SECURITY;

GRANT ALL ON inventory_batches TO authenticated;
GRANT ALL ON warehouse_locations TO authenticated;
GRANT ALL ON inventory_serial_numbers TO authenticated;

GRANT USAGE, SELECT ON SEQUENCE inventory_batches_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE warehouse_locations_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE inventory_serial_numbers_id_seq TO authenticated;

GRANT SELECT ON expiring_inventory TO authenticated;
GRANT SELECT ON expiring_inventory TO anon;

-- ============================================
-- 8. Triggers for Updated At
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop triggers if they exist before creating
DROP TRIGGER IF EXISTS update_inventory_batches_updated_at ON inventory_batches;
CREATE TRIGGER update_inventory_batches_updated_at
  BEFORE UPDATE ON inventory_batches
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_warehouse_locations_updated_at ON warehouse_locations;
CREATE TRIGGER update_warehouse_locations_updated_at
  BEFORE UPDATE ON warehouse_locations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_inventory_serial_numbers_updated_at ON inventory_serial_numbers;
CREATE TRIGGER update_inventory_serial_numbers_updated_at
  BEFORE UPDATE ON inventory_serial_numbers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Success Message
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '===========================================';
  RAISE NOTICE '✅ Advanced Inventory Features Created';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Tables:';
  RAISE NOTICE '  • inventory_batches (batch/lot tracking)';
  RAISE NOTICE '  • warehouse_locations (warehouse/location tracking)';
  RAISE NOTICE '  • inventory_serial_numbers (serial number tracking)';
  RAISE NOTICE '';
  RAISE NOTICE 'Columns Added:';
  RAISE NOTICE '  • site_inventory.bin_location';
  RAISE NOTICE '  • site_inventory.warehouse_location_id';
  RAISE NOTICE '';
  RAISE NOTICE 'Views:';
  RAISE NOTICE '  • expiring_inventory';
  RAISE NOTICE '';
  RAISE NOTICE 'Functions:';
  RAISE NOTICE '  • get_expiring_items_count()';
  RAISE NOTICE '';
  RAISE NOTICE 'Ready to use!';
  RAISE NOTICE '===========================================';
END $$;

