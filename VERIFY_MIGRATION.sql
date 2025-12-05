-- ==========================================
-- VERIFY MULTI-TENANCY MIGRATION
-- Run this to check if Phase 1 & 3 are complete
-- ==========================================

-- ==========================================
-- 1. CHECK PHASE 1: SCHEMA CHANGES
-- ==========================================

SELECT 
  'Phase 1: Schema Check' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'company_profiles' AND column_name = 'platform_name'
    ) THEN '✅ platform_name column exists'
    ELSE '❌ platform_name column missing - Run ADD_MULTI_TENANCY_SCHEMA.sql'
  END as status
UNION ALL
SELECT 
  'Phase 1: Schema Check',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'company_profiles' AND column_name = 'white_label_enabled'
    ) THEN '✅ white_label_enabled column exists'
    ELSE '❌ white_label_enabled column missing - Run ADD_MULTI_TENANCY_SCHEMA.sql'
  END
UNION ALL
SELECT 
  'Phase 1: Schema Check',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'company_profiles' AND column_name = 'subscription_tier'
    ) THEN '✅ subscription_tier column exists'
    ELSE '❌ subscription_tier column missing - Run ADD_MULTI_TENANCY_SCHEMA.sql'
  END;

-- ==========================================
-- 2. CHECK PHASE 3: NFG MIGRATION
-- ==========================================

SELECT 
  'Phase 3: NFG Migration' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM company_profiles 
      WHERE (LOWER(company_name) LIKE '%northern%facilities%group%' OR LOWER(company_name) LIKE '%nfg%')
        AND platform_name = 'handl.it'
        AND white_label_enabled = true
    ) THEN '✅ NFG company configured with white-label'
    ELSE '❌ NFG not configured - Run MIGRATE_NFG_TO_TENANT.sql'
  END as status
UNION ALL
SELECT 
  'Phase 3: NFG Migration',
  CASE 
    WHEN (
      SELECT COUNT(*) FROM user_profiles WHERE company_id IS NULL
    ) = 0 THEN '✅ All users have company_id'
    ELSE '⚠️  ' || (
      SELECT COUNT(*)::text FROM user_profiles WHERE company_id IS NULL
    ) || ' users without company_id - Run MIGRATE_NFG_TO_TENANT.sql'
  END;

-- ==========================================
-- 3. DETAILED COMPANY STATUS
-- ==========================================

SELECT 
  'Company Details' as check_type,
  company_name || ' | ' || 
  COALESCE(company_display_name, 'NULL') || ' | ' ||
  COALESCE(platform_name, 'NULL') || ' | ' ||
  CASE WHEN white_label_enabled THEN 'White-Label ✅' ELSE 'Platform Branding' END || ' | ' ||
  COALESCE(subscription_tier, 'NULL') as status
FROM company_profiles
ORDER BY created_at ASC;

-- ==========================================
-- 4. USER LINKING STATUS
-- ==========================================

SELECT 
  'User Linking' as check_type,
  'Total Users: ' || COUNT(*)::text || ' | ' ||
  'With Company: ' || COUNT(company_id)::text || ' | ' ||
  'Orphaned: ' || (COUNT(*) - COUNT(company_id))::text as status
FROM user_profiles;

-- ==========================================
-- 5. SUMMARY
-- ==========================================

SELECT 
  'Summary' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'company_profiles' AND column_name = 'white_label_enabled'
    ) AND EXISTS (
      SELECT 1 FROM company_profiles 
      WHERE white_label_enabled = true
    ) THEN '✅ Migration appears complete!'
    ELSE '⚠️  Some steps may be missing - review above'
  END as status;

