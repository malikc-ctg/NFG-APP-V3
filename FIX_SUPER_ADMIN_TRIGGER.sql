-- ============================================
-- Fix super_admin role change trigger
-- This allows updating other fields (status, name, etc.) of super_admin users
-- but prevents changing the role itself via UI
-- ============================================

-- Update the trigger function to only check when role actually changes
CREATE OR REPLACE FUNCTION prevent_super_admin_role_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only check if the role is actually being changed (not just updated)
  IF (NEW.role IS DISTINCT FROM OLD.role) THEN
    -- Prevent changing TO super_admin via UI
    IF NEW.role = 'super_admin' AND OLD.role != 'super_admin' THEN
      RAISE EXCEPTION 'Cannot assign super_admin role via UI. Use SQL to reassign.';
    END IF;
    
    -- Prevent changing FROM super_admin via UI (unless it's service_role)
    IF OLD.role = 'super_admin' AND NEW.role != 'super_admin' THEN
      -- Allow service_role to change it (for SQL commands)
      -- Check if this is being called from a service_role context
      IF current_setting('request.jwt.claim.role', true) != 'service_role' THEN
        RAISE EXCEPTION 'Cannot change super_admin role via UI. Use SQL to reassign.';
      END IF;
    END IF;
  END IF;
  
  -- Allow all other updates (status, name, email, etc.) even for super_admin
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate the trigger with WHEN clause
DROP TRIGGER IF EXISTS trigger_prevent_super_admin_role_change ON user_profiles;

CREATE TRIGGER trigger_prevent_super_admin_role_change
  BEFORE UPDATE OF role ON user_profiles  -- Only fires when role column is updated
  FOR EACH ROW
  WHEN (NEW.role IS DISTINCT FROM OLD.role)  -- Only fire if role actually changed
  EXECUTE FUNCTION prevent_super_admin_role_change();

-- Verify the trigger was created
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE trigger_name = 'trigger_prevent_super_admin_role_change';

SELECT '✅ Super admin trigger fixed! You can now update status and other fields of super_admin users.' AS status;

