-- FINAL FIX: Make company_profiles readable
-- Run this in Supabase SQL Editor

-- Step 1: Check current RLS status
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'company_profiles';

-- Step 2: Drop ALL existing policies
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'company_profiles') 
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON company_profiles';
    END LOOP;
END $$;

-- Step 3: Create a simple, permissive SELECT policy
CREATE POLICY "view_company_profiles" ON company_profiles
FOR SELECT
TO authenticated
USING (
  -- Allow if user owns the company
  owner_id = auth.uid()
  OR
  -- Allow if user is a member (has company_id in user_profiles)
  EXISTS (
    SELECT 1 
    FROM user_profiles 
    WHERE user_profiles.id = auth.uid() 
    AND user_profiles.company_id = company_profiles.id
    AND user_profiles.company_id IS NOT NULL
  )
);

-- Step 4: Create INSERT policy
CREATE POLICY "insert_company_profiles" ON company_profiles
FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid());

-- Step 5: Create UPDATE policy
CREATE POLICY "update_company_profiles" ON company_profiles
FOR UPDATE
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- Step 6: Verify policies were created
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'company_profiles';

-- Step 7: Test query (run this while logged in as the user)
-- SELECT * FROM company_profiles WHERE id = '28da591c-ae99-4f51-96b0-0f42105571fe';
