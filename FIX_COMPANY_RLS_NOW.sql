-- Quick fix: Make company_profiles readable for authenticated users
-- Run this in Supabase SQL Editor

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view their company" ON company_profiles;
DROP POLICY IF EXISTS "Enable select for users" ON company_profiles;
DROP POLICY IF EXISTS "Users can insert their company" ON company_profiles;
DROP POLICY IF EXISTS "Company owners can update their company" ON company_profiles;

-- Create simple SELECT policy - let authenticated users read companies they own or are members of
CREATE POLICY "Allow authenticated users to view companies" ON company_profiles
FOR SELECT 
TO authenticated
USING (
  -- User owns the company
  owner_id = auth.uid()
  OR
  -- User is a member of the company
  EXISTS (
    SELECT 1 
    FROM user_profiles 
    WHERE user_profiles.id = auth.uid() 
    AND user_profiles.company_id = company_profiles.id
  )
);

-- Ensure INSERT policy exists
CREATE POLICY IF NOT EXISTS "Allow users to create companies" ON company_profiles
FOR INSERT 
TO authenticated
WITH CHECK (owner_id = auth.uid());

-- Ensure UPDATE policy exists  
CREATE POLICY IF NOT EXISTS "Allow owners to update companies" ON company_profiles
FOR UPDATE
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- Test query (should work after running this)
-- SELECT * FROM company_profiles WHERE id = '28da591c-ae99-4f51-96b0-0f42105571fe';
