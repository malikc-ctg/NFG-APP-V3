-- ============================================
-- Add receipt_emailed_at column to expenses table
-- ============================================

-- Add column to track when receipt was emailed
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS receipt_emailed_at TIMESTAMPTZ;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_expenses_receipt_emailed ON expenses(receipt_emailed_at);

-- Add comment
COMMENT ON COLUMN expenses.receipt_emailed_at IS 'Timestamp when receipt was emailed to the user';

-- Verify
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'expenses' 
  AND column_name = 'receipt_emailed_at';

SELECT '✅ receipt_emailed_at column added to expenses table!' as result;

