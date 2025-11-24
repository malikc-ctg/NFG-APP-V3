-- ============================================
-- Fix Inventory View Permissions
-- ============================================
-- Fixes 403 Forbidden error on site_inventory_status view
-- Run this in Supabase SQL Editor
-- ============================================

-- Grant permissions on views
GRANT SELECT ON site_inventory_status TO authenticated;
GRANT SELECT ON site_inventory_status TO anon;

GRANT SELECT ON inventory_with_categories TO authenticated;
GRANT SELECT ON inventory_with_categories TO anon;

GRANT SELECT ON recent_inventory_activity TO authenticated;
GRANT SELECT ON recent_inventory_activity TO anon;

-- If using inventory_with_costs view (from Phase 1)
GRANT SELECT ON inventory_with_costs TO authenticated;
GRANT SELECT ON inventory_with_costs TO anon;

-- ============================================
-- Success Message
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '===========================================';
  RAISE NOTICE '✅ Inventory View Permissions Fixed';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Granted SELECT permissions on views:';
  RAISE NOTICE '  • site_inventory_status';
  RAISE NOTICE '  • inventory_with_categories';
  RAISE NOTICE '  • recent_inventory_activity';
  RAISE NOTICE '  • inventory_with_costs (if exists)';
  RAISE NOTICE '';
  RAISE NOTICE 'Views should now be accessible!';
  RAISE NOTICE '===========================================';
END $$;

