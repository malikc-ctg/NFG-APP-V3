-- ==========================================
-- MIGRATE NFG TO FIRST TENANT
-- Phase 3: Data Migration
-- Sets up NFG as the first tenant with proper branding
-- ==========================================

-- ==========================================
-- IMPORTANT: BACKUP YOUR DATA FIRST!
-- ==========================================
-- Run this in Supabase SQL Editor after Phase 1 schema changes
-- ==========================================

-- ==========================================
-- 1. FIND OR CREATE NFG COMPANY
-- ==========================================

-- First, let's see what companies exist
SELECT id, company_name, owner_id, created_at 
FROM company_profiles 
ORDER BY created_at ASC;

-- ==========================================
-- 2. CHECK IF PHASE 1 SCHEMA IS COMPLETE
-- ==========================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'company_profiles' AND column_name = 'subscription_tier'
  ) THEN
    RAISE EXCEPTION '❌ Phase 1 schema not run! Please run ADD_MULTI_TENANCY_SCHEMA.sql first.';
  END IF;
END $$;

-- ==========================================
-- 3. UPDATE NFG COMPANY WITH WHITE-LABEL DATA
-- ==========================================

-- Update existing NFG company with branding
-- This will only work if Phase 1 schema has been run

DO $$
DECLARE
  nfg_company_id UUID;
  has_platform_name BOOLEAN;
  has_white_label BOOLEAN;
  has_subscription_tier BOOLEAN;
  has_subdomain BOOLEAN;
BEGIN
  -- Check which columns exist
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'company_profiles' AND column_name = 'platform_name'
  ) INTO has_platform_name;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'company_profiles' AND column_name = 'white_label_enabled'
  ) INTO has_white_label;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'company_profiles' AND column_name = 'subscription_tier'
  ) INTO has_subscription_tier;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'company_profiles' AND column_name = 'subdomain'
  ) INTO has_subdomain;

  -- Get NFG company ID
  SELECT id INTO nfg_company_id
  FROM company_profiles
  WHERE LOWER(company_name) LIKE '%northern%facilities%group%'
     OR LOWER(company_name) LIKE '%nfg%'
     OR company_display_name = 'Northern Facilities Group'
  LIMIT 1;

  IF nfg_company_id IS NULL THEN
    RAISE WARNING 'NFG company not found. Creating it...';
    -- Create NFG company if it doesn't exist
    INSERT INTO company_profiles (company_name, company_display_name)
    VALUES ('Northern Facilities Group', 'Northern Facilities Group')
    RETURNING id INTO nfg_company_id;
  END IF;

  -- Build dynamic UPDATE query based on available columns
  IF has_platform_name THEN
    EXECUTE format('UPDATE company_profiles SET platform_name = %L WHERE id = %L', 'handl.it', nfg_company_id);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_profiles' AND column_name = 'company_display_name') THEN
    EXECUTE format('UPDATE company_profiles SET company_display_name = COALESCE(company_display_name, %L) WHERE id = %L', 'Northern Facilities Group', nfg_company_id);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_profiles' AND column_name = 'primary_color') THEN
    EXECUTE format('UPDATE company_profiles SET primary_color = COALESCE(primary_color, %L) WHERE id = %L', '#0D47A1', nfg_company_id);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_profiles' AND column_name = 'secondary_color') THEN
    EXECUTE format('UPDATE company_profiles SET secondary_color = COALESCE(secondary_color, %L) WHERE id = %L', '#0A3A84', nfg_company_id);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_profiles' AND column_name = 'logo_url') THEN
    EXECUTE format('UPDATE company_profiles SET logo_url = COALESCE(logo_url, %L) WHERE id = %L', 
      'https://zqcbldgheimqrnqmbbed.supabase.co/storage/v1/object/sign/app-images/NFG%20one.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8xN2RmNDhlMi0xNGJlLTQ5NzMtODZlNy0zZTc0MjgzMWIzOTQiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJhcHAtaW1hZ2VzL05GRyBvbmUucG5nIiwiaWF0IjoxNzYyOTc5NzU5LCJleHAiOjQ4ODUwNDM3NTl9.fnJIDQep2yYlgGKlBRNnkrUoUzXzG7eac39GG6NQPuU',
      nfg_company_id);
  END IF;

  IF has_white_label THEN
    EXECUTE format('UPDATE company_profiles SET white_label_enabled = true WHERE id = %L', nfg_company_id);
  END IF;

  IF has_subscription_tier THEN
    EXECUTE format('UPDATE company_profiles SET subscription_tier = COALESCE(subscription_tier, %L) WHERE id = %L', 'premium', nfg_company_id);
  END IF;

  IF has_subdomain THEN
    EXECUTE format('UPDATE company_profiles SET subdomain = COALESCE(subdomain, %L) WHERE id = %L', 'nfg', nfg_company_id);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_profiles' AND column_name = 'updated_at') THEN
    EXECUTE format('UPDATE company_profiles SET updated_at = NOW() WHERE id = %L', nfg_company_id);
  END IF;

  RAISE NOTICE '✅ NFG company updated successfully: %', nfg_company_id;
END $$;

-- ==========================================
-- 4. ENSURE ALL USERS HAVE COMPANY_ID
-- ==========================================

-- Find users without company_id
SELECT 
  u.id, 
  u.email, 
  u.full_name,
  u.company_id
FROM user_profiles u
WHERE u.company_id IS NULL;

-- Link orphaned users to NFG company
-- Replace 'NFG_COMPANY_ID' with actual NFG company ID
DO $$
DECLARE
  nfg_company_id UUID;
BEGIN
  -- Get NFG company ID
  SELECT id INTO nfg_company_id
  FROM company_profiles
  WHERE LOWER(company_name) LIKE '%northern%facilities%group%'
     OR LOWER(company_name) LIKE '%nfg%'
  LIMIT 1;
  
  IF nfg_company_id IS NOT NULL THEN
    -- Link orphaned users to NFG
    UPDATE user_profiles
    SET company_id = nfg_company_id
    WHERE company_id IS NULL
    AND EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = user_profiles.id
    );
    
    RAISE NOTICE 'Linked orphaned users to NFG company: %', nfg_company_id;
  ELSE
    RAISE WARNING 'NFG company not found! Please create it first.';
  END IF;
END $$;

-- ==========================================
-- 5. VERIFY TENANT DATA INTEGRITY
-- ==========================================

-- Check company data
SELECT 
  id,
  company_name,
  company_display_name,
  platform_name,
  primary_color,
  white_label_enabled,
  subdomain,
  (SELECT COUNT(*) FROM user_profiles WHERE company_id = company_profiles.id) as user_count
FROM company_profiles
ORDER BY created_at ASC;

-- Check for data integrity issues
SELECT 
  'Users without company' as issue,
  COUNT(*) as count
FROM user_profiles 
WHERE company_id IS NULL
UNION ALL
SELECT 
  'Sites without company link',
  COUNT(*) 
FROM sites s
LEFT JOIN user_profiles u ON s.created_by = u.id
WHERE u.company_id IS NULL
UNION ALL
SELECT 
  'Invoices without company link',
  COUNT(*) 
FROM invoices i
LEFT JOIN user_profiles u ON i.created_by = u.id
WHERE u.company_id IS NULL AND i.created_by IS NOT NULL;

-- ==========================================
-- 6. SET DEFAULT VALUES FOR ALL COMPANIES
-- ==========================================

-- Ensure all companies have proper defaults
UPDATE company_profiles 
SET 
  platform_name = COALESCE(platform_name, 'handl.it'),
  company_display_name = COALESCE(company_display_name, company_name),
  primary_color = COALESCE(primary_color, '#0D47A1'),
  secondary_color = COALESCE(secondary_color, '#0A3A84'),
  white_label_enabled = COALESCE(white_label_enabled, false), -- Default: no white-label (premium feature)
  subscription_tier = COALESCE(subscription_tier, 'basic'), -- Default: basic tier
  updated_at = NOW()
WHERE 
  platform_name IS NULL
  OR company_display_name IS NULL
  OR primary_color IS NULL
  OR white_label_enabled IS NULL;

-- ==========================================
-- SUCCESS MESSAGE
-- ==========================================

SELECT '✅ NFG migration completed!' as result;
SELECT '✅ White-label branding configured' as branding;
SELECT '✅ Users linked to companies' as users;
SELECT '⚠️  Review data integrity queries above' as verification;
SELECT '📋 Next: Run ADD_MULTI_TENANCY_SCHEMA.sql if not done' as next_step;

