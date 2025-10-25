-- ============================================
-- NFG Inventory Tracking System
-- ============================================
-- Features:
-- ✅ Site-specific inventory tracking
-- ✅ Transaction history (use, restock, transfer)
-- ✅ Low stock alerts
-- ✅ Job usage tracking
-- ✅ Category-based organization
-- ============================================

-- 1. Inventory Categories Table
CREATE TABLE IF NOT EXISTS inventory_categories (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  icon VARCHAR(50) DEFAULT '📦',
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Inventory Items (Master List)
CREATE TABLE IF NOT EXISTS inventory_items (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category_id BIGINT REFERENCES inventory_categories(id) ON DELETE SET NULL,
  unit VARCHAR(50) DEFAULT 'pieces', -- bottles, boxes, pieces, liters, etc.
  low_stock_threshold INTEGER DEFAULT 5,
  reorder_quantity INTEGER DEFAULT 20,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Site Inventory (Quantity per Site)
CREATE TABLE IF NOT EXISTS site_inventory (
  id BIGSERIAL PRIMARY KEY,
  site_id BIGINT REFERENCES sites(id) ON DELETE CASCADE,
  item_id BIGINT REFERENCES inventory_items(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 0,
  location_notes TEXT, -- e.g., "Storage closet, 2nd floor"
  last_restocked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(site_id, item_id) -- One entry per item per site
);

-- 4. Inventory Transactions (History)
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id BIGSERIAL PRIMARY KEY,
  item_id BIGINT REFERENCES inventory_items(id) ON DELETE CASCADE,
  site_id BIGINT REFERENCES sites(id) ON DELETE SET NULL,
  job_id BIGINT REFERENCES jobs(id) ON DELETE SET NULL,
  transaction_type VARCHAR(50) NOT NULL, -- 'use', 'restock', 'transfer', 'adjustment', 'return'
  quantity_change INTEGER NOT NULL, -- Positive for additions, negative for usage
  quantity_before INTEGER NOT NULL,
  quantity_after INTEGER NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES for Performance
-- ============================================
CREATE INDEX idx_inventory_items_category ON inventory_items(category_id);
CREATE INDEX idx_site_inventory_site ON site_inventory(site_id);
CREATE INDEX idx_site_inventory_item ON site_inventory(item_id);
CREATE INDEX idx_inventory_transactions_item ON inventory_transactions(item_id);
CREATE INDEX idx_inventory_transactions_site ON inventory_transactions(site_id);
CREATE INDEX idx_inventory_transactions_job ON inventory_transactions(job_id);
CREATE INDEX idx_inventory_transactions_user ON inventory_transactions(user_id);
CREATE INDEX idx_inventory_transactions_created ON inventory_transactions(created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY (Disable for simplicity)
-- ============================================
ALTER TABLE inventory_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE site_inventory DISABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions DISABLE ROW LEVEL SECURITY;

-- ============================================
-- PERMISSIONS
-- ============================================
GRANT ALL ON inventory_categories TO authenticated;
GRANT ALL ON inventory_categories TO anon;
GRANT ALL ON inventory_items TO authenticated;
GRANT ALL ON inventory_items TO anon;
GRANT ALL ON site_inventory TO authenticated;
GRANT ALL ON site_inventory TO anon;
GRANT ALL ON inventory_transactions TO authenticated;
GRANT ALL ON inventory_transactions TO anon;

GRANT USAGE, SELECT ON SEQUENCE inventory_categories_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE inventory_categories_id_seq TO anon;
GRANT USAGE, SELECT ON SEQUENCE inventory_items_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE inventory_items_id_seq TO anon;
GRANT USAGE, SELECT ON SEQUENCE site_inventory_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE site_inventory_id_seq TO anon;
GRANT USAGE, SELECT ON SEQUENCE inventory_transactions_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE inventory_transactions_id_seq TO anon;

-- ============================================
-- SEED DATA - Default Categories
-- ============================================
INSERT INTO inventory_categories (name, icon, description, sort_order) VALUES
  ('Cleaning Supplies', '🧹', 'Mops, brooms, sponges, rags', 1),
  ('Chemicals', '🧴', 'Bleach, disinfectants, detergents', 2),
  ('Tools', '🔧', 'Vacuums, floor buffers, equipment', 3),
  ('Paper Products', '🧻', 'Paper towels, toilet paper, tissues', 4),
  ('PPE', '🦺', 'Gloves, masks, safety equipment', 5),
  ('Trash Bags', '🗑️', 'Garbage bags, recycling bags', 6),
  ('Other', '📦', 'Miscellaneous items', 99)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- SAMPLE INVENTORY ITEMS (Optional - Delete if not needed)
-- ============================================
INSERT INTO inventory_items (name, category_id, unit, low_stock_threshold, reorder_quantity, notes) VALUES
  -- Cleaning Supplies
  ('Floor Mop', (SELECT id FROM inventory_categories WHERE name = 'Cleaning Supplies'), 'pieces', 2, 5, 'Standard floor mop'),
  ('Microfiber Cloths (Pack)', (SELECT id FROM inventory_categories WHERE name = 'Cleaning Supplies'), 'packs', 3, 10, '12-pack of microfiber cloths'),
  ('Sponges (Pack)', (SELECT id FROM inventory_categories WHERE name = 'Cleaning Supplies'), 'packs', 5, 15, '6-pack kitchen sponges'),
  ('Dust Mop', (SELECT id FROM inventory_categories WHERE name = 'Cleaning Supplies'), 'pieces', 2, 5, 'Dust mop with extendable handle'),
  
  -- Chemicals
  ('Bleach (5L)', (SELECT id FROM inventory_categories WHERE name = 'Chemicals'), 'bottles', 3, 10, 'Household bleach, 5 liter bottles'),
  ('All-Purpose Cleaner (1L)', (SELECT id FROM inventory_categories WHERE name = 'Chemicals'), 'bottles', 5, 15, 'Multi-surface cleaner'),
  ('Glass Cleaner (750ml)', (SELECT id FROM inventory_categories WHERE name = 'Chemicals'), 'bottles', 4, 12, 'Window and glass cleaner'),
  ('Disinfectant Spray', (SELECT id FROM inventory_categories WHERE name = 'Chemicals'), 'bottles', 5, 15, 'Hospital-grade disinfectant'),
  ('Floor Cleaner (5L)', (SELECT id FROM inventory_categories WHERE name = 'Chemicals'), 'bottles', 3, 10, 'Floor cleaning solution'),
  
  -- Tools
  ('Vacuum Cleaner', (SELECT id FROM inventory_categories WHERE name = 'Tools'), 'pieces', 1, 2, 'Commercial vacuum cleaner'),
  ('Floor Buffer', (SELECT id FROM inventory_categories WHERE name = 'Tools'), 'pieces', 1, 2, 'Electric floor buffer/polisher'),
  ('Wet/Dry Vacuum', (SELECT id FROM inventory_categories WHERE name = 'Tools'), 'pieces', 1, 2, 'Wet and dry vacuum cleaner'),
  ('Extension Ladder', (SELECT id FROM inventory_categories WHERE name = 'Tools'), 'pieces', 1, 2, '6-foot extension ladder'),
  
  -- Paper Products
  ('Paper Towels (Roll)', (SELECT id FROM inventory_categories WHERE name = 'Paper Products'), 'rolls', 20, 50, 'Commercial paper towel rolls'),
  ('Toilet Paper (Roll)', (SELECT id FROM inventory_categories WHERE name = 'Paper Products'), 'rolls', 30, 100, 'Standard toilet paper'),
  ('Hand Towels (Dispenser)', (SELECT id FROM inventory_categories WHERE name = 'Paper Products'), 'packs', 10, 30, 'Dispenser hand towels'),
  
  -- PPE
  ('Latex Gloves (Box)', (SELECT id FROM inventory_categories WHERE name = 'PPE'), 'boxes', 5, 15, '100-count box of latex gloves'),
  ('Nitrile Gloves (Box)', (SELECT id FROM inventory_categories WHERE name = 'PPE'), 'boxes', 5, 15, '100-count box of nitrile gloves'),
  ('Face Masks (Box)', (SELECT id FROM inventory_categories WHERE name = 'PPE'), 'boxes', 3, 10, '50-count box of disposable masks'),
  ('Safety Goggles', (SELECT id FROM inventory_categories WHERE name = 'PPE'), 'pieces', 2, 5, 'Chemical-resistant safety goggles'),
  
  -- Trash Bags
  ('Trash Bags - Small (30L)', (SELECT id FROM inventory_categories WHERE name = 'Trash Bags'), 'boxes', 5, 20, 'Box of 100 small trash bags'),
  ('Trash Bags - Large (100L)', (SELECT id FROM inventory_categories WHERE name = 'Trash Bags'), 'boxes', 5, 20, 'Box of 50 large trash bags'),
  ('Recycling Bags (Blue)', (SELECT id FROM inventory_categories WHERE name = 'Trash Bags'), 'boxes', 3, 15, 'Box of 100 blue recycling bags')
ON CONFLICT DO NOTHING;

-- ============================================
-- VIEWS for Easy Queries
-- ============================================

-- View: Inventory with Category Info
CREATE OR REPLACE VIEW inventory_with_categories AS
SELECT 
  i.id,
  i.name,
  i.unit,
  i.low_stock_threshold,
  i.reorder_quantity,
  i.notes,
  c.name as category_name,
  c.icon as category_icon,
  i.created_at,
  i.updated_at
FROM inventory_items i
LEFT JOIN inventory_categories c ON i.category_id = c.id
ORDER BY c.sort_order, i.name;

-- View: Site Inventory with Low Stock Alerts
CREATE OR REPLACE VIEW site_inventory_status AS
SELECT 
  si.id,
  si.site_id,
  s.name as site_name,
  si.item_id,
  i.name as item_name,
  i.unit,
  si.quantity,
  i.low_stock_threshold,
  c.name as category_name,
  c.icon as category_icon,
  CASE 
    WHEN si.quantity = 0 THEN 'out'
    WHEN si.quantity < i.low_stock_threshold THEN 'low'
    WHEN si.quantity < (i.low_stock_threshold * 2) THEN 'warning'
    ELSE 'ok'
  END as stock_status,
  si.location_notes,
  si.last_restocked_at,
  si.updated_at
FROM site_inventory si
JOIN inventory_items i ON si.item_id = i.id
JOIN sites s ON si.site_id = s.id
LEFT JOIN inventory_categories c ON i.category_id = c.id
ORDER BY s.name, c.sort_order, i.name;

-- View: Recent Inventory Activity
CREATE OR REPLACE VIEW recent_inventory_activity AS
SELECT 
  t.id,
  t.transaction_type,
  t.quantity_change,
  t.quantity_before,
  t.quantity_after,
  i.name as item_name,
  i.unit,
  s.name as site_name,
  j.title as job_title,
  up.full_name as user_name,
  up.email as user_email,
  t.notes,
  t.created_at
FROM inventory_transactions t
JOIN inventory_items i ON t.item_id = i.id
LEFT JOIN sites s ON t.site_id = s.id
LEFT JOIN jobs j ON t.job_id = j.id
LEFT JOIN user_profiles up ON t.user_id = up.id
ORDER BY t.created_at DESC;

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function: Get Total Stock Across All Sites for an Item
CREATE OR REPLACE FUNCTION get_total_stock(p_item_id BIGINT)
RETURNS INTEGER AS $$
  SELECT COALESCE(SUM(quantity), 0)::INTEGER
  FROM site_inventory
  WHERE item_id = p_item_id;
$$ LANGUAGE SQL;

-- Function: Get Low Stock Count by Category
CREATE OR REPLACE FUNCTION get_low_stock_by_category()
RETURNS TABLE (category_name VARCHAR, low_count BIGINT, total_items BIGINT) AS $$
  SELECT 
    c.name as category_name,
    COUNT(CASE WHEN si.quantity < i.low_stock_threshold THEN 1 END) as low_count,
    COUNT(DISTINCT i.id) as total_items
  FROM inventory_categories c
  LEFT JOIN inventory_items i ON c.id = i.category_id
  LEFT JOIN site_inventory si ON i.id = si.item_id
  GROUP BY c.id, c.name, c.sort_order
  ORDER BY c.sort_order;
$$ LANGUAGE SQL;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ Inventory system setup complete!';
  RAISE NOTICE '📦 Tables created: inventory_categories, inventory_items, site_inventory, inventory_transactions';
  RAISE NOTICE '🔍 Views created: inventory_with_categories, site_inventory_status, recent_inventory_activity';
  RAISE NOTICE '⚡ Functions created: get_total_stock(), get_low_stock_by_category()';
  RAISE NOTICE '🌱 Sample data inserted: 7 categories, 23 sample items';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Next Steps:';
  RAISE NOTICE '1. Add initial stock to your sites using the Inventory page';
  RAISE NOTICE '2. Set low stock thresholds per item';
  RAISE NOTICE '3. Track usage when completing jobs';
END $$;

