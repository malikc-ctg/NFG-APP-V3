-- ============================================
-- Purchase Order Approval Workflow
-- ============================================
-- Phase 4: Add approval system for purchase orders
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. Add Approval Fields to purchase_orders
-- ============================================
ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- ============================================
-- 2. Update Status Constraint to Include Approval
-- ============================================
-- First, drop the existing constraint if it exists
DO $$
BEGIN
  -- Check if constraint exists and drop it
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'purchase_orders_status_check'
  ) THEN
    ALTER TABLE purchase_orders DROP CONSTRAINT purchase_orders_status_check;
  END IF;
END $$;

-- Add new constraint with approval status
ALTER TABLE purchase_orders
  ADD CONSTRAINT purchase_orders_status_check 
  CHECK (status IN ('draft', 'pending_approval', 'pending', 'ordered', 'received', 'cancelled', 'rejected'));

-- ============================================
-- 3. Create Indexes for Approval Queries
-- ============================================
CREATE INDEX IF NOT EXISTS idx_purchase_orders_approved_by ON purchase_orders(approved_by);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status_approval ON purchase_orders(status) WHERE status = 'pending_approval';

-- ============================================
-- 4. Create View for POs Needing Approval
-- ============================================
CREATE OR REPLACE VIEW purchase_orders_pending_approval AS
SELECT 
  po.*,
  s.name AS supplier_name,
  st.name AS site_name,
  creator.full_name AS created_by_name,
  creator.email AS created_by_email,
  approver.full_name AS approver_name,
  approver.email AS approver_email
FROM purchase_orders po
LEFT JOIN suppliers s ON po.supplier_id = s.id
LEFT JOIN sites st ON po.site_id = st.id
LEFT JOIN user_profiles creator ON po.ordered_by = creator.id
LEFT JOIN user_profiles approver ON po.approved_by = approver.id
WHERE po.status = 'pending_approval'
ORDER BY po.created_at DESC;

-- ============================================
-- 5. Grant Permissions
-- ============================================
GRANT SELECT ON purchase_orders_pending_approval TO authenticated;
GRANT SELECT ON purchase_orders_pending_approval TO anon;

-- ============================================
-- 6. Function: Check if User Can Approve POs
-- ============================================
CREATE OR REPLACE FUNCTION can_approve_purchase_orders(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = user_id
    AND role IN ('admin', 'manager', 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION can_approve_purchase_orders(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_approve_purchase_orders(UUID) TO anon;

-- ============================================
-- Success Message
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '===========================================';
  RAISE NOTICE '✅ PO Approval Workflow Created';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Added Fields:';
  RAISE NOTICE '  • approved_by (UUID)';
  RAISE NOTICE '  • approved_at (TIMESTAMPTZ)';
  RAISE NOTICE '  • rejected_by (UUID)';
  RAISE NOTICE '  • rejected_at (TIMESTAMPTZ)';
  RAISE NOTICE '  • rejection_reason (TEXT)';
  RAISE NOTICE '';
  RAISE NOTICE 'New Status:';
  RAISE NOTICE '  • pending_approval (requires approval)';
  RAISE NOTICE '  • rejected (PO was rejected)';
  RAISE NOTICE '';
  RAISE NOTICE 'Views:';
  RAISE NOTICE '  • purchase_orders_pending_approval';
  RAISE NOTICE '';
  RAISE NOTICE 'Functions:';
  RAISE NOTICE '  • can_approve_purchase_orders(user_id)';
  RAISE NOTICE '';
  RAISE NOTICE 'Ready to use!';
  RAISE NOTICE '===========================================';
END $$;

