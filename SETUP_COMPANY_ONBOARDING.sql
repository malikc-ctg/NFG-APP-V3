-- ==========================================
-- NFG Company Onboarding Setup
-- ==========================================

-- 1. Create company_profiles table
CREATE TABLE IF NOT EXISTS company_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  industry_type TEXT NOT NULL,
  company_size TEXT,
  phone_number TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Add company_id to user_profiles
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE user_profiles 
    ADD COLUMN company_id UUID REFERENCES company_profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 3. Add onboarding_completed to user_profiles
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'onboarding_completed'
  ) THEN
    ALTER TABLE user_profiles 
    ADD COLUMN onboarding_completed BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- 4. Update sites table with new columns
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sites' AND column_name = 'square_footage'
  ) THEN
    ALTER TABLE sites 
    ADD COLUMN square_footage INTEGER;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sites' AND column_name = 'site_type'
  ) THEN
    ALTER TABLE sites 
    ADD COLUMN site_type TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sites' AND column_name = 'contact_person'
  ) THEN
    ALTER TABLE sites 
    ADD COLUMN contact_person TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sites' AND column_name = 'contact_phone'
  ) THEN
    ALTER TABLE sites 
    ADD COLUMN contact_phone TEXT;
  END IF;
END $$;

-- 5. Add company_id to sites table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sites' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE sites 
    ADD COLUMN company_id UUID REFERENCES company_profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 6. Enable RLS on company_profiles
ALTER TABLE company_profiles ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies for company_profiles
DROP POLICY IF EXISTS "Users can view their company" ON company_profiles;
CREATE POLICY "Users can view their company" ON company_profiles
FOR SELECT USING (
  owner_id = auth.uid()
  OR
  EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND company_id = company_profiles.id)
);

DROP POLICY IF EXISTS "Users can insert their company" ON company_profiles;
CREATE POLICY "Users can insert their company" ON company_profiles
FOR INSERT WITH CHECK (
  owner_id = auth.uid()
);

DROP POLICY IF EXISTS "Company owners can update their company" ON company_profiles;
CREATE POLICY "Company owners can update their company" ON company_profiles
FOR UPDATE USING (
  owner_id = auth.uid()
);

DROP POLICY IF EXISTS "Company owners can delete their company" ON company_profiles;
CREATE POLICY "Company owners can delete their company" ON company_profiles
FOR DELETE USING (
  owner_id = auth.uid()
);

-- 8. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_company_profiles_owner_id ON company_profiles(owner_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_company_id ON user_profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_sites_company_id ON sites(company_id);

-- ==========================================
-- Setup Complete!
-- ==========================================
-- Run this script in your Supabase SQL Editor
-- Then users will be prompted to complete onboarding after signup

