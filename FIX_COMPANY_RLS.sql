-- ==========================================
-- Fix Company Profiles RLS Policies
-- ==========================================
-- This fixes the "permission denied" error during onboarding

-- 1. Drop and recreate INSERT policy with better permissions
DROP POLICY IF EXISTS "Users can insert their company" ON company_profiles;
CREATE POLICY "Users can insert their company" ON company_profiles
FOR INSERT WITH CHECK (
  -- Allow if the user is authenticated and setting themselves as owner
  auth.uid() IS NOT NULL
  AND
  owner_id = auth.uid()
);

-- 2. Also allow authenticated users to insert (fallback)
DROP POLICY IF EXISTS "Authenticated users can create company" ON company_profiles;
CREATE POLICY "Authenticated users can create company" ON company_profiles
FOR INSERT WITH CHECK (
  auth.role() = 'authenticated'
);

-- 3. Make sure SELECT policy is correct
DROP POLICY IF EXISTS "Users can view their company" ON company_profiles;
CREATE POLICY "Users can view their company" ON company_profiles
FOR SELECT USING (
  owner_id = auth.uid()
  OR
  EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.company_id = company_profiles.id)
);

-- ==========================================
-- Setup Complete!
-- ==========================================
-- Run this to fix the "permission denied" error

