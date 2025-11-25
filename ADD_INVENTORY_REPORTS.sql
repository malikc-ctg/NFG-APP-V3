-- ============================================
-- Advanced Inventory Reports
-- ============================================
-- Phase 6: Inventory Valuation, Trends, ABC Analysis, Expiring Items
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- IMPORTANT: Prerequisites
-- ============================================
-- Before running this, ensure you have:
-- 1. Run ADD_ADVANCED_INVENTORY_FEATURES.sql (Phase 5) for warehouse_locations
-- 2. Run ADD_INVENTORY_COST_TRACKING.sql (Phase 1) for cost fields
-- 3. Base inventory tables (inventory_items, site_inventory, etc.)
-- ============================================

-- Drop views if they exist (for idempotency)
DROP VIEW IF EXISTS inventory_valuation_report CASCADE;
DROP VIEW IF EXISTS stock_movement_trends CASCADE;
DROP VIEW IF EXISTS inventory_abc_analysis CASCADE;
DROP VIEW IF EXISTS expiring_items_detailed_report CASCADE;
DROP VIEW IF EXISTS usage_forecast CASCADE;
DROP VIEW IF EXISTS cost_analysis_report CASCADE;
DROP FUNCTION IF EXISTS get_inventory_summary_stats() CASCADE;

-- ============================================
-- 1. Inventory Valuation Report
-- ============================================
CREATE OR REPLACE VIEW inventory_valuation_report AS
SELECT 
  s.id AS site_id,
  s.name AS site_name,
  i.id AS item_id,
  i.name AS item_name,
  c.name AS category_name,
  si.quantity,
  i.unit,
  COALESCE(si.unit_cost, i.average_cost, i.unit_cost, 0) AS unit_cost,
  (si.quantity * COALESCE(si.unit_cost, i.average_cost, i.unit_cost, 0)) AS total_value,
  si.warehouse_location_id,
  wl.name AS warehouse_location_name,
  si.bin_location
FROM site_inventory si
JOIN sites s ON si.site_id = s.id
JOIN inventory_items i ON si.item_id = i.id
LEFT JOIN inventory_categories c ON i.category_id = c.id
LEFT JOIN warehouse_locations wl ON si.warehouse_location_id = wl.id
WHERE si.quantity > 0
ORDER BY s.name, c.name, i.name;

-- Handle case where warehouse_locations table doesn't exist yet
-- (if Phase 5 not run, this view will still work without warehouse location info)

-- ============================================
-- 2. Stock Movement Trends (Monthly)
-- ============================================
CREATE OR REPLACE VIEW stock_movement_trends AS
SELECT 
  DATE_TRUNC('month', t.created_at) AS month,
  i.id AS item_id,
  i.name AS item_name,
  s.id AS site_id,
  s.name AS site_name,
  SUM(CASE WHEN t.transaction_type = 'restock' THEN t.quantity_change ELSE 0 END) AS total_restocked,
  SUM(CASE WHEN t.transaction_type = 'use' THEN ABS(t.quantity_change) ELSE 0 END) AS total_used,
  SUM(CASE WHEN t.transaction_type = 'transfer_in' THEN t.quantity_change ELSE 0 END) AS total_transferred_in,
  SUM(CASE WHEN t.transaction_type = 'transfer_out' THEN ABS(t.quantity_change) ELSE 0 END) AS total_transferred_out,
  COUNT(*) AS total_transactions
FROM inventory_transactions t
JOIN inventory_items i ON t.item_id = i.id
LEFT JOIN sites s ON t.site_id = s.id
GROUP BY DATE_TRUNC('month', t.created_at), i.id, i.name, s.id, s.name
ORDER BY month DESC, s.name, i.name;

-- ============================================
-- 3. ABC Analysis (High/Medium/Low Value Items)
-- ============================================
CREATE OR REPLACE VIEW inventory_abc_analysis AS
WITH item_values AS (
  SELECT 
    i.id AS item_id,
    i.name AS item_name,
    SUM(si.quantity * COALESCE(si.unit_cost, i.average_cost, i.unit_cost, 0)) AS total_value,
    SUM(si.quantity) AS total_quantity
  FROM inventory_items i
  LEFT JOIN site_inventory si ON i.id = si.item_id
  GROUP BY i.id, i.name
),
total_inventory_value AS (
  SELECT SUM(total_value) AS grand_total
  FROM item_values
),
ranked_items AS (
  SELECT 
    iv.*,
    (iv.total_value / NULLIF(tv.grand_total, 0) * 100) AS value_percentage,
    SUM(iv.total_value) OVER (ORDER BY iv.total_value DESC) AS cumulative_value,
    (SUM(iv.total_value) OVER (ORDER BY iv.total_value DESC) / NULLIF(tv.grand_total, 0) * 100) AS cumulative_percentage
  FROM item_values iv
  CROSS JOIN total_inventory_value tv
)
SELECT 
  item_id,
  item_name,
  total_value,
  total_quantity,
  value_percentage,
  cumulative_percentage,
  CASE 
    WHEN cumulative_percentage <= 80 THEN 'A' -- High value items (80% of total value)
    WHEN cumulative_percentage <= 95 THEN 'B' -- Medium value items (15% of total value)
    ELSE 'C' -- Low value items (5% of total value)
  END AS abc_category
FROM ranked_items
ORDER BY total_value DESC;

-- ============================================
-- 4. Expiring Items Report (Detailed)
-- ============================================
-- Already created in Phase 5, but enhancing it
CREATE OR REPLACE VIEW expiring_items_detailed_report AS
SELECT 
  b.id,
  b.batch_number,
  b.lot_number,
  b.expiration_date,
  b.manufactured_date,
  b.received_date,
  b.quantity,
  (b.expiration_date - CURRENT_DATE) AS days_until_expiration,
  b.site_id,
  s.name AS site_name,
  b.item_id,
  i.name AS item_name,
  i.unit,
  c.name AS category_name,
  b.warehouse_location_id,
  wl.name AS warehouse_location_name,
  b.bin_location,
  COALESCE(si.unit_cost, i.average_cost, i.unit_cost, 0) AS unit_cost,
  (b.quantity * COALESCE(si.unit_cost, i.average_cost, i.unit_cost, 0)) AS batch_value,
  CASE 
    WHEN b.expiration_date < CURRENT_DATE THEN 'expired'
    WHEN (b.expiration_date - CURRENT_DATE) <= 7 THEN 'expiring_soon_critical'
    WHEN (b.expiration_date - CURRENT_DATE) <= 30 THEN 'expiring_soon'
    WHEN (b.expiration_date - CURRENT_DATE) <= 90 THEN 'expiring_later'
    ELSE 'ok'
  END AS expiration_status
FROM inventory_batches b
JOIN sites s ON b.site_id = s.id
JOIN inventory_items i ON b.item_id = i.id
LEFT JOIN inventory_categories c ON i.category_id = c.id
LEFT JOIN warehouse_locations wl ON b.warehouse_location_id = wl.id
LEFT JOIN site_inventory si ON b.site_id = si.site_id AND b.item_id = si.item_id
WHERE b.expiration_date IS NOT NULL
  AND b.quantity > 0
ORDER BY b.expiration_date ASC, s.name, i.name;

-- ============================================
-- 5. Usage Forecasting (Based on Historical Usage)
-- ============================================
CREATE OR REPLACE VIEW usage_forecast AS
WITH monthly_usage AS (
  SELECT 
    t.item_id,
    t.site_id,
    DATE_TRUNC('month', t.created_at) AS month,
    SUM(ABS(t.quantity_change)) AS monthly_usage
  FROM inventory_transactions t
  WHERE t.transaction_type IN ('use', 'transfer_out')
    AND t.created_at >= CURRENT_DATE - INTERVAL '6 months'
  GROUP BY t.item_id, t.site_id, DATE_TRUNC('month', t.created_at)
),
avg_monthly_usage AS (
  SELECT 
    item_id,
    site_id,
    AVG(monthly_usage) AS avg_monthly_usage,
    COUNT(*) AS months_of_data,
    STDDEV(monthly_usage) AS usage_stddev
  FROM monthly_usage
  GROUP BY item_id, site_id
),
current_stock AS (
  SELECT 
    item_id,
    site_id,
    quantity AS current_quantity
  FROM site_inventory
)
SELECT 
  i.id AS item_id,
  i.name AS item_name,
  s.id AS site_id,
  s.name AS site_name,
  cs.current_quantity,
  amu.avg_monthly_usage,
  amu.usage_stddev,
  amu.months_of_data,
  i.low_stock_threshold,
  i.reorder_quantity,
  CASE 
    WHEN amu.avg_monthly_usage > 0 THEN 
      ROUND((cs.current_quantity / amu.avg_monthly_usage)::numeric, 1)
    ELSE NULL
  END AS months_remaining,
  CASE 
    WHEN amu.avg_monthly_usage > 0 AND (cs.current_quantity / amu.avg_monthly_usage) < 1 THEN 'needs_restock_soon'
    WHEN amu.avg_monthly_usage > 0 AND (cs.current_quantity / amu.avg_monthly_usage) < 2 THEN 'needs_restock_later'
    ELSE 'stock_adequate'
  END AS forecast_status
FROM inventory_items i
CROSS JOIN sites s
LEFT JOIN current_stock cs ON i.id = cs.item_id AND s.id = cs.site_id
LEFT JOIN avg_monthly_usage amu ON i.id = amu.item_id AND s.id = amu.site_id
WHERE cs.current_quantity > 0 OR amu.avg_monthly_usage > 0
ORDER BY s.name, i.name;

-- ============================================
-- 6. Cost Analysis Report
-- ============================================
CREATE OR REPLACE VIEW cost_analysis_report AS
SELECT 
  i.id AS item_id,
  i.name AS item_name,
  c.name AS category_name,
  COUNT(DISTINCT si.site_id) AS sites_count,
  SUM(si.quantity) AS total_quantity_across_sites,
  AVG(COALESCE(si.unit_cost, i.average_cost, i.unit_cost, 0)) AS avg_unit_cost,
  MIN(COALESCE(si.unit_cost, i.average_cost, i.unit_cost, 0)) AS min_unit_cost,
  MAX(COALESCE(si.unit_cost, i.average_cost, i.unit_cost, 0)) AS max_unit_cost,
  i.unit_cost AS standard_unit_cost,
  i.average_cost AS item_average_cost,
  i.last_purchase_cost,
  SUM(si.quantity * COALESCE(si.unit_cost, i.average_cost, i.unit_cost, 0)) AS total_value,
  -- Supplier info
  (SELECT COUNT(DISTINCT iis.supplier_id) 
   FROM inventory_item_suppliers iis 
   WHERE iis.item_id = i.id) AS supplier_count,
  (SELECT AVG(poi.cost_per_unit)
   FROM purchase_order_items poi
   JOIN purchase_orders po ON poi.purchase_order_id = po.id
   WHERE poi.item_id = i.id
     AND po.status = 'received'
     AND poi.cost_per_unit > 0) AS avg_purchase_cost
FROM inventory_items i
LEFT JOIN inventory_categories c ON i.category_id = c.id
LEFT JOIN site_inventory si ON i.id = si.item_id
GROUP BY i.id, i.name, c.name, i.unit_cost, i.average_cost, i.last_purchase_cost
ORDER BY total_value DESC;

-- ============================================
-- 7. Summary Statistics Function
-- ============================================
CREATE OR REPLACE FUNCTION get_inventory_summary_stats()
RETURNS TABLE (
  total_items BIGINT,
  total_quantity BIGINT,
  total_value DECIMAL,
  total_sites BIGINT,
  low_stock_count BIGINT,
  out_of_stock_count BIGINT,
  expiring_soon_count BIGINT,
  expired_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(DISTINCT i.id) FROM inventory_items i)::BIGINT AS total_items,
    (SELECT COALESCE(SUM(si.quantity), 0) FROM site_inventory si)::BIGINT AS total_quantity,
    (SELECT COALESCE(SUM(si.quantity * COALESCE(si.unit_cost, i.average_cost, i.unit_cost, 0)), 0)
     FROM site_inventory si
     JOIN inventory_items i ON si.item_id = i.id) AS total_value,
    (SELECT COUNT(DISTINCT si.site_id) FROM site_inventory si)::BIGINT AS total_sites,
    (SELECT COUNT(*) 
     FROM site_inventory_status 
     WHERE stock_status = 'low')::BIGINT AS low_stock_count,
    (SELECT COUNT(*) 
     FROM site_inventory_status 
     WHERE stock_status = 'out')::BIGINT AS out_of_stock_count,
    (SELECT COUNT(*) 
     FROM expiring_items_detailed_report 
     WHERE expiration_status IN ('expiring_soon_critical', 'expiring_soon'))::BIGINT AS expiring_soon_count,
    (SELECT COUNT(*) 
     FROM expiring_items_detailed_report 
     WHERE expiration_status = 'expired')::BIGINT AS expired_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 8. Permissions
-- ============================================
GRANT SELECT ON inventory_valuation_report TO authenticated;
GRANT SELECT ON inventory_valuation_report TO anon;

GRANT SELECT ON stock_movement_trends TO authenticated;
GRANT SELECT ON stock_movement_trends TO anon;

GRANT SELECT ON inventory_abc_analysis TO authenticated;
GRANT SELECT ON inventory_abc_analysis TO anon;

GRANT SELECT ON expiring_items_detailed_report TO authenticated;
GRANT SELECT ON expiring_items_detailed_report TO anon;

GRANT SELECT ON usage_forecast TO authenticated;
GRANT SELECT ON usage_forecast TO anon;

GRANT SELECT ON cost_analysis_report TO authenticated;
GRANT SELECT ON cost_analysis_report TO anon;

GRANT EXECUTE ON FUNCTION get_inventory_summary_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_inventory_summary_stats() TO anon;

-- ============================================
-- Success Message
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '===========================================';
  RAISE NOTICE '✅ Advanced Inventory Reports Created';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Views:';
  RAISE NOTICE '  • inventory_valuation_report';
  RAISE NOTICE '  • stock_movement_trends';
  RAISE NOTICE '  • inventory_abc_analysis';
  RAISE NOTICE '  • expiring_items_detailed_report';
  RAISE NOTICE '  • usage_forecast';
  RAISE NOTICE '  • cost_analysis_report';
  RAISE NOTICE '';
  RAISE NOTICE 'Functions:';
  RAISE NOTICE '  • get_inventory_summary_stats()';
  RAISE NOTICE '';
  RAISE NOTICE 'Ready to use!';
  RAISE NOTICE '===========================================';
END $$;

