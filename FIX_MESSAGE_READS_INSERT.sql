-- =====================================================
-- Fix message_reads INSERT Policy
-- The upsert operation was failing with 403 error
-- =====================================================

-- Add UPDATE policy for message_reads (needed for upsert)
DROP POLICY IF EXISTS "Users can update their read receipts" ON message_reads;

CREATE POLICY "Users can update their read receipts"
  ON message_reads FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Grant UPDATE permission
GRANT UPDATE ON message_reads TO authenticated;

-- Verify grants
SELECT 
  table_name,
  privilege_type,
  grantee
FROM information_schema.table_privileges
WHERE table_schema = 'public'
  AND table_name = 'message_reads'
  AND grantee = 'authenticated'
ORDER BY privilege_type;

