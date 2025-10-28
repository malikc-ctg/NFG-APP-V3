-- ==========================================
-- COMPLETE FIX for Company Profiles RLS
-- ==========================================
-- This completely rebuilds RLS policies from scratch

-- 1. Disable RLS temporarily to clean everything
ALTER TABLE company_profiles DISABLE ROW LEVEL SECURITY;

-- 2. Drop ALL existing policies
DROP POLICY IF EXISTS "Users can view their company" ON company_profiles;
DROP POLICY IF EXISTS "Users can insert their company" ON company_profiles;
DROP POLICY IF EXISTS "Authenticated users can create company" ON company_profiles;
DROP POLICY IF EXISTS "Company owners can update their company" ON company_profiles;
DROP POLICY IF EXISTS "Company owners can delete their company" ON company_profiles;

-- 3. Re-enable RLS
ALTER TABLE company_profiles ENABLE ROW LEVEL SECURITY;

-- 4. Create simple, permissive policies

-- SELECT: Users can see companies they own or are members of
CREATE POLICY "Enable select for users" ON company_profiles
FOR SELECT USING (
  auth.uid() = owner_id
  OR
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_profiles.id = auth.uid() 
    AND user_profiles.company_id = company_profiles.id
  )
);

-- INSERT: Any authenticated user can create a company
CREATE POLICY "Enable insert for authenticated users" ON company_profiles
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
);

-- UPDATE: Only company owners can update
CREATE POLICY "Enable update for owners" ON company_profiles
FOR UPDATE USING (
  auth.uid() = owner_id
);

-- DELETE: Only company owners can delete
CREATE POLICY "Enable delete for owners" ON company_profiles
FOR DELETE USING (
  auth.uid() = owner_id
);

-- ==========================================
-- Now fix sites table RLS as well
-- ==========================================

-- 5. Update sites INSERT policy to be more permissive
DROP POLICY IF EXISTS "Users can insert their sites" ON sites;
CREATE POLICY "Enable insert for authenticated users" ON sites
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
);

-- ==========================================
-- Setup Complete!
-- ==========================================
-- This should fix all permission issues during onboarding

