-- ============================================
-- Inventory Low Stock Notifications
-- ============================================
-- Automatically creates notifications when inventory
-- items go below their low stock threshold
-- ============================================

-- Function to create low stock notification
CREATE OR REPLACE FUNCTION notify_low_stock()
RETURNS TRIGGER AS $$
DECLARE
  item_record RECORD;
  site_record RECORD;
  admin_users UUID[];
  notification_created BOOLEAN;
BEGIN
  -- Get item details
  SELECT 
    i.id,
    i.name,
    i.low_stock_threshold,
    i.unit,
    c.name as category_name
  INTO item_record
  FROM inventory_items i
  LEFT JOIN inventory_categories c ON i.category_id = c.id
  WHERE i.id = NEW.item_id;
  
  -- Get site details
  SELECT id, name
  INTO site_record
  FROM sites
  WHERE id = NEW.site_id;
  
  -- Check if stock is now below threshold (only trigger when crossing threshold)
  IF item_record.low_stock_threshold IS NOT NULL AND
     NEW.quantity <= item_record.low_stock_threshold AND 
     (OLD IS NULL OR OLD.quantity IS NULL OR OLD.quantity > item_record.low_stock_threshold) THEN
    
    -- Get all admin users (admin, client, super_admin)
    SELECT ARRAY_AGG(id)
    INTO admin_users
    FROM user_profiles
    WHERE role IN ('admin', 'client', 'super_admin')
      AND status = 'active';
    
    -- Create notification for each admin
    IF admin_users IS NOT NULL AND array_length(admin_users, 1) > 0 THEN
      FOR notification_created IN 1..array_length(admin_users, 1)
      LOOP
        INSERT INTO notifications (
          user_id,
          type,
          title,
          message,
          link,
          metadata,
          created_at
        ) VALUES (
          admin_users[notification_created],
          'inventory_low_stock',
          'Low Stock Alert',
          item_record.name || ' is running low at ' || site_record.name || 
          ' (' || NEW.quantity || ' ' || COALESCE(item_record.unit, 'units') || ' remaining)',
          'inventory.html',
          jsonb_build_object(
            'item_id', NEW.item_id,
            'site_id', NEW.site_id,
            'item_name', item_record.name,
            'site_name', site_record.name,
            'quantity', NEW.quantity,
            'threshold', item_record.low_stock_threshold,
            'unit', COALESCE(item_record.unit, 'units')
          ),
          NOW()
        );
      END LOOP;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on site_inventory table
DROP TRIGGER IF EXISTS trigger_low_stock_notification ON site_inventory;
CREATE TRIGGER trigger_low_stock_notification
  AFTER INSERT OR UPDATE OF quantity ON site_inventory
  FOR EACH ROW
  EXECUTE FUNCTION notify_low_stock();

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ LOW STOCK NOTIFICATIONS ENABLED!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '📦 Trigger Created:';
  RAISE NOTICE '   • trigger_low_stock_notification';
  RAISE NOTICE '';
  RAISE NOTICE '🔔 Function Created:';
  RAISE NOTICE '   • notify_low_stock()';
  RAISE NOTICE '';
  RAISE NOTICE '⚡ How It Works:';
  RAISE NOTICE '   • Automatically creates notifications when stock';
  RAISE NOTICE '     falls below the low_stock_threshold';
  RAISE NOTICE '   • Notifies all active admin, client, and super_admin users';
  RAISE NOTICE '   • Only triggers when crossing the threshold (not on every update)';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Ready to use!';
  RAISE NOTICE '   Notifications will be created automatically when';
  RAISE NOTICE '   inventory items go below their threshold.';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;

