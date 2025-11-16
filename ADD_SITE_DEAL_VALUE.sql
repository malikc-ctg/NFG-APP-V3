-- ============================================
-- Add Deal Value Column to Sites Table
-- ============================================
-- Replaces the unused rating field with a deal_value
-- field for tracking contract value per site
-- ============================================

-- Add deal_value column (allows NULL since existing sites won't have this)
ALTER TABLE sites ADD COLUMN IF NOT EXISTS deal_value NUMERIC(12,2);

-- Optional: Add a comment to document the column
COMMENT ON COLUMN sites.deal_value IS 'Estimated contract value or deal amount for this site (in USD or base currency)';

-- Create index for filtering/sorting by deal value in reports
CREATE INDEX IF NOT EXISTS idx_sites_deal_value ON sites(deal_value) WHERE deal_value IS NOT NULL;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ DEAL VALUE COLUMN ADDED!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Column Created:';
  RAISE NOTICE '   • sites.deal_value (NUMERIC(12,2))';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Ready to use!';
  RAISE NOTICE '   Deal values can now be set per site';
  RAISE NOTICE '   and exported in reports/invoices.';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;

