-- NUCLEAR OPTION: Disable RLS completely to get it working
-- Run this in Supabase SQL Editor

-- Check current state
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'company_profiles';

-- Drop ALL policies first
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'company_profiles') 
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON company_profiles CASCADE';
    END LOOP;
END $$;

-- Disable RLS completely
ALTER TABLE company_profiles DISABLE ROW LEVEL SECURITY;

-- Verify it's disabled
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'company_profiles';
