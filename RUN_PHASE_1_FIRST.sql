-- ==========================================
-- ⚠️  IMPORTANT: RUN THIS FIRST!
-- ==========================================
-- This script checks if Phase 1 schema exists
-- If not, it will tell you to run ADD_MULTI_TENANCY_SCHEMA.sql
-- ==========================================

DO $$
BEGIN
  -- Check for key columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'company_profiles' AND column_name = 'platform_name'
  ) THEN
    RAISE EXCEPTION '❌ Phase 1 schema not complete! Please run ADD_MULTI_TENANCY_SCHEMA.sql first.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'company_profiles' AND column_name = 'white_label_enabled'
  ) THEN
    RAISE EXCEPTION '❌ Phase 1 schema not complete! Please run ADD_MULTI_TENANCY_SCHEMA.sql first.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'company_profiles' AND column_name = 'subscription_tier'
  ) THEN
    RAISE EXCEPTION '❌ Phase 1 schema not complete! Please run ADD_MULTI_TENANCY_SCHEMA.sql first.';
  END IF;

  RAISE NOTICE '✅ Phase 1 schema is complete! You can now run MIGRATE_NFG_TO_TENANT.sql';
END $$;

SELECT '✅ Ready for Phase 3 migration!' as status;

