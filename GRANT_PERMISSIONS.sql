-- Grant direct permissions - RLS might be disabled but user still needs permissions
-- Run this in Supabase SQL Editor

-- Grant SELECT to authenticated role
GRANT SELECT ON company_profiles TO authenticated;
GRANT SELECT ON company_profiles TO anon;

-- Also grant to public role just in case
GRANT SELECT ON company_profiles TO public;

-- Grant UPDATE too
GRANT UPDATE ON company_profiles TO authenticated;

-- Verify permissions
SELECT 
    grantee, 
    privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name = 'company_profiles';