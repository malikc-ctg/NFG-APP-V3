-- ============================================
-- Barcode & QR Code Support for Inventory
-- ============================================
-- Phase 2.1: Add barcode fields and scanning infrastructure
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. Add Barcode Fields to inventory_items
-- ============================================
ALTER TABLE inventory_items
  ADD COLUMN IF NOT EXISTS barcode VARCHAR(100) UNIQUE,
  ADD COLUMN IF NOT EXISTS barcode_type VARCHAR(20) DEFAULT 'CODE128',
  ADD COLUMN IF NOT EXISTS qr_code_url TEXT,
  ADD COLUMN IF NOT EXISTS last_scanned_at TIMESTAMPTZ;

-- Index for fast barcode lookups
CREATE INDEX IF NOT EXISTS idx_inventory_items_barcode 
  ON inventory_items(barcode) 
  WHERE barcode IS NOT NULL;

-- Index for last scanned queries
CREATE INDEX IF NOT EXISTS idx_inventory_items_last_scanned 
  ON inventory_items(last_scanned_at) 
  WHERE last_scanned_at IS NOT NULL;

-- ============================================
-- 2. Barcode Scan Audit Log
-- ============================================
CREATE TABLE IF NOT EXISTS barcode_scan_logs (
  id BIGSERIAL PRIMARY KEY,
  barcode VARCHAR(100) NOT NULL,
  item_id BIGINT REFERENCES inventory_items(id) ON DELETE SET NULL,
  scanned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  site_id BIGINT REFERENCES sites(id) ON DELETE SET NULL,
  scan_result VARCHAR(50) NOT NULL, -- 'found', 'not_found', 'wrong_site', 'cached'
  scan_source VARCHAR(20) DEFAULT 'database', -- 'database', 'cache', 'qr_code'
  device_info JSONB, -- Browser, OS, device type
  location JSONB, -- GPS coordinates if available {lat, lng, accuracy}
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for scan logs
CREATE INDEX IF NOT EXISTS idx_scan_logs_barcode ON barcode_scan_logs(barcode);
CREATE INDEX IF NOT EXISTS idx_scan_logs_scanned_by ON barcode_scan_logs(scanned_by);
CREATE INDEX IF NOT EXISTS idx_scan_logs_site_id ON barcode_scan_logs(site_id);
CREATE INDEX IF NOT EXISTS idx_scan_logs_created_at ON barcode_scan_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_scan_logs_result ON barcode_scan_logs(scan_result);

-- ============================================
-- 3. View: Recent Scans
-- ============================================
CREATE OR REPLACE VIEW recent_barcode_scans AS
SELECT 
  s.id,
  s.barcode,
  s.scan_result,
  s.scan_source,
  s.created_at,
  s.item_id,
  i.name AS item_name,
  s.scanned_by,
  u.full_name AS scanned_by_name,
  u.email AS scanned_by_email,
  s.site_id,
  st.name AS site_name,
  s.device_info,
  s.location
FROM barcode_scan_logs s
LEFT JOIN inventory_items i ON s.item_id = i.id
LEFT JOIN user_profiles u ON s.scanned_by = u.id
LEFT JOIN sites st ON s.site_id = st.id
ORDER BY s.created_at DESC
LIMIT 100;

-- ============================================
-- 4. Function: Generate Barcode for Item
-- ============================================
CREATE OR REPLACE FUNCTION generate_item_barcode(item_id BIGINT)
RETURNS VARCHAR AS $$
DECLARE
  barcode VARCHAR;
BEGIN
  -- Format: INV-{timestamp}-{item_id}
  barcode := 'INV-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || item_id;
  RETURN barcode;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 5. RLS Policies for barcode_scan_logs
-- ============================================
ALTER TABLE barcode_scan_logs ENABLE ROW LEVEL SECURITY;

-- Users can log their own scans
DROP POLICY IF EXISTS "Users can log scans" ON barcode_scan_logs;
CREATE POLICY "Users can log scans"
ON barcode_scan_logs FOR INSERT
WITH CHECK (auth.uid() = scanned_by);

-- Users can view their own scans
DROP POLICY IF EXISTS "Users can view own scans" ON barcode_scan_logs;
CREATE POLICY "Users can view own scans"
ON barcode_scan_logs FOR SELECT
USING (
  auth.uid() = scanned_by 
  OR EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'manager', 'super_admin')
  )
);

-- Admins/managers can view all scans
DROP POLICY IF EXISTS "Admins can view all scans" ON barcode_scan_logs;
CREATE POLICY "Admins can view all scans"
ON barcode_scan_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'manager', 'super_admin')
  )
);

-- ============================================
-- 6. Permissions
-- ============================================
GRANT SELECT ON recent_barcode_scans TO authenticated;
GRANT SELECT ON recent_barcode_scans TO anon;

GRANT EXECUTE ON FUNCTION generate_item_barcode(BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_item_barcode(BIGINT) TO anon;

-- ============================================
-- 7. Create Supabase Storage Bucket for QR Codes
-- ============================================
-- Note: Run this manually in Supabase Dashboard > Storage
-- Bucket name: inventory-assets
-- Public: Yes
-- File size limit: 5 MB
-- Allowed MIME types: image/png, image/jpeg, image/svg+xml

-- ============================================
-- Success Message
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '===========================================';
  RAISE NOTICE '✅ Barcode Support Added';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Added Columns to inventory_items:';
  RAISE NOTICE '  • barcode (VARCHAR, unique)';
  RAISE NOTICE '  • barcode_type (VARCHAR)';
  RAISE NOTICE '  • qr_code_url (TEXT)';
  RAISE NOTICE '  • last_scanned_at (TIMESTAMPTZ)';
  RAISE NOTICE '';
  RAISE NOTICE 'New Table:';
  RAISE NOTICE '  • barcode_scan_logs';
  RAISE NOTICE '';
  RAISE NOTICE 'New View:';
  RAISE NOTICE '  • recent_barcode_scans';
  RAISE NOTICE '';
  RAISE NOTICE 'New Function:';
  RAISE NOTICE '  • generate_item_barcode(item_id)';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  ACTION REQUIRED:';
  RAISE NOTICE '  Create storage bucket "inventory-assets" in Supabase Dashboard';
  RAISE NOTICE '  Set it to public, 5MB limit, allow images';
  RAISE NOTICE '';
  RAISE NOTICE 'Ready for barcode scanning!';
  RAISE NOTICE '===========================================';
END $$;

