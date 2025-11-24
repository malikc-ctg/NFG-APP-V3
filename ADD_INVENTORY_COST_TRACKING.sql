-- ============================================
-- Add Cost Tracking to Inventory Items
-- ============================================
-- This adds cost fields to inventory_items table
-- Run this in Supabase SQL Editor
-- ============================================

-- Add cost columns to inventory_items
ALTER TABLE inventory_items 
  ADD COLUMN IF NOT EXISTS unit_cost DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS last_purchase_cost DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS average_cost DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS preferred_supplier_id BIGINT REFERENCES suppliers(id) ON DELETE SET NULL;

-- Add cost to site_inventory (for site-specific pricing)
ALTER TABLE site_inventory
  ADD COLUMN IF NOT EXISTS unit_cost DECIMAL(10,2);

-- Create index for preferred supplier lookup
CREATE INDEX IF NOT EXISTS idx_inventory_items_preferred_supplier 
  ON inventory_items(preferred_supplier_id);

-- ============================================
-- Function: Update Average Cost
-- ============================================
-- This function calculates average cost when items are received
CREATE OR REPLACE FUNCTION update_inventory_average_cost()
RETURNS TRIGGER AS $$
DECLARE
  current_avg_cost DECIMAL(10,2);
  current_qty INTEGER;
  new_cost DECIMAL(10,2);
  new_qty INTEGER;
  total_cost DECIMAL(10,2);
  total_qty INTEGER;
BEGIN
  -- Get current average cost and quantity for this item
  SELECT 
    COALESCE(avg(unit_cost), 0),
    COALESCE(SUM(quantity), 0)
  INTO current_avg_cost, current_qty
  FROM site_inventory
  WHERE item_id = NEW.item_id;
  
  -- If this is a new site inventory entry with cost
  IF NEW.unit_cost IS NOT NULL AND NEW.unit_cost > 0 THEN
    new_cost := NEW.unit_cost;
    new_qty := NEW.quantity;
    
    -- Calculate weighted average
    IF current_qty > 0 THEN
      total_cost := (current_avg_cost * current_qty) + (new_cost * new_qty);
      total_qty := current_qty + new_qty;
      current_avg_cost := total_cost / total_qty;
    ELSE
      current_avg_cost := new_cost;
    END IF;
    
    -- Update average cost in inventory_items
    UPDATE inventory_items
    SET average_cost = current_avg_cost,
        last_purchase_cost = new_cost
    WHERE id = NEW.item_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update average cost when inventory is updated
DROP TRIGGER IF EXISTS trigger_update_average_cost ON site_inventory;
CREATE TRIGGER trigger_update_average_cost
  AFTER INSERT OR UPDATE OF quantity, unit_cost ON site_inventory
  FOR EACH ROW
  WHEN (NEW.unit_cost IS NOT NULL AND NEW.unit_cost > 0)
  EXECUTE FUNCTION update_inventory_average_cost();

-- ============================================
-- View: Inventory with Costs
-- ============================================
CREATE OR REPLACE VIEW inventory_with_costs AS
SELECT 
  i.id,
  i.name,
  i.unit,
  i.low_stock_threshold,
  i.reorder_quantity,
  i.unit_cost,
  i.last_purchase_cost,
  i.average_cost,
  i.preferred_supplier_id,
  s.name AS preferred_supplier_name,
  c.name AS category_name,
  c.icon AS category_icon,
  -- Calculate total inventory value
  COALESCE(SUM(si.quantity * COALESCE(si.unit_cost, i.average_cost, i.unit_cost, 0)), 0) AS total_inventory_value,
  -- Total quantity across all sites
  COALESCE(SUM(si.quantity), 0) AS total_quantity,
  i.created_at,
  i.updated_at
FROM inventory_items i
LEFT JOIN inventory_categories c ON i.category_id = c.id
LEFT JOIN suppliers s ON i.preferred_supplier_id = s.id
LEFT JOIN site_inventory si ON i.id = si.item_id
GROUP BY i.id, i.name, i.unit, i.low_stock_threshold, i.reorder_quantity,
         i.unit_cost, i.last_purchase_cost, i.average_cost, i.preferred_supplier_id,
         s.name, c.name, c.icon, c.sort_order, i.created_at, i.updated_at
ORDER BY c.sort_order, i.name;

-- ============================================
-- Success Message
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '===========================================';
  RAISE NOTICE '✅ Cost Tracking Added to Inventory';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Added columns:';
  RAISE NOTICE '  • unit_cost';
  RAISE NOTICE '  • last_purchase_cost';
  RAISE NOTICE '  • average_cost';
  RAISE NOTICE '  • preferred_supplier_id';
  RAISE NOTICE '';
  RAISE NOTICE 'Created:';
  RAISE NOTICE '  • update_inventory_average_cost() function';
  RAISE NOTICE '  • trigger_update_average_cost trigger';
  RAISE NOTICE '  • inventory_with_costs view';
  RAISE NOTICE '';
  RAISE NOTICE 'Costs will auto-update when inventory is received!';
  RAISE NOTICE '===========================================';
END $$;

