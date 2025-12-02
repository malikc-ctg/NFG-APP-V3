-- Fix RLS policies for company_profiles so users can read their company
-- Run this in Supabase SQL Editor

-- Enable RLS
ALTER TABLE company_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Enable select for users" ON company_profiles;
DROP POLICY IF EXISTS "Users can view their company" ON company_profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON company_profiles;
DROP POLICY IF EXISTS "Users can insert their company" ON company_profiles;
DROP POLICY IF EXISTS "Enable update for owners" ON company_profiles;
DROP POLICY IF EXISTS "Company owners can update their company" ON company_profiles;

-- Create SELECT policy - users can see companies they own OR are members of
CREATE POLICY "Users can view their company" ON company_profiles
FOR SELECT USING (
  owner_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_profiles.id = auth.uid() 
    AND user_profiles.company_id = company_profiles.id
  )
);

-- Create INSERT policy - authenticated users can create companies
CREATE POLICY "Users can insert their company" ON company_profiles
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
  AND owner_id = auth.uid()
);

-- Create UPDATE policy - owners can update
CREATE POLICY "Company owners can update their company" ON company_profiles
FOR UPDATE USING (
  owner_id = auth.uid()
);

-- Verify policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'company_profiles';
