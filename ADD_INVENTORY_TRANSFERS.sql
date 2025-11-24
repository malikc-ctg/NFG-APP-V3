-- ============================================
-- Inventory Transfers Between Sites
-- ============================================
-- Allows transferring inventory items between sites
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- Inventory Transfers Table
-- ============================================
CREATE TABLE IF NOT EXISTS inventory_transfers (
  id BIGSERIAL PRIMARY KEY,
  transfer_number VARCHAR(50) UNIQUE NOT NULL,
  from_site_id BIGINT REFERENCES sites(id) ON DELETE SET NULL,
  to_site_id BIGINT REFERENCES sites(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'pending', -- pending, approved, in-transit, completed, cancelled
  requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  completed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Inventory Transfer Items
-- ============================================
CREATE TABLE IF NOT EXISTS inventory_transfer_items (
  id BIGSERIAL PRIMARY KEY,
  transfer_id BIGINT REFERENCES inventory_transfers(id) ON DELETE CASCADE,
  item_id BIGINT REFERENCES inventory_items(id) ON DELETE CASCADE,
  quantity_requested INTEGER NOT NULL,
  quantity_transferred INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_transfers_from_site ON inventory_transfers(from_site_id);
CREATE INDEX IF NOT EXISTS idx_transfers_to_site ON inventory_transfers(to_site_id);
CREATE INDEX IF NOT EXISTS idx_transfers_status ON inventory_transfers(status);
CREATE INDEX IF NOT EXISTS idx_transfer_items_transfer ON inventory_transfer_items(transfer_id);
CREATE INDEX IF NOT EXISTS idx_transfer_items_item ON inventory_transfer_items(item_id);

-- ============================================
-- Function: Generate Transfer Number
-- ============================================
CREATE OR REPLACE FUNCTION generate_transfer_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.transfer_number IS NULL OR NEW.transfer_number = '' THEN
    NEW.transfer_number := 'TRF-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
      LPAD(NEXTVAL('transfer_number_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create sequence for transfer numbers
CREATE SEQUENCE IF NOT EXISTS transfer_number_seq START 1;

-- Create trigger for auto-generating transfer numbers
DROP TRIGGER IF EXISTS trigger_generate_transfer_number ON inventory_transfers;
CREATE TRIGGER trigger_generate_transfer_number
  BEFORE INSERT ON inventory_transfers
  FOR EACH ROW
  EXECUTE FUNCTION generate_transfer_number();

-- ============================================
-- Function: Process Transfer (Complete)
-- ============================================
-- This function processes a transfer when it's completed
CREATE OR REPLACE FUNCTION process_inventory_transfer(transfer_id_param BIGINT)
RETURNS BOOLEAN AS $$
DECLARE
  transfer_record RECORD;
  transfer_item RECORD;
  source_quantity INTEGER;
BEGIN
  -- Get transfer details
  SELECT * INTO transfer_record
  FROM inventory_transfers
  WHERE id = transfer_id_param AND status = 'approved';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transfer not found or not approved';
  END IF;
  
  -- Process each item in the transfer
  FOR transfer_item IN 
    SELECT * FROM inventory_transfer_items 
    WHERE transfer_id = transfer_id_param
  LOOP
    -- Check source site has enough quantity
    SELECT quantity INTO source_quantity
    FROM site_inventory
    WHERE site_id = transfer_record.from_site_id 
      AND item_id = transfer_item.item_id;
    
    IF source_quantity IS NULL OR source_quantity < transfer_item.quantity_transferred THEN
      RAISE EXCEPTION 'Insufficient quantity at source site for item %', transfer_item.item_id;
    END IF;
    
    -- Deduct from source site
    UPDATE site_inventory
    SET quantity = quantity - transfer_item.quantity_transferred,
        updated_at = NOW()
    WHERE site_id = transfer_record.from_site_id 
      AND item_id = transfer_item.item_id;
    
    -- Add to destination site (or create if doesn't exist)
    INSERT INTO site_inventory (site_id, item_id, quantity, updated_at)
    VALUES (transfer_record.to_site_id, transfer_item.item_id, transfer_item.quantity_transferred, NOW())
    ON CONFLICT (site_id, item_id)
    DO UPDATE SET 
      quantity = site_inventory.quantity + transfer_item.quantity_transferred,
      updated_at = NOW();
    
    -- Create transaction records
    INSERT INTO inventory_transactions (
      item_id, site_id, transaction_type, 
      quantity_change, quantity_before, quantity_after, notes
    )
    VALUES (
      transfer_item.item_id, 
      transfer_record.from_site_id,
      'transfer_out',
      -transfer_item.quantity_transferred,
      source_quantity,
      source_quantity - transfer_item.quantity_transferred,
      'Transferred to site ' || transfer_record.to_site_id::TEXT
    );
    
    INSERT INTO inventory_transactions (
      item_id, site_id, transaction_type,
      quantity_change, quantity_before, quantity_after, notes
    )
    VALUES (
      transfer_item.item_id,
      transfer_record.to_site_id,
      'transfer_in',
      transfer_item.quantity_transferred,
      COALESCE((SELECT quantity FROM site_inventory WHERE site_id = transfer_record.to_site_id AND item_id = transfer_item.item_id), 0),
      COALESCE((SELECT quantity FROM site_inventory WHERE site_id = transfer_record.to_site_id AND item_id = transfer_item.item_id), 0) + transfer_item.quantity_transferred,
      'Transferred from site ' || transfer_record.from_site_id::TEXT
    );
  END LOOP;
  
  -- Update transfer status
  UPDATE inventory_transfers
  SET status = 'completed',
      completed_at = NOW(),
      updated_at = NOW()
  WHERE id = transfer_id_param;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- View: Transfers with Details
-- ============================================
CREATE OR REPLACE VIEW inventory_transfers_with_details AS
SELECT 
  t.id,
  t.transfer_number,
  t.status,
  t.requested_at,
  t.approved_at,
  t.completed_at,
  t.notes,
  from_site.id AS from_site_id,
  from_site.name AS from_site_name,
  to_site.id AS to_site_id,
  to_site.name AS to_site_name,
  requester.full_name AS requester_name,
  approver.full_name AS approver_name,
  completer.full_name AS completer_name,
  COUNT(ti.id) AS total_items,
  SUM(ti.quantity_requested) AS total_quantity_requested,
  SUM(ti.quantity_transferred) AS total_quantity_transferred
FROM inventory_transfers t
LEFT JOIN sites from_site ON t.from_site_id = from_site.id
LEFT JOIN sites to_site ON t.to_site_id = to_site.id
LEFT JOIN user_profiles requester ON t.requested_by = requester.id
LEFT JOIN user_profiles approver ON t.approved_by = approver.id
LEFT JOIN user_profiles completer ON t.completed_by = completer.id
LEFT JOIN inventory_transfer_items ti ON t.id = ti.transfer_id
GROUP BY t.id, t.transfer_number, t.status, t.requested_at, t.approved_at, t.completed_at,
         t.notes, from_site.id, from_site.name, to_site.id, to_site.name,
         requester.full_name, approver.full_name, completer.full_name
ORDER BY t.created_at DESC;

-- ============================================
-- Permissions
-- ============================================
ALTER TABLE inventory_transfers DISABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transfer_items DISABLE ROW LEVEL SECURITY;

GRANT ALL ON inventory_transfers TO authenticated;
GRANT ALL ON inventory_transfer_items TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE inventory_transfers_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE inventory_transfer_items_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE transfer_number_seq TO authenticated;

-- ============================================
-- Success Message
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '===========================================';
  RAISE NOTICE '✅ Inventory Transfers System Created';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Tables:';
  RAISE NOTICE '  • inventory_transfers';
  RAISE NOTICE '  • inventory_transfer_items';
  RAISE NOTICE '';
  RAISE NOTICE 'Functions:';
  RAISE NOTICE '  • generate_transfer_number()';
  RAISE NOTICE '  • process_inventory_transfer()';
  RAISE NOTICE '';
  RAISE NOTICE 'Views:';
  RAISE NOTICE '  • inventory_transfers_with_details';
  RAISE NOTICE '';
  RAISE NOTICE 'Ready to use!';
  RAISE NOTICE '===========================================';
END $$;

