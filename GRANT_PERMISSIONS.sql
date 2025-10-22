-- GRANT TABLE PERMISSIONS
-- This fixes the "42501 permission denied" error
-- Run this in Supabase SQL Editor

-- Grant all permissions on user_profiles to authenticated and anon users
GRANT ALL ON user_profiles TO authenticated;
GRANT ALL ON user_profiles TO anon;

-- Grant all permissions on user_invitations
GRANT ALL ON user_invitations TO authenticated;
GRANT ALL ON user_invitations TO anon;

-- Grant all permissions on worker_site_assignments
GRANT ALL ON worker_site_assignments TO authenticated;
GRANT ALL ON worker_site_assignments TO anon;

-- Grant all permissions on sites
GRANT ALL ON sites TO authenticated;
GRANT ALL ON sites TO anon;

-- Grant usage on sequences if they exist
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Verify permissions (this will show the granted privileges)
SELECT 
  table_name,
  grantee,
  privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public' 
  AND table_name IN ('user_profiles', 'user_invitations', 'worker_site_assignments', 'sites')
ORDER BY table_name, grantee;

