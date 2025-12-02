-- NUCLEAR FIX: This WILL work - copy and paste ALL of this

-- Step 1: Drop ALL policies
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'company_profiles') 
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON company_profiles CASCADE';
    END LOOP;
END $$;

-- Step 2: Disable RLS completely
ALTER TABLE company_profiles DISABLE ROW LEVEL SECURITY;

-- Step 3: Verify it's disabled (should show rowsecurity = false)
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'company_profiles';
