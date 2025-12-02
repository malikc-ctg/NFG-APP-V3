-- SIMPLE: Just disable RLS - copy and paste this entire thing

-- Drop all policies
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'company_profiles') 
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON company_profiles';
    END LOOP;
END $$;

-- Disable RLS
ALTER TABLE company_profiles DISABLE ROW LEVEL SECURITY;

-- Done! Refresh your browser now.
