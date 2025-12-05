-- ==========================================
-- MULTI-TENANCY & WHITE-LABEL SCHEMA
-- Phase 1: Database Foundation
-- Adding white-label fields and tenant isolation
-- ==========================================

-- ==========================================
-- 1. ADD WHITE-LABEL FIELDS TO COMPANY_PROFILES
-- ==========================================

DO $$ 
BEGIN
  -- Platform name (handl.it)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'company_profiles' AND column_name = 'platform_name'
  ) THEN
    ALTER TABLE company_profiles 
    ADD COLUMN platform_name TEXT DEFAULT 'handl.it';
  END IF;

  -- Company display name (what clients see)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'company_profiles' AND column_name = 'company_display_name'
  ) THEN
    ALTER TABLE company_profiles 
    ADD COLUMN company_display_name TEXT;
  END IF;

  -- Company logo URL
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'company_profiles' AND column_name = 'logo_url'
  ) THEN
    ALTER TABLE company_profiles 
    ADD COLUMN logo_url TEXT;
  END IF;

  -- Primary brand color
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'company_profiles' AND column_name = 'primary_color'
  ) THEN
    ALTER TABLE company_profiles 
    ADD COLUMN primary_color TEXT DEFAULT '#0D47A1';
  END IF;

  -- Secondary/accent color
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'company_profiles' AND column_name = 'secondary_color'
  ) THEN
    ALTER TABLE company_profiles 
    ADD COLUMN secondary_color TEXT DEFAULT '#0A3A84';
  END IF;

  -- Custom domain (optional)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'company_profiles' AND column_name = 'domain'
  ) THEN
    ALTER TABLE company_profiles 
    ADD COLUMN domain TEXT;
  END IF;

  -- Subdomain (for handl.it/{subdomain} routing)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'company_profiles' AND column_name = 'subdomain'
  ) THEN
    ALTER TABLE company_profiles 
    ADD COLUMN subdomain TEXT UNIQUE;
  END IF;

  -- White label enabled flag (PREMIUM FEATURE - default false)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'company_profiles' AND column_name = 'white_label_enabled'
  ) THEN
    ALTER TABLE company_profiles 
    ADD COLUMN white_label_enabled BOOLEAN DEFAULT false;
  END IF;
  
  -- Subscription tier (free, basic, premium, enterprise)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'company_profiles' AND column_name = 'subscription_tier'
  ) THEN
    ALTER TABLE company_profiles 
    ADD COLUMN subscription_tier TEXT DEFAULT 'basic' CHECK (subscription_tier IN ('free', 'basic', 'premium', 'enterprise'));
  END IF;

  -- Ensure updated_at exists and has trigger
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'company_profiles' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE company_profiles 
    ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Update company_display_name to match company_name if null
UPDATE company_profiles 
SET company_display_name = COALESCE(company_display_name, company_name)
WHERE company_display_name IS NULL;

-- ==========================================
-- 2. CREATE INDEXES FOR MULTI-TENANT QUERIES
-- ==========================================

-- Company profiles indexes
CREATE INDEX IF NOT EXISTS idx_company_profiles_subdomain ON company_profiles(subdomain);
CREATE INDEX IF NOT EXISTS idx_company_profiles_domain ON company_profiles(domain);
CREATE INDEX IF NOT EXISTS idx_company_profiles_white_label ON company_profiles(white_label_enabled);

-- User profiles - ensure company_id index exists
CREATE INDEX IF NOT EXISTS idx_user_profiles_company_id ON user_profiles(company_id);

-- Sites - ensure company relationship indexed
CREATE INDEX IF NOT EXISTS idx_sites_created_by ON sites(created_by);
-- Add company_id index if column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sites' AND column_name = 'company_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_sites_company_id ON sites(company_id);
  END IF;
END $$;

-- Jobs - company via created_by
CREATE INDEX IF NOT EXISTS idx_jobs_created_by ON jobs(created_by);

-- Invoices - company via created_by
CREATE INDEX IF NOT EXISTS idx_invoices_created_by ON invoices(created_by);

-- Payments - company via invoice
-- (Already has invoice_id index, which links to company)

-- Bookings - company via client_id
CREATE INDEX IF NOT EXISTS idx_bookings_client_id ON bookings(client_id);

-- Platform subscriptions - already has company_id
CREATE INDEX IF NOT EXISTS idx_platform_subscriptions_company_id ON platform_subscriptions(company_id);

-- ==========================================
-- 3. UPDATE RLS POLICIES FOR TENANT ISOLATION
-- ==========================================

-- Ensure RLS is enabled on company_profiles
ALTER TABLE company_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate with tenant isolation
DROP POLICY IF EXISTS "Enable select for users" ON company_profiles;
DROP POLICY IF EXISTS "Users can view their company" ON company_profiles;
DROP POLICY IF EXISTS "Users can insert their company" ON company_profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON company_profiles;
DROP POLICY IF EXISTS "Company owners can update their company" ON company_profiles;
DROP POLICY IF EXISTS "Enable update for owners" ON company_profiles;
DROP POLICY IF EXISTS "Company owners can delete their company" ON company_profiles;
DROP POLICY IF EXISTS "Enable delete for owners" ON company_profiles;

-- SELECT: Users can only see their own company
CREATE POLICY "tenant_isolation_select" ON company_profiles
FOR SELECT USING (
  auth.uid() = owner_id
  OR
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_profiles.id = auth.uid() 
    AND user_profiles.company_id = company_profiles.id
  )
);

-- INSERT: Authenticated users can create companies
CREATE POLICY "tenant_isolation_insert" ON company_profiles
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
  AND owner_id = auth.uid()
);

-- UPDATE: Only company owners can update
CREATE POLICY "tenant_isolation_update" ON company_profiles
FOR UPDATE USING (
  auth.uid() = owner_id
);

-- DELETE: Only company owners can delete
CREATE POLICY "tenant_isolation_delete" ON company_profiles
FOR DELETE USING (
  auth.uid() = owner_id
);

-- ==========================================
-- 4. ADD TRIGGER FOR UPDATED_AT
-- ==========================================

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_company_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS company_profiles_updated_at ON company_profiles;
CREATE TRIGGER company_profiles_updated_at
  BEFORE UPDATE ON company_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_company_profiles_updated_at();

-- ==========================================
-- 5. VERIFY TENANT ISOLATION DATA INTEGRITY
-- ==========================================

-- Check for orphaned records (users without company)
-- This will show any data integrity issues
SELECT 
  'Users without company_id' as check_type,
  COUNT(*) as count
FROM user_profiles 
WHERE company_id IS NULL
UNION ALL
SELECT 
  'Companies without display name',
  COUNT(*) 
FROM company_profiles 
WHERE company_display_name IS NULL OR company_display_name = '';

-- ==========================================
-- SUCCESS MESSAGE
-- ==========================================

SELECT '✅ Multi-tenancy schema updated successfully!' as result;
SELECT '✅ White-label fields added to company_profiles' as white_label;
SELECT '✅ Tenant isolation indexes created' as indexes;
SELECT '✅ RLS policies updated for tenant isolation' as security;
SELECT '⚠️  Review orphaned records query above' as next_step;

